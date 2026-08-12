/* ============================================================
   赓续血脉・数绘红旅 — 纯数据层 (Data Layer)
   职责：JSON 加载 / 缓存 / 场馆合并查询 / 详情查询
   约束：只依赖 utils(getBasePath) 与 version；不操作 DOM
   ============================================================ */

import { getBasePath, stripProvinceSuffix, FALLBACK_IMAGE } from './utils.js?v=2026081319';
import { ASSET_VERSION } from './version.js?v=2026081319';

/* ---- 数据加载（内存级缓存，避免重复 fetch） ---- */
const __JSON_CACHE = new Map();  // key: filename → value: Promise<any>
async function loadJSON(filename) {
  if (__JSON_CACHE.has(filename)) return await __JSON_CACHE.get(filename);
  const p = (async () => {
    try {
      const res = await fetch(getBasePath() + filename + '?v=' + ASSET_VERSION);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      __JSON_CACHE.delete(filename);  // 失败不缓存，允许下次重试
      console.info('[RedData] 无法加载 ' + filename + ':', err.message);
      return [];
    }
  })();
  __JSON_CACHE.set(filename, p);
  return await p;
}

// 缓存：只加载一次
let _venuesPromise = null;          // 重新加载时可重置
let _venuesCache = null;            // 重新加载时可重置
let _aliasesPromise = null;
let _aliasesCache = null;
let _lastMerged = null;          // 最近一次合并结果（含子源降级的首屏数据），供消费方保持一致

async function loadAllVenues() {
  // 使用 !== null 判断，避免空数组 [] 被视为"已缓存"
  if (_venuesCache !== null) return _venuesCache;
  if (_venuesPromise) return _venuesPromise;

  _venuesPromise = (async () => {
    const [core, extended, aliasesData, extMeta] = await Promise.all([
      loadJSON('data/venues.json'),
      loadJSON('data/province-candidates.json'),
      loadAliases(),
      loadExtMeta()
    ]);
    // 场馆详情与场馆列表并发预加载，供 getVenueDetail 同步读取
    const detailsData = await loadVenueDetails();

    // 如果核心数据为空，说明网络失败，抛异常触发重试
    if (!core || core.length === 0) {
      _venuesPromise = null;  // 允许下次重试
      throw new Error('核心场馆数据加载失败，将重试');
    }

    // 子数据是否全部成功（loadJSON 失败返回 []，makeObjectLoader 失败返回 [] 且已重置自身 promise）
    const extMetaOk = extMeta && typeof extMeta === 'object' && !Array.isArray(extMeta) && Object.keys(extMeta).length > 0;
    // province-candidates.json 失败时 loadJSON 返回 []；它必有 22 条候选，空即失败，须纳入门禁
    //（否则该文件瞬时 404 会让 17 个扩展场馆静默消失，且因其余子源都成功而被固化为截断缓存）
    const extendedOk = Array.isArray(extended) && extended.length > 0;
    const aliasesOk = Boolean(aliasesData && aliasesData.aliases);
    const detailsOk = detailsData && typeof detailsData === 'object' && !Array.isArray(detailsData) && Object.keys(detailsData).length > 0;

    const coreNames = new Set(core.map(v => v.standardName || v.name));
    // 扩展数据中与核心场馆为同一地点的不同名称变体，加入去重集合
    const coreAliases = (aliasesData && aliasesData.aliases) ? aliasesData.aliases : [];
    coreAliases.forEach(a => coreNames.add(a));
    const merged = [...core];

    for (const ext of (extended || [])) {
      const name = ext.standardName || ext.name;
      if (coreNames.has(name)) continue;
      // 当原始名称包含占位文字时，使用标准化名称作为显示名
      const displayName = (ext.name && ext.name.includes('需进一步核验') && ext.standardName)
        ? ext.standardName : ext.name;
      const meta = (extMeta && extMeta[name]) ? extMeta[name] : {};
      // id 基于省份生成（候选按省唯一），而非依赖合并顺序——避免数据增删/重排时已持久化收藏与分享链接错位
      const shortProvince = stripProvinceSuffix(ext.province);
      // 官方核验状态枚举共 5 种，全部视为已核验；其余（未知/缺省）才提示进一步核验
      const VERIFIED = ['已核验', '已匹配', '已匹配官方入口', '已核验官方入口', '名称已调整'];
      merged.push({
        id: 'ext-' + shortProvince,
        name: displayName,
        province: ext.province,
        city: meta.city || '',
        district: meta.district || '',
        category: meta.category || '红色场馆',
        image: meta.image || FALLBACK_IMAGE,
        summary: meta.summary || (ext.province + '代表性红色场馆，' +
          (VERIFIED.includes(ext.officialVerificationStatus)
            ? '已核验官方信息' : '建议上线前进一步核验') + '。'),
        standardName: ext.standardName || ext.name,
        officialUrl: ext.officialUrl || '',
        officialLinkType: ext.officialLinkType || '',
        officialVerificationStatus: ext.officialVerificationStatus || '',
        officialVerificationDate: ext.officialVerificationDate || '',
        coordinates: meta.coordinates || null,
        author: (meta.source || {}).author || '',
        license: (meta.source || {}).license || '',
        sourcePage: (meta.source || {}).sourcePage || ''
      });
    }
    // 记录最近一次合并结果（含子源降级）：getVenuesCache 优先读它，避免"返回值有 32 馆、缓存却是 0"的消费方分叉
    _lastMerged = merged;
    // 只有核心 + 子数据全部成功才固化缓存；任一子加载失败（降级结果仍返回供首屏）不缓存，
    // 使 loadAliases/loadExtMeta/loadVenueDetails 的失败重试钩子真正可达（否则瞬时 404 会固化整个会话）
    if (merged.length > 0 && extendedOk && extMetaOk && aliasesOk && detailsOk) {
      _venuesCache = merged;
    } else {
      _venuesPromise = null;  // 允许下次重试
    }
    return merged;
  })();

  return _venuesPromise;
}

