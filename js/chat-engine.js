/* ============================================================
   chat-engine — 红旅AI规则问答引擎（纯函数，无 DOM）
   职责：历史/精神知识库 + 意图模式匹配 + 场馆搜索 + 模糊降级
   依赖：venue-store(getVenues) / data(RedData) / utils / chat-knowledge
   说明：与 chat.js（悬浮 UI 组件）分离，本模块可在无 DOM 环境直接单元测试。
   ============================================================ */

import { escapeHtml, escapeAttr, sanitizeUrl, getBasePath, resolveAssetPath, stripProvinceSuffix } from './utils.js?v=2026081309';
import * as RedData from './data.js?v=2026081309';
import { getVenues } from './venue-store.js?v=2026081309';
import { knowledge } from './chat-knowledge.js?v=2026081309';
import { HISTORY_EVENTS } from './red-history.js?v=2026081309';

export function generateReply(query) {
  const q = query.trim();
  if (!q) return '请告诉我你想了解什么 ';

  const venues = getVenues();
  if (venues.length === 0) return '场馆数据正在加载中，请稍后再试…';

  // ===== 第一层：历史事件与精神知识库 =====

  // ===== 第一层匹配：历史知识库 =====
  for (let ki = 0; ki < knowledge.length; ki++) {
    if (knowledge[ki].re.test(q)) return knowledge[ki].answer;
  }

  // ===== 区域查询预处理：数据驱动提取地区名，避免 .{2,4} 通配吞疑问词/动词 =====
  const region = matchRegion(q);
  if (region
    && /(?:有哪些|几个|多少|什么|搜集|收录|覆盖).*(?:场馆|红色|景点)|(?:场馆|红色|景点).*(?:有哪些|几个|多少|什么|搜集|收录|覆盖)/.test(q)
    && !/(?:纪念馆|博物馆|会址|故居|旧址|陵园|纪念园|陈列馆|展览馆|纪念塔|精神)/.test(q)) {
    return searchByRegion(region);
  }

  // ===== 第二层：场馆/省份/类别搜索模式 =====
  const patterns = [
    // 推荐路线
    { re: /(推荐|规划|设计|定制).*(路线|行程|旅游|游览|攻略)|(路线|行程|旅游|攻略).*(推荐|规划|怎么|如何)/, handler: () => recommendRoute(q) },
    // 排名（须在宽松的"省/市"区域模式之前，否则"哪个省场馆最多"会被吞成地区查询）
    { re: /(?:哪些|什么|哪个).*(?:省份|省|地区).*(?:最多|最少|没有)/, handler: () => getProvinceRanking() },
    // 省份/城市查询（支持"延安有什么场馆""陕西有哪些红色场馆"等变体）
    { re: /(.{2,4})(?:省|市|自治区|地区).*?(?:有哪些|几个|多少|什么|搜集|收录|覆盖).*?(?:场馆|红色|景点)/, handler: (m) => searchByRegion(m[1]) },
    { re: /(.{2,4})(?:省|市).*?(?:场馆|红色)/, handler: (m) => searchByRegion(m[1]) },
    { re: /(.{2,4}).*?(?:有什么|有哪些|几个|多少).*?(?:场馆|红色)/, handler: (m) => { const r = regionOf(m[1]); return r ? searchByRegion(r) : getStats(); } },
    // 统计类
    { re: /(?:有多少|几个|多少).*(?:场馆|红色|收录)|(?:场馆|红色).*(?:有多少|几个|多少|统计)/, handler: () => getStats() },
    { re: /(?:有哪些|哪些|什么).*(?:省份|省|地区)|省份分布/, handler: () => getProvinceList() },
    { re: /(?:有哪些|哪些|什么).*(?:类别|类型|分类|主题)/, handler: () => getCategories() },
    // 场馆介绍
    { re: /(?:介绍|了解|说说|讲讲|查一下|查询|查看)(?:一下|下)?(.{2,})/, handler: (m) => searchVenue(m[1]) },
    { re: /(?:怎么去|怎么走|如何去|怎么到|在哪里|在哪儿|在哪)\s*(.{2,})/, handler: (m) => searchVenueLocation(m[1]) },
    { re: /(.{2,})(?:在哪里|怎么去|在哪|地址|位置|交通|怎么走)/, handler: (m) => searchVenueLocation(m[1]) },
    { re: /(.{3,})(?:纪念馆|博物馆|会址|故居|旧址|陵园|纪念园|陈列馆|展览馆|纪念塔)/, handler: (m) => searchVenue(m[0]) },
    // 类别查询
    { re: /(?:有哪些|什么|哪些).*(.{1,4})(?:类型|类别|主题|式).*(?:场馆|纪念馆)/, handler: (m) => searchByCategory(m[1]) },
    // 对比
    { re: /(?:比较|对比|区别|哪个更好).*(.{2,})(?:和|与|vs)(.{2,})/, handler: (m) => compareVenues(m[1], m[2]) },
    // 最近/周边
    { re: /(.{2,})(?:附近|周边|周围|旁边|临近).*(?:有什么|有哪些|场馆)/, handler: (m) => searchNearby(m[1]) },
    // 问候/帮助
    { re: /你好|嗨|hello|hi|在吗|帮助|help|能做什么|功能|怎么用|使用说明/, handler: () => getHelp() },
    // 感谢
    { re: /谢谢|感谢|多谢|thank/, handler: () => '不客气！ 随时为你解答红色文旅相关问题。有什么想了解的可以继续问我～' },
    // 历史时间线
    { re: /(\d{4})年.*(?:发生|事件|历史|大事)/, handler: (m) => getYearEvents(m[1]) },
    // 精神/文化专题
    { re: /(?:什么|哪些|介绍).*精神/, handler: () => getSpiritList() },
  ];

  for (const { re, handler } of patterns) {
    const match = q.match(re);
    if (match) {
      return handler(match);
    }
  }

  // ===== 第三层：模糊匹配与智能降级 =====
  // 先尝试场馆名模糊搜索
  const fuzzyVenue = findVenue(q);
  if (fuzzyVenue) {
    return formatVenueDetail(fuzzyVenue) + '<br><i> 输入「推荐路线」可获取主题游览建议</i>';
  }

  // 尝试省份/城市模糊匹配
  let regionMatch = venues.filter(v => v.province && v.province.includes(q.slice(0, 2)));
  if (regionMatch.length === 0) regionMatch = venues.filter(v => v.city && v.city.includes(q.slice(0, 2)));
  if (regionMatch.length === 0) regionMatch = venues.filter(v => v.district && v.district.includes(q.slice(0, 2)));
  if (regionMatch.length > 0) {
    return searchByRegion(q.slice(0, 2));
  }

  // 尝试在简介中全文搜索
  const summaryMatch = venues.filter(v => v.summary && v.summary.includes(q.slice(0, 3)));
  if (summaryMatch.length > 0) {
    return ` 在简介中搜索「${escapeHtml(q.slice(0, 6))}」找到 <b>${summaryMatch.length}</b> 个相关场馆：<br>` +
      summaryMatch.slice(0, 5).map(v => `• <b>${escapeHtml(v.name)}</b> — ${escapeHtml(v.province)} ${escapeHtml(v.city || '')}<br><small>${escapeHtml((v.summary || '').slice(0, 60))}…</small>`).join('<br><br>') +
      `<br><i> 点击场馆名可在导览页查看详情</i>`;
  }

  // 真正的智能降级：给出有帮助的建议
  return ` 关于「<b>${escapeHtml(q.slice(0, 30))}</b>」，我还在学习中。试试这些：<br><br>
       <b>查场馆</b>：「延安有什么场馆」「介绍井冈山革命博物馆」<br>
       <b>学历史</b>：「长征」「遵义会议」「九一八事变」<br>
       <b>悟精神</b>：「红船精神」「长征精神」「红旗渠精神」<br>
       <b>看数据</b>：「有多少场馆」「哪些省份最多」「场馆类别」<br>
       <b>找路线</b>：「推荐红色旅游路线」「长征路线怎么走」<br><br>
      <i>或者到<a href="${escapeAttr(getBasePath())}pages/guide.html">全国导览</a>页面浏览全部 ${venues.length} 个场馆</i>`;
}

