/* ============================================================
   赓续血脉・数绘红旅 — 纯数据层 (Data Layer)
   职责：JSON 加载 / 缓存 / 场馆合并查询 / 详情查询
   约束：只依赖 utils(getBasePath) 与 version；不操作 DOM
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081006';
import { ASSET_VERSION } from './version.js?v=2026081006';

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
let _venueDetailsPromise = null;
let _venueDetailsCache = null;
let _extMetaPromise = null;
let _extMetaCache = null;
let _aliasesPromise = null;
let _aliasesCache = null;

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
    await loadVenueDetails();

    // 如果核心数据为空，说明网络失败，抛异常触发重试
    if (!core || core.length === 0) {
      _venuesPromise = null;  // 允许下次重试
      throw new Error('核心场馆数据加载失败，将重试');
    }

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
      merged.push({
        id: 'ext-' + (merged.length + 1),
        name: displayName,
        province: ext.province,
        city: meta.city || '',
        district: meta.district || '',
        category: meta.category || '红色场馆',
        image: meta.image || 'assets/页面通用图片/暂无图片.png',
        summary: meta.summary || (ext.province + '代表性红色场馆，' +
          (ext.officialVerificationStatus === '已核验' || ext.officialVerificationStatus === '已匹配'
            ? '已核验官方信息' : '建议上线前进一步核验') + '。'),
        standardName: ext.standardName || ext.name,
        officialUrl: ext.officialUrl || '',
        officialLinkType: ext.officialLinkType || '',
        officialVerificationStatus: ext.officialVerificationStatus || '',
        officialVerificationDate: ext.officialVerificationDate || meta.officialVerificationDate || '',
        coordinates: meta.coordinates || null,
        author: (meta.source || {}).author || '',
        license: (meta.source || {}).license || '',
        sourcePage: (meta.source || {}).sourcePage || ''
      });
    }
    // 只有成功加载的数据才缓存（核心数据非空）
    if (merged.length > 0) {
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

async function loadExtMeta() {
  if (_extMetaCache !== null) return _extMetaCache;
  if (_extMetaPromise) return _extMetaPromise;
  _extMetaPromise = loadJSON('data/extended-venues-meta.json');
  const data = await _extMetaPromise;
  // 注意：loadJSON 失败返回 []（typeof [] === 'object'），必须再校验非空，否则失败结果会被永久缓存
  if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) {
    _extMetaCache = data;
  } else {
    _extMetaPromise = null; // 允许下次重试
    console.warn('[RedData] extended-venues-meta 加载失败，扩展场馆将降级为占位数据');
  }
  return data;
}

async function loadVenueDetails() {
  if (_venueDetailsCache !== null) return _venueDetailsCache;
  if (_venueDetailsPromise) return _venueDetailsPromise;
  _venueDetailsPromise = loadJSON('data/venue-details.json');
  const data = await _venueDetailsPromise;
  if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) {
    _venueDetailsCache = data;
  } else {
    _venueDetailsPromise = null; // 允许下次重试
    console.warn('[RedData] venue-details 加载失败，详情页将仅显示基础信息');
  }
  return data;
}

/* ---- 场馆特定详情查询 ---- */
function getVenueDetail(name) {
  // 旧名称/别名到新名称的映射（仅保留仍可能命中的条目）
  const nameAlias = {
    '红岩革命纪念馆': '重庆红岩革命纪念馆',
    '雨花台烈士纪念馆（纪念建筑）': '雨花台烈士纪念馆',
  };
  const lookupName = nameAlias[name] || name;
  if (!_venueDetailsCache) return null;
  return _venueDetailsCache[lookupName] || _venueDetailsCache[lookupName?.replace(/纪念馆$/, '')] || null;
}

/* ---- 纯数据查询（无 DOM 依赖） ---- */
function filterVenues(venues, { query, province, category } = {}) {
  const q = query && query.trim() ? query.trim().toLowerCase() : null;
  return [...venues]
    .filter(v => !q ||
      (v.name || '').toLowerCase().includes(q) ||
      (v.province || '').toLowerCase().includes(q) ||
      (v.city || '').toLowerCase().includes(q) ||
      (v.category || '').toLowerCase().includes(q) ||
      (v.summary || '').toLowerCase().includes(q)
    )
    .filter(v => !province || province === 'all' || v.province === province)
    .filter(v => !category || category === 'all' || v.category === category);
}

function getProvinces(venues) {
  return [...new Set(venues.map(v => v.province))].sort();
}

function getCategories(venues) {
  return [...new Set(venues.map(v => v.category))].filter(Boolean).sort();
}

function findVenueByName(venues, name) {
  name = name.replace(/[的了吗呢]$/, '').trim();
  return venues.find(v => (v.name || '').includes(name) || (v.standardName || '').includes(name))
    || venues.find(v => (v.name || '').includes(name.slice(0, 3)));
}

/* ---- 公开 API ---- */
export {
  loadJSON,
  loadAllVenues,
  filterVenues,
  getProvinces,
  getCategories,
  findVenueByName,
  getVenueDetail
};