async function loadAliases() {
  if (_aliasesCache !== null) return _aliasesCache;
  if (_aliasesPromise) return _aliasesPromise;
  _aliasesPromise = loadJSON('data/venue-aliases.json');
  const data = await _aliasesPromise;
  // loadJSON 失败时返回 []，不能当作成功结果永久缓存——否则一次瞬时 404 整个会话丢失别名去重
  if (data && data.aliases) {
    _aliasesCache = data;
  } else {
    _aliasesPromise = null; // 允许下次重试
  }
  return data;
}

// 加载"以场馆名为键"的对象 JSON：带缓存 + 失败重试（消除 loadExtMeta/loadVenueDetails 的同构拷贝）
function makeObjectLoader(url, warnMsg) {
  let cache = null;
  let promise = null;
  async function load() {
    if (cache !== null) return cache;
    if (promise) return promise;
    promise = loadJSON(url);
    const data = await promise;
    // 注意：loadJSON 失败返回 []（typeof [] === 'object'），必须再校验非空，否则失败结果会被永久缓存
    if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) {
      cache = data;
    } else {
      promise = null; // 允许下次重试
      console.warn(warnMsg);
    }
    return data;
  }
  // 供同步读取缓存（如 getVenueDetail 在加载后直接查询）
  load.getCache = () => cache;
  return load;
}
const loadExtMeta = makeObjectLoader('data/extended-venues-meta.json', '[RedData] extended-venues-meta 加载失败，扩展场馆将降级为占位数据');
const loadVenueDetails = makeObjectLoader('data/venue-details.json', '[RedData] venue-details 加载失败，详情页将仅显示基础信息');

/* ---- 场馆特定详情查询 ---- */
function getVenueDetail(name) {
  // venue-details.json 的键已与合并场馆名精确一致（含雨花台括号名），无需别名桥
  const details = loadVenueDetails.getCache();
  if (!details) return null;
  // 仅精确键查找：剥"纪念馆"后缀的回退分支在当前数据下不可达，且未来某馆名缺键时会误配到同名前缀馆的详情
  return details[name] || null;
}