/* ===== 智能搜索函数 ===== */

/* 数据驱动地区名提取：从问句匹配已知省/市/区名（含去后缀变体），长名优先 */
function matchRegion(q) {
  const names = new Set();
  getVenues().forEach(v => {
    if (v.province) { names.add(v.province); names.add(stripProvinceSuffix(v.province)); }
    if (v.city) { names.add(v.city); names.add(stripProvinceSuffix(v.city)); }
    if (v.district) names.add(v.district);
  });
  const sorted = [...names].filter(Boolean).sort((a, b) => b.length - a.length);
  return sorted.find(n => q.includes(n)) || null;
}
/* 正则捕获的地区名去疑问词残渣（"延安有"→"延安"）；全国/总共/一共等全局统计意图返回空串 */
function regionOf(cap) {
  const s = String(cap || '').replace(/[有什么哪些几个多少]+$/, '').trim();
  return /^(全国|总共|一共|全部|所有|总)/.test(s) ? '' : s;
}

function searchByRegion(region) {
  const venues = getVenues();
  // 先在省份中搜
  let found = venues.filter(v => v.province && v.province.includes(region));
  // 省份中没找到，尝试在城市名中搜索
  if (found.length === 0) {
    found = venues.filter(v => v.city && v.city.includes(region));
  }
  // 还没找到，尝试在区县中搜索
  if (found.length === 0) {
    found = venues.filter(v => v.district && v.district.includes(region));
  }
  if (found.length === 0) {
    return `暂未收录「${escapeHtml(region)}」的场馆信息。目前已覆盖 <b>${getProvinceCount()}</b> 个省区市。试试输入省份全称如「陕西省」「湖南省」？`;
  }
  const esc = escapeHtml;
  const cats = [...new Set(found.map(v => v.category).filter(Boolean))];
  return ` <b>${esc(region)}</b> 共有 <b>${found.length}</b> 个红色场馆<br><br>` +
    found.map(v => `• <b>${esc(v.name)}</b> — ${esc(v.category || '红色场馆')}｜${esc(v.city || '')}${esc(v.district || '')}<br><small>${esc((v.summary || '').slice(0, 50))}…</small>`).join('<br>') +
    `<br> 类别分布：${cats.map(esc).join(' · ')}` +
    `<br><i> 输入场馆名称可查看详细信息</i>`;
}

function searchVenue(name) {
  // 后缀剥离（的/了/吗/呢）由 data.js findVenueByName 统一处理，此处不再重复剥离
  const v = findVenue(name.trim());
  if (!v) return `没找到「<b>${escapeHtml(name.slice(0, 15))}</b>」的详细信息。<br><br> 试试：<br>• 输入完整场馆名称<br>• 输入省份名称查看当地全部场馆<br>• 到<a href="${escapeAttr(getBasePath())}pages/guide.html">全国导览</a>搜索`;
  return formatVenueDetail(v) + '<br><i> 问「' + escapeHtml(v.name.slice(0, 4)) + '附近有什么」查看周边场馆</i>';
}

function searchVenueLocation(name) {
  // 整词剥离"怎么去/在哪里/地址/位置/交通"等后缀，而非只删单个字符
  const v = findVenue(name.replace(/(怎么去|怎么走|在哪里|在哪儿|在哪|地址|位置|交通)$/, '').trim());
  if (!v) return searchVenue(name);
  const coord = v.coordinates;
  const esc = escapeHtml;
  // 仅允许 http(s) 链接，杜绝 javascript: 注入
  const safeUrl = (v.officialUrl && /^https?:\/\//i.test(v.officialUrl)) ? v.officialUrl : '';
  return ` <b>${esc(v.name)}</b><br>
       <b>详细地址</b>：${esc(v.province || '')}${esc(v.city || '')}${esc(v.district || '')}<br>
      ${(coord && coord.lat != null && coord.lng != null) ? ` <b>经纬度</b>：${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}<br>` : ''}
      ${safeUrl ? ` <a href="${escapeAttr(safeUrl)}" target="_blank" rel="noopener">官方网站（含交通指引）</a><br>` : ''}
      <br><i> 建议出行前通过官网或电话确认开放时间和预约方式</i>`;
}

/* ---- 场馆详情格式化（AI 聊天用） ---- */
function formatVenueDetail(v) {
  if (!v) return '暂未找到该场馆的详细信息。';
  const detail = RedData.getVenueDetail(v.name);
  const bp = getBasePath();
  const coord = v.coordinates;
  const rawImgSrc = resolveAssetPath(v.image, bp);
  const imgSrc = sanitizeUrl(rawImgSrc);
  const truncate = (s, n) => (s && s.length > n) ? s.slice(0, n) + '…' : s;
  const esc = escapeHtml;
  const attr = escapeAttr;

  let html = '<div class="ai-card">';
  html += '<div class="ai-card-title"> ' + esc(v.name) + '</div>';
  html += '<div class="ai-card-meta"> ' + esc(v.province || '') +
    (v.city ? ' · ' + esc(v.city) : '') +
    (v.district ? ' · ' + esc(v.district) : '') +
    (v.category ? ' · ' + esc(v.category) : '') + '</div>';
  if (coord && coord.lat != null && coord.lng != null) {
    html += '<div class="ai-card-meta"> 坐标：' + coord.lat.toFixed(4) + ', ' + coord.lng.toFixed(4) + '</div>';
  }
  if (imgSrc) {
    html += '<img class="ai-card-img" src="' + attr(imgSrc) + '" alt="' + esc(v.name) + '" loading="lazy">';
  }
  if (detail && detail.history) {
    html += '<br><b> 历史背景</b><br>' + esc(truncate(detail.history, 110));
  } else if (v.summary) {
    html += '<br><b> 简介</b><br>' + esc(truncate(v.summary, 110));
  }
  if (detail && detail.education) {
    html += '<br><b> 教育意义</b><br>' + esc(truncate(detail.education, 80));
  }
  html += '<br><br><a class="ai-card-link" href="' + attr(bp) + 'pages/detail.html?id=' + encodeURIComponent(v.id) + '">查看完整详情 →</a>';
  html += '</div>';
  return html;
}

function searchByCategory(cat) {
  const found = getVenues().filter(v => v.category && v.category.includes(cat));
  if (found.length === 0) {
    const allCats = getCategoriesRaw();
    return `没找到「${escapeHtml(cat)}」类别。当前场馆类别有：${allCats.join('、')}<br><br><i> 输入类别名查看该类别下的场馆</i>`;
  }
  return ` <b>${escapeHtml(cat)}</b> 类场馆共 <b>${found.length}</b> 个：<br><br>` +
    found.map(v => `• <b>${escapeHtml(v.name)}</b> — ${escapeHtml(v.province)} ${escapeHtml(v.city || '')}`).join('<br>') +
    `<br><i> 输入场馆名了解详情</i>`;
}

function compareVenues(a, b) {
  const va = findVenue(a.trim());
  const vb = findVenue(b.trim());
  if (!va || !vb) return `需要两个有效场馆名才能对比哦。试试如「比较井冈山和延安」`;
  const esc = escapeHtml;
  return ` <b>场馆对比</b><br><br>
      <table class="ai-compare-table">
      <tr><td></td><td><b>${esc(va.name)}</b></td><td><b>${esc(vb.name)}</b></td></tr>
      <tr><td> 地区</td><td>${esc(va.province)} ${esc(va.city || '')}</td><td>${esc(vb.province)} ${esc(vb.city || '')}</td></tr>
      <tr><td> 类别</td><td>${esc(va.category || '—')}</td><td>${esc(vb.category || '—')}</td></tr>
      <tr><td> 简介</td><td>${esc((va.summary || '').slice(0, 40))}…</td><td>${esc((vb.summary || '').slice(0, 40))}…</td></tr>
      </table><br><i> 输入场馆名查看完整详情</i>`;
}

function searchNearby(name) {
  const v = findVenue(name.replace(/(附近|周边|周围|旁边|临近)$/, '').trim());
  if (!v) return searchVenue(name);
  const sameProv = getVenues().filter(x => x.province === v.province && x.name !== v.name);
  const sameCity = sameProv.filter(x => x.city === v.city);
  const nearby = sameCity.length > 0 ? sameCity : sameProv;
  const esc = escapeHtml;
  return ` <b>${esc(v.name)}</b> 位于 <b>${esc(v.province)}${esc(v.city || '')}</b><br><br>` +
    (nearby.length > 0
      ? `同地区的其他场馆（${nearby.length}个）：<br>` + nearby.slice(0, 6).map(x => `• <b>${esc(x.name)}</b> — ${esc(x.category || '')}`).join('<br>')
      : `该地区目前仅收录了这一个场馆`) +
    `<br><i> 输入「${esc(stripProvinceSuffix(v.province))}有哪些场馆」查看全部</i>`;
}

function getStats() {
  const v = getVenues();
  const provinces = getProvinceCount();
  const cats = getCategoriesRaw();
  let latest = '持续更新';
  const dates = v.map(x => x.officialVerificationDate).filter(Boolean).sort();
  if (dates.length) {
    const mm = String(dates[dates.length - 1]).match(/^(\d{4})-(\d{2})/);
    latest = mm ? mm[1] + '年' + String(parseInt(mm[2], 10)) + '月' : String(dates[dates.length - 1]);
  }
  return ` <b>红色场馆数据统计</b><br><br>
       场馆总数：<b>${v.length}</b> 个<br>
       覆盖省区市：<b>${provinces}</b> 个<br>
       场馆类别：<b>${cats.length}</b> 种（${cats.map(escapeHtml).join('、')}）<br>
       数据更新：${latest}<br><br>
      <i> 输入省份名查看该地区的场馆</i>`;
}

/* 各省区市场馆数量（省份名去后缀后计数，按数量降序）——getProvinceRanking/getProvinceList 共用 */
function getProvinceCounts() {
  const count = {};
  getVenues().forEach(v => {
    const p = stripProvinceSuffix(v.province);
    count[p] = (count[p] || 0) + 1;
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1]);
}

function getProvinceRanking() {
  const esc = escapeHtml;
  const sorted = getProvinceCounts();
  return ` <b>各省区市场馆数量排名</b><br><br>` +
    sorted.slice(0, 10).map(([p, c], i) => `${['①', '②', '③'][i] || (i + 1)} <b>${esc(p)}</b>：${c} 个`).join('<br>') +
    `<br><i> 输入省份名查看该地区的具体场馆</i>`;
}

function getProvinceList() {
  const esc = escapeHtml;
  const items = getProvinceCounts();
  return ` <b>当前收录场馆覆盖的省区市</b><br><br>` +
    items.map(([p, c]) => `• <b>${esc(p)}</b>：${c} 个`).join('<br>') +
    `<br><i> 输入「某省有哪些场馆」查看该地区的具体场馆</i>`;
}

function getCategories() {
  return ` 当前场馆覆盖的类别：<br><br>` +
    getCategoriesRaw().map(c => `• <b>${escapeHtml(c)}</b>`).join('<br>') +
    `<br><i> 输入类别名查看该类别下的场馆，如「革命纪念馆有哪些」</i>`;
}

function getCategoriesRaw() {
  // 复用 data.js 的权威实现，避免两份类别/省份语义漂移
  return RedData.getCategories(getVenues());
}

function getProvinceCount() {
  return RedData.getProvinces(getVenues()).length;
}

function getHelp() {
  return ` <b>红旅AI助手 使用指南</b><br><br>
       <b>查场馆</b><br>「延安有什么场馆」「介绍井冈山革命博物馆」「韶山在哪」<br><br>
       <b>学历史</b><br>「长征」「遵义会议」「九一八事变」「飞夺泸定桥」<br><br>
       <b>悟精神</b><br>「红船精神」「长征精神」「延安精神」「红旗渠精神」<br><br>
       <b>看数据</b><br>「有多少场馆」「哪些省份最多」「场馆类别有哪些」<br><br>
       <b>找路线</b><br>「推荐红色旅游路线」「长征路线怎么走」<br><br>
       <b>对比</b><br>「比较井冈山和延安」「对比西柏坡和遵义」<br><br>
      <i>现在就开始提问吧！</i>`;
}

function getYearEvents(year) {
  // 年份叙述来自单一知识源 red-history.js（首页时间线共用，消除重复）
  const ev = HISTORY_EVENTS[year];
  if (ev) return ` <b>${year}年</b>${ev.desc}`;
  return ` <b>${year}年</b>的具体红色历史事件我还在整理中。<br><br>目前已收录：${Object.keys(HISTORY_EVENTS).join('、')} 年的重要事件。<br><i> 输入具体事件名如「长征」「开国大典」了解更多</i>`;
}

function getSpiritList() {
  return ` <b>红色精神谱系</b><br><br>
      • <b>红船精神</b> — 开天辟地、敢为人先<br>
      • <b>井冈山精神</b> — 坚定信念、艰苦奋斗<br>
      • <b>长征精神</b> — 不怕牺牲、不畏艰难<br>
      • <b>延安精神</b> — 实事求是、全心全意为人民服务<br>
      • <b>西柏坡精神</b> — 两个务必、赶考精神<br>
      • <b>红岩精神</b> — 崇高理想、坚定信念<br>
      • <b>大别山精神</b> — 坚守信念、团结奋斗<br>
      • <b>红旗渠精神</b> — 自力更生、艰苦创业<br>
      • <b>两弹一星精神</b> — 无私奉献、大力协同<br>
      • <b>苏区精神</b> — 求真务实、一心为民<br><br>
      <i> 输入精神名称了解详情，如「红旗渠精神」</i>`;
}

function findVenue(name) {
  // 统一委托 data.js 的单一场馆匹配器，避免两套匹配逻辑漂移
  return RedData.findVenueByName(getVenues(), name);
}

function recommendRoute(q) {
  const venues = getVenues();
  const isChangzheng = q.indexOf('长征') >= 0;
  const routes = [
    { name: ' 建党足迹之旅（2天）', desc: '上海一大会址 → 嘉兴南湖红船，追寻党的诞生足迹。', venues: ['中共一大会址纪念馆', '嘉兴南湖红船'], theme: '建党' },
    { name: ' 长征精神之旅（5天）', desc: '井冈山 → 遵义 → 泸定桥 → 会宁，重走长征关键节点。', venues: ['井冈山革命博物馆', '遵义会议会址', '泸定桥', '会宁红军长征胜利纪念馆'], theme: '长征' },
    { name: ' 延安精神之旅（3天）', desc: '延安 → 西柏坡 → 北京，从延安到开国大典。', venues: ['延安革命纪念馆', '西柏坡纪念馆', '中国共产党历史展览馆'], theme: '延安' },
    { name: ' 抗战记忆之旅（4天）', desc: '沈阳 → 太行 → 重庆，重温全民族抗战史诗。', venues: ['九一八历史博物馆', '八路军太行纪念馆', '红岩革命纪念馆'], theme: '抗战' },
    { name: ' 革命摇篮之旅（3天）', desc: '南昌 → 井冈山 → 古田，探索人民军队创建之路。', venues: ['南昌八一起义纪念馆', '井冈山革命博物馆', '古田会议会址'], theme: '建军' },
    { name: ' 伟人故里之旅（2天）', desc: '韶山 → 天津，缅怀伟人风范。', venues: ['韶山毛泽东同志故居', '周恩来邓颖超纪念馆'], theme: '伟人' },
    { name: ' 奋斗精神之旅（3天）', desc: '红旗渠 → 三五九旅 → 原子城，感受奋斗力量。', venues: ['红旗渠纪念馆', '三五九旅屯垦纪念馆', '青海原子城纪念馆'], theme: '奋斗' },
  ];
  const displayRoutes = isChangzheng ? routes.filter(function (r) { return r.theme === "长征"; }).concat(routes.filter(function (r) { return r.theme !== "长征"; })) : routes;
  let html = '<div class="ai-card-title"> 红色旅游主题路线推荐</div><br>';
  displayRoutes.forEach(function (r) {
    html += '<div class="ai-card">';
    html += '<b>' + r.name + '</b><br> ' + r.desc + '<br>';
    html += ' ' + r.venues.map(function (vn) {
      const v = venues.find(function (x) { return (x.name || '').indexOf(vn) >= 0; });
      return v ? '<a class="ai-card-link" href="' + escapeAttr(getBasePath()) + 'pages/detail.html?id=' + encodeURIComponent(v.id) + '">' + escapeHtml(vn) + '</a>' : escapeHtml(vn);
    }).join(' → ');
    html += '</div>';
  });
  html += '<br><i> 点击场馆名查看详情 | 输入「长征路线」可优先展示长征主题</i>';
  return html;
}