/* ---- 纯数据查询（无 DOM 依赖） ---- */
function filterVenues(venues, { query, province, category } = {}) {
  const q = query && query.trim() ? query.trim().toLowerCase() : null;
  return [...venues]
    .filter(v => !q ||
      (v.name || '').toLowerCase().includes(q) ||
      // standardName 是官方规范名（如"中共一大纪念馆"），用户按规范名搜索必须能命中
      (v.standardName || '').toLowerCase().includes(q) ||
      (v.province || '').toLowerCase().includes(q) ||
      (v.city || '').toLowerCase().includes(q) ||
      (v.category || '').toLowerCase().includes(q) ||
      (v.summary || '').toLowerCase().includes(q)
    )
    .filter(v => !province || province === 'all' || v.province === province)
    .filter(v => !category || category === 'all' || v.category === category);
}

function getProvinces(venues) {
  return [...new Set(venues.map(v => v.province))].filter(Boolean).sort();
}

function getCategories(venues) {
  return [...new Set(venues.map(v => v.category))].filter(Boolean).sort();
}

/* 场馆别名 → 目标场馆名（venue-aliases.json 中与核心撞名被去重的候选；
   收紧前缀回退后这些 5+ 字别名会解析失败，这里用全名精确命中） */
const VENUE_ALIAS_TO_NAME = {
  '南湖革命纪念馆': '嘉兴南湖红船',
  '金寨县革命博物馆': '金寨县革命烈士纪念塔',
  '古田会议纪念馆': '古田会议会址',
  '韶山毛泽东同志纪念馆': '韶山毛泽东同志故居',
  '遵义会议纪念馆': '遵义会议会址',
};

function findVenueByName(venues, name) {
  name = name.replace(/[的了吗呢]$/, '').trim();
  // 剥后缀后为空（聊天输入"的"等）→ 直接返回，杜绝"includes('') 恒真"误配到 venues[0]
  if (!name) return null;
  // 别名查询：按目标馆全名精确匹配
  const aliasTarget = VENUE_ALIAS_TO_NAME[name];
  if (aliasTarget) {
    const hit = venues.find(v => (v.name === aliasTarget) || (v.standardName === aliasTarget));
    if (hit) return hit;
  }
  // 打分匹配：精确 > 前缀 > 包含；仅短查询（≤4 字）才允许"前 3 字"模糊回退，
  // 避免长查询（如"上海红色记忆展"）截断成"上海红"误配到无关场馆
  let best = null, bestScore = 0;
  for (const v of venues) {
    const cands = [v.name, v.standardName].filter(Boolean);
    for (const c of cands) {
      let s = 0;
      if (c === name) s = 6;
      else if (c.startsWith(name)) s = 5;
      else if (c.includes(name)) s = 4;
      else if (name.length <= 4 && (c.startsWith(name.slice(0, 3)) || c.includes(name.slice(0, 3)))) s = 2;
      if (s > bestScore) { bestScore = s; best = v; }
    }
  }
  return best;
}

/* 场馆列表权威缓存的同步读取（供 venue-store 直读，消除双缓存分叉）。
   子源降级时 _venuesCache 未固化（留重试钩子），此时回退最近一次合并结果，
   保证 loadAllVenues() 返回值与 getVenuesCache() 对同一失败结果保持一致 */
function getVenuesCache() {
  return _venuesCache || _lastMerged || [];
}

/* 实践成果按 id 查询（数据访问统一走 data 层，弹窗/渲染不再自取数据） */
async function getPractice(id) {
  const practices = await loadJSON('data/practices.json');
  return practices.find((x) => String(x.id) === String(id)) || null;
}

/* ---- 公开 API ---- */
export {
  loadJSON,
  loadAllVenues,
  filterVenues,
  getProvinces,
  getCategories,
  findVenueByName,
  getVenueDetail,
  getVenuesCache,
  getPractice
};
