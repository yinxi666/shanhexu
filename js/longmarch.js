/* ============================================================
 *  重走长征 · 物理手卷展开模式 A
 *  核心：用户纵向scroll → 横向手卷 translateX 展开
 *  双卷轴木杆旋转 + 17站朱砂印章 + 飘落笺纸 + mood切换
 * ============================================================ */
import * as RedData from './data.js?v=2026081001';
import { getBasePath, escapeAttr, isTouchDevice } from './utils.js?v=2026081001';
import { showToast } from './ui.js?v=2026081001';
import { icon } from './icons.js?v=2026081001';
import { SPIRITS as CZ_SPIRITS, renderCard as czRenderCard, dataUrlToBlob as czDataUrlToBlob } from './cardgen.js?v=2026081001';
import { trapFocus, releaseFocus } from './focus-trap.js?v=2026081001';

/* ---------- 17站长征关键节点 ---------- */
import { STATIONS, TOTAL_MILES, STATION_PHOTOS, VENUE_LOOKUP, buildSmoothPath } from './cz-stations.js?v=2026081001';

/* 共享 reduced-motion 检测（动态响应系统设置变化） */
const _reduceMotionMQ = matchMedia('(prefers-reduced-motion: reduce)');
let _reduceMotion = _reduceMotionMQ.matches;
_reduceMotionMQ.addEventListener('change', e => { _reduceMotion = e.matches; });

async function resolveVenueLinks() {
  const guideHref = getBasePath() + 'pages/guide.html';
  // 默认：站内无对应场馆 → 不显示「探访」按钮
  STATIONS.forEach(s => { s._venueHref = guideHref; s._venueResolved = false; });
  try {
    const venues = await RedData.loadAllVenues();
    STATIONS.forEach(s => {
      const siteName = VENUE_LOOKUP[s.venue] || s.venue;
      const v = RedData.findVenueByName(venues, siteName);
      if (v) {
        s._venueHref = getBasePath() + 'pages/detail.html?id=' + encodeURIComponent(v.id);
        s._venueResolved = true;
      }
    });
  } catch (e) { }
}

/* ---------- 文物碎片：每站对应一个 SVG 图标 + 故事 ---------- */
const RELIC_MAP = {
  1: {
    name: '竹扁担',
    story: '出发前夜，瑞金百姓用竹扁担挑着粮食和草鞋塞到红军战士手里，目送这支队伍踏上漫漫征程。一根扁担，挑起的是苏区人民的全部心意。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M6 20 Q32 12 58 20" stroke="#8a6a38" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M6 20 L2 26 M58 20 L62 26" stroke="#5a3a1a" stroke-width="2.5" stroke-linecap="round"/><path d="M16 22 Q16 30 18 36" stroke="#8a6a38" stroke-width="3" fill="none"/><path d="M48 22 Q48 30 46 36" stroke="#8a6a38" stroke-width="3" fill="none"/><path d="M12 36 Q16 40 20 36 M44 36 Q48 40 52 36" stroke="#6a4a1e" stroke-width="2" fill="none"/><path d="M14 42 L18 44 L14 46 Z" fill="#a8793c"/><path d="M46 42 L50 44 L46 46 Z" fill="#a8793c"/><path d="M20 42 L24 44 L20 46 Z" fill="#a8793c"/><path d="M40 42 L44 44 L40 46 Z" fill="#a8793c"/></svg>`
  },
  2: {
    name: '粗陶粗碗',
    story: '于都百姓把家中仅有的粗瓷碗盛满热茶，塞在红军口袋里，叮嘱一路平安。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 22 L56 22 C54 46 44 54 32 54 C20 54 10 46 8 22 Z" fill="#a8793c" stroke="#6a4818" stroke-width="2"/><path d="M8 22 Q32 16 56 22" stroke="#3a2410" stroke-width="2.5" fill="none"/><ellipse cx="32" cy="58" rx="14" ry="3" fill="#6a4818" opacity="0.55"/><path d="M14 28 Q32 24 50 28" stroke="#8b5e20" stroke-width="1.5" fill="none" opacity="0.7"/></svg>`
  },
  3: {
    name: '子弹壳',
    story: '湘江两岸散落着无数弹壳，每一壳都是一次生死的对撞。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="12" width="12" height="26" rx="6" fill="#d4af37" stroke="#7a5a10" stroke-width="1.8"/><path d="M26 38 L38 38 L40 56 L24 56 Z" fill="#c0392b" stroke="#6e1818" stroke-width="1.8"/><path d="M28 42 L36 42" stroke="#fff3c2" stroke-width="1.2" opacity="0.6"/></svg>`
  },
  4: {
    name: '火把',
    story: '湘江战后士气低沉，通道会议上毛泽东力主转兵西进。会后红军举着火把连夜行军，火光映亮了湘桂边界的山道。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="29" y="32" width="6" height="22" rx="3" fill="#6a4015" stroke="#3a2410" stroke-width="1.5"/><path d="M32 28 Q22 24 26 12 Q28 4 32 2 Q36 4 38 12 Q42 24 32 28 Z" fill="#ffd76e" stroke="#c89a2c" stroke-width="1.5"/><path d="M32 24 Q28 16 32 8 Q34 16 32 24" fill="#ff8c2a"/></svg>`
  },
  5: {
    name: '油印决议',
    story: '黎平会议通过了改变战略方针的正式决议，油印机一张张把它印了出来。这纸薄薄的决议，稳住了彷徨中的红军。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="40" height="46" rx="3" fill="#f2e6cc" stroke="#8a6a3a" stroke-width="1.8"/><path d="M20 22 L44 22 M20 29 L44 29 M20 36 L36 36" stroke="#6a5a3a" stroke-width="2.4" opacity="0.75" stroke-linecap="round"/><circle cx="44" cy="46" r="7" fill="#c0392b" opacity="0.88"/><path d="M44 41.5 L45.3 44.5 L48.5 44.8 L46 46.8 L46.7 50 L44 48.3 L41.3 50 L42 46.8 L39.5 44.8 L42.7 44.5 Z" fill="#f3d9a4"/></svg>`
  },
  6: {
    name: '竹筏',
    story: '竹筏是乌江天险上唯一的渡具。战士们拼扎竹筏、冒着弹雨抢渡，才撞开了这道被称"固若金汤"的防线。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M6 34 Q32 26 58 34" stroke="#8a6a38" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M6 40 Q32 32 58 40" stroke="#a8793c" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M8 46 Q32 38 56 46" stroke="#8a6a38" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M18 28 L18 50 M40 26 L40 48" stroke="#5a3a1a" stroke-width="3"/><path d="M14 20 Q10 14 8 8" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round" fill="none"/><rect x="4" y="4" width="7" height="14" rx="2.5" fill="#6a4a1e"/></svg>`
  },
  7: {
    name: '老油灯',
    story: '遵义会议的阁楼里，一盏桐油灯彻夜不熄，照亮了生死攸关的抉择。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="56" rx="20" ry="4" fill="#4a2a10" opacity="0.5"/><path d="M20 48 L44 48 L40 32 L24 32 Z" fill="#8b5a20" stroke="#3a2410" stroke-width="2"/><rect x="28" y="20" width="8" height="14" fill="#6a4015" stroke="#3a2410" stroke-width="1.5"/><circle cx="32" cy="14" r="6" fill="#ffd76e" stroke="#c89a2c" stroke-width="1.5"/><path d="M32 8 Q28 2 32 0 Q36 2 32 8" fill="#ff8c2a"/></svg>`
  },
  8: {
    name: '草鞋',
    story: '一双草鞋，走过四渡赤水的千里迂回。红军就是穿着这样的草鞋，牵着数十万敌军在川黔滇的群山间打转。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 Q10 20 28 18 Q46 16 54 26 Q60 34 56 42 Q50 50 32 50 Q16 50 10 40 Z" fill="#c4a26a" stroke="#6a4a1e" stroke-width="2"/><path d="M22 24 L26 44 M32 22 L32 46 M42 24 L38 44 M48 30 L43 40" stroke="#8a6a38" stroke-width="2" opacity="0.7"/><path d="M22 48 L26 54 L32 56 L36 52" stroke="#5a3a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
  },
  9: {
    name: '木船桨',
    story: '皎平渡的船工们撑着木桨，七天七夜用七只小船把三万红军渡过金沙江。桨声里，数十万追兵被甩在了身后。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 L40 30" stroke="#8a5a2e" stroke-width="5" stroke-linecap="round"/><path d="M40 30 Q46 28 50 32 Q52 38 46 42 Q40 44 36 38 L34 32 Q36 28 40 30 Z" fill="#a8793c" stroke="#5a3a1a" stroke-width="1.8"/><path d="M18 6 L18 16" stroke="#6a4015" stroke-width="2" opacity="0.6"/></svg>`
  },
  10: {
    name: '渡河木船',
    story: '安顺场渡口的木船小得只能载十几人。十七名勇士就是划着这样的船，在惊涛骇浪中强渡大渡河。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 40 Q32 28 56 40 L48 52 L16 52 Z" fill="#a8793c" stroke="#5a3a1a" stroke-width="2" stroke-linejoin="round"/><path d="M8 40 Q32 34 56 40" stroke="#6a4015" stroke-width="1.5" fill="none"/><path d="M16 50 L48 50" stroke="#7a4a1e" stroke-width="1.5" opacity="0.5"/><path d="M14 42 L4 28 M50 42 L60 28" stroke="#8a5a2e" stroke-width="3" stroke-linecap="round"/><path d="M8 22 Q4 16 8 12 Q12 16 8 22 Z" fill="#ffd76e" opacity="0.85"/></svg>`
  },
  11: {
    name: '铁链扣',
    story: '泸定桥十三根铁索，每一环都被勇士的鲜血浸过。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="20" r="8" fill="none" stroke="#444" stroke-width="6"/><circle cx="32" cy="44" r="8" fill="none" stroke="#444" stroke-width="6"/><rect x="28" y="12" width="8" height="16" fill="#555"/><rect x="28" y="36" width="8" height="16" fill="#555"/><circle cx="32" cy="20" r="5" fill="none" stroke="#8b5a20" stroke-width="2" opacity="0.8"/><circle cx="32" cy="44" r="5" fill="none" stroke="#8b5a20" stroke-width="2" opacity="0.8"/></svg>`
  },
  12: {
    name: '半条皮带',
    story: '翻过夹金山时，战士们把皮带切条煮食，半条皮带就是三天的口粮。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 30 Q10 16 30 16 Q50 16 56 32 Q60 48 36 50 Q22 51 18 44 L22 40 Q26 45 36 44 Q52 42 50 30 Q46 20 30 20 Q18 20 16 32" fill="#5a3a1a" stroke="#2a1808" stroke-width="2"/><circle cx="44" cy="28" r="2.5" fill="#2a1808"/><circle cx="40" cy="26" r="2" fill="#2a1808"/></svg>`
  },
  13: {
    name: '会师军号',
    story: '会师的号角在懋功达维桥畔吹响，红一方面军与红四方面军的指战员紧紧握手。号声中，两大主力从此并肩作战。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 32 Q28 22 44 26 L54 16 L54 40 L44 30 Q28 36 10 32 Z" fill="#d4af37" stroke="#7a5a10" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="32" r="4.5" fill="#c0392b" stroke="#6e1818" stroke-width="1.5"/><path d="M8 30 L2 28 M8 34 L2 36" stroke="#7a5a10" stroke-width="1.8" stroke-linecap="round"/><path d="M54 16 L60 14 M54 40 L60 42" stroke="#7a5a10" stroke-width="2"/></svg>`
  },
  14: {
    name: '野菜囊',
    story: '过草地七天，红军战士靠采食灰灰菜、野葱、牛皮充饥，走出死亡地带。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M18 22 L46 22 L48 54 Q32 62 16 54 Z" fill="#c4a26a" stroke="#5a4018" stroke-width="2"/><path d="M24 22 Q32 14 40 22 L40 26 Q32 20 24 26 Z" fill="#6a8b3a" stroke="#3a5018" stroke-width="1.8"/><path d="M22 30 L42 30 M20 38 L44 38 M22 46 L42 46" stroke="#6a4015" stroke-width="1" opacity="0.6"/></svg>`
  },
  15: {
    name: '苗族砍刀',
    story: '苗族小战士"云贵川"腰间别着砍刀，徒手攀上腊子口绝壁。正是这把刀劈开的天险，为红军打开了北上通道。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M36 8 L60 40 Q54 48 44 46 L20 18 Q28 8 36 8 Z" fill="#9aa5b1" stroke="#4a5560" stroke-width="2" stroke-linejoin="round"/><path d="M22 16 L12 12 L14 26 L26 20" fill="#5a3a1a" stroke="#3a2410" stroke-width="1.5" stroke-linejoin="round"/><path d="M42 18 L48 26" stroke="#d7dee4" stroke-width="1.6" opacity="0.8"/><path d="M14 26 L18 40" stroke="#3a2410" stroke-width="1.5" opacity="0.6"/></svg>`
  },
  16: {
    name: '会师红旗',
    story: '会宁城头红旗漫卷，红一、二、四方面军在这里胜利会师。这面旗，宣告了二万五千里长征的胜利结束。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M14 52 L14 8 L54 20 L14 32" fill="#c0392b" stroke="#6e1818" stroke-width="2" stroke-linejoin="round"/><path d="M28 11 L30.1 17.1 L36.6 17.2 L31.4 21.1 L33.3 27.3 L28 23.6 L22.7 27.3 L24.6 21.1 L19.4 17.2 L25.9 17.1 Z" fill="#ffd76e" stroke="#c89a2c" stroke-width="0.8"/><path d="M14 52 L54 52" stroke="#4a2a10" stroke-width="3" stroke-linecap="round"/></svg>`
  },
  17: {
    name: '八角帽',
    story: '延安的窑洞前，一顶顶红星八角帽下是一张张写满坚毅的脸。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 44 Q10 24 32 20 Q54 24 54 44 L48 48 L16 48 Z" fill="#4a6b3a" stroke="#1e3218" stroke-width="2"/><path d="M20 44 L44 44 L44 48 L20 48 Z" fill="#2e4422" stroke="#1e3218" stroke-width="1.5"/><circle cx="32" cy="32" r="5" fill="#c0392b" stroke="#6e1818" stroke-width="1.5"/><path d="M32 27 L33.5 30.5 L37 30.8 L34.5 33.2 L35.3 36.5 L32 34.5 L28.7 36.5 L29.5 33.2 L27 30.8 L30.5 30.5 Z" fill="#ffd76e"/></svg>`
  }
};

/* ---------- DOM 引用 ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const main = $('#cz-main');
const handroll = $('#czHandroll');
const handrollWin = document.querySelector('.cz-handroll-window');
const handrollCont = $('#czHandrollContents');
const scrollDriver = $('#czScrollDriver');
const rollerL = $('#czRollerL');
const rollerR = $('#czRollerR');
const grainL = rollerL ? rollerL.querySelector('.cz-roller-grain') : null;
const grainR = rollerR ? rollerR.querySelector('.cz-roller-grain') : null;
const bgLayer = $('.cz-bg');
const bgPhoto = $('#czBgPhoto');
const hudIndex = $('#cz-hud-index');
const hudStation = $('#cz-hud-station');
const hudMilesB = document.querySelector('#cz-hud-miles');
const hudYear = $('#cz-hud-year');
const hudBarFill = document.querySelector('#cz-hud-bar-fill');
const hudHint = document.querySelector('#cz-hud-hint');
const routeDots = $('#cz-route-dots');
const routeTrack = $('#cz-route-track');
const routeFill = $('#cz-route-fill');
const routeMarker = $('#cz-route-marker');

/* 全局状态 */
const state = {
  handrollW: 0,        // 手卷总宽度
  viewportW: 0,        // 手卷窗口宽度
  scrollH: 0,          // 驱动条总高
  maxTranslateX: 0,    // 手卷最大 translateX
  maxScroll: 0,        // 驱动条最大 scroll
  currX: 0,            // 当前 translateX
  activeStationId: null,
  _lastActiveT: 0,     // 上次交互时间(用于暂停粒子)
  // DOM 缓存(避免每帧 $$ 查询)
  _stampEls: [],
  _stampXs: [],        // 印章 x 坐标缓存(数字)
  _noteEls: [],
  _moodEls: {},        // {ember:el, blood:el, ...}
  _miniDotEls: [],     // 迷你地图圆点 g 元素数组
  _dustPool: [],       // 尘埃 DOM 池(避免频繁 createElement)
  _dustQueue: []       // 待渲染尘埃参数队列(rAF 批量 flush)
};

/* ---------- 布局：设置手卷宽度 + 注入 17站 ---------- */
function layout() {
  if (!handrollWin || !handroll || !scrollDriver) return;

  const vw = handrollWin.clientWidth;           // 手卷窗口宽
  const vh = window.innerHeight - 120;          // 手卷舞台高(去掉导航)
  const perStationW = Math.max(660, vw * 0.9);  // 每站占宽（加大站间距，避免定格与下一站卡片重叠）
  const sidePad = vw * 0.5;                     // 两侧 padding,让首尾站能居中
  const totalW = perStationW * STATIONS.length + sidePad * 2;

  handroll.style.width = totalW + 'px';

  state.handrollW = totalW;
  state.viewportW = vw;
  state.maxTranslateX = Math.max(0, totalW - vw);
  // 滚动驱动条高度（降低总滚动量，减轻滚动疲劳）
  state.scrollH = Math.max(window.innerHeight * 2, state.maxTranslateX);
  scrollDriver.style.height = state.scrollH + 'px';
  state.maxScroll = Math.max(0, state.scrollH - window.innerHeight);

  buildContents(totalW, vh, perStationW, sidePad);
  buildInkDots(totalW, vh);
  buildMiniRoute();   // 构建右上迷你地图(路径 + 圆点)
  onScroll();   // 立即按当前位置渲染一次
}

/* 在老宣纸手卷上随机散布墨迹墨点（24 个不规则大小污渍） */
function buildInkDots(totalW, vh) {
  const inkLayer = document.getElementById('czInkDots');
  if (!inkLayer) return;
  inkLayer.innerHTML = '';
  for (let i = 0; i < 28; i++) {
    const dot = document.createElement('span');
    dot.className = 'ink';
    const x = Math.random() * totalW;
    const y = 0.05 * vh + Math.random() * (vh * 0.9);
    const w = 3 + Math.random() * 12;
    const h = w * (0.6 + Math.random() * 0.9);
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    dot.style.width = w + 'px';
    dot.style.height = h + 'px';
    dot.style.setProperty('--rot', (Math.random() * 360).toFixed(1) + 'deg');
    dot.style.setProperty('--s', (0.6 + Math.random() * 1.2).toFixed(2));
    inkLayer.appendChild(dot);
  }
}

/* 构建手卷内容：SVG路线 + 印章 + 笺纸 */
function buildContents(totalW, vh, perStationW, sidePad) {
  if (!handrollCont) return;
  handrollCont.innerHTML = '';

  // 1) SVG路线(路径穿过各站点)
  const svgNS = 'http://www.w3.org/2000/svg';
  const routeSvg = document.createElementNS(svgNS, 'svg');
  routeSvg.setAttribute('class', 'cz-handroll-route-svg');
  routeSvg.setAttribute('viewBox', `0 0 ${totalW} ${vh}`);
  routeSvg.setAttribute('preserveAspectRatio', 'none');
  routeSvg.setAttribute('xmlns', svgNS);

  // defs 朱砂渐变
  let defsS = `<defs>
      <linearGradient id="czHandrollRoute" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="#8b1a1a" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#c0392b" stop-opacity="0.95"/>
      </linearGradient>
      <filter id="czHandShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#3a1007" flood-opacity="0.35"/>
      </filter>
    </defs>`;

  // 构建17站点坐标 (x = sidePad + idx*perStationW + perStationW/2；y 整体上移，避免卡片超出屏幕底部)
  const pts = STATIONS.map((s, i) => ({
    x: sidePad + i * perStationW + perStationW / 2,
    y: vh * (s.y / 100) * 0.8
  }));

  // 基础路径（平滑贝塞尔穿过各点）
  const basePath = buildSmoothPath(pts);
  const pathBase = document.createElementNS(svgNS, 'path');
  pathBase.setAttribute('d', basePath);
  pathBase.setAttribute('fill', 'none');
  pathBase.setAttribute('stroke', 'rgba(140, 50, 30, 0.45)');
  pathBase.setAttribute('stroke-width', Math.max(6, vh * 0.02));
  pathBase.setAttribute('stroke-linecap', 'round');
  pathBase.setAttribute('stroke-linejoin', 'round');
  pathBase.setAttribute('stroke-dasharray', '10 8');
  pathBase.setAttribute('filter', 'url(#czHandShadow)');

  // 进度路径（红实线，通过stroke-dashoffset控制已走部分）
  const progPath = document.createElementNS(svgNS, 'path');
  progPath.setAttribute('id', 'czHandrollRouteProgress');
  progPath.setAttribute('d', basePath);
  progPath.setAttribute('fill', 'none');
  progPath.setAttribute('stroke', 'url(#czHandrollRoute)');
  progPath.setAttribute('stroke-width', Math.max(10, vh * 0.03));
  progPath.setAttribute('stroke-linecap', 'round');
  progPath.setAttribute('stroke-linejoin', 'round');
  // SVG filter 呈现属性只接受单个 url(#…)，混入 CSS drop-shadow() 会使整条属性失效；
  // 改经 CSS filter 列表同时应用描边阴影滤镜 + 进度线投影暖光
  progPath.setAttribute('style', 'filter: url(#czHandShadow) drop-shadow(0 0 10px rgba(255,100,60,0.55));');

  // 先估算路径总长度
  // 用直线近似总和
  let approxLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    approxLen += Math.sqrt(dx * dx + dy * dy);
  }
  approxLen = approxLen * 1.12;  // 贝塞尔修正
  progPath.setAttribute('stroke-dasharray', `${approxLen} ${approxLen + 200}`);
  progPath.setAttribute('stroke-dashoffset', approxLen);

  routeSvg.innerHTML = defsS;
  routeSvg.appendChild(pathBase);
  routeSvg.appendChild(progPath);
  handrollCont.appendChild(routeSvg);
  state._approxRouteLen = approxLen;
  state._progPath = progPath;

  // 清空旧缓存
  state._stampEls.length = 0;
  state._stampXs.length = 0;
  state._noteEls.length = 0;

  // 2) 注入每站印章 + 笺纸
  STATIONS.forEach((s, i) => {
    const p = pts[i];
    const placeLeft = (i % 2 === 1);  // 奇偶站交替左右

    // 印章 DOM
    const stamp = document.createElement('div');
    stamp.className = 'cz-stamp';
    stamp.dataset.stationId = s.id;
    stamp.style.left = p.x + 'px';
    stamp.style.top = p.y + 'px';
    stamp.style.setProperty('--note-tilt', (placeLeft ? -1 : 1) * (1 + Math.random() * 3) + 'deg');

    stamp.innerHTML = `
        <span class="cz-stamp-index">第 ${s.id} 站 · ${s.date}</span>
        <div class="cz-stamp-inner">
          ${stampSvg(s)}
        </div>
      `;
    stamp.addEventListener('click', () => scrollToStation(s.id));
    handrollCont.appendChild(stamp);
    state._stampEls.push(stamp);
    state._stampXs.push(p.x);

    // 笺纸 DOM
    const note = document.createElement('div');
    note.className = 'cz-note ' + (placeLeft ? 'place-left' : 'place-right');
    note.dataset.stationId = s.id;
    note.style.left = p.x + 'px';
    note.style.top = p.y + 'px';
    const tilt = (placeLeft ? -1 : 1) * (1 + Math.random() * 3);
    note.style.setProperty('--note-tilt', tilt + 'deg');

    const poemHtml = s.poem.split('\n').map(l => `<div>${l}</div>`).join('');
    const photo = STATION_PHOTOS[s.id];
    const photoHtml = photo
      ? `<div class="cz-note-photo"><img src="${getBasePath()}images/longmarch/${photo}" alt="${s.name}实景" loading="lazy"></div>`
      : '';
    const relic = RELIC_MAP[s.id];
    const relicHtml = relic
      ? `<div class="cz-note-relic" role="button" tabindex="0" title="点击查看「${relic.name}」详情">
             <div class="cz-note-relic-icon">${relic.svg}</div>
             <div class="cz-note-relic-tip">
               <strong>${relic.name}</strong><span>${relic.story}</span>
             </div>
             <span class="cz-note-relic-more">点击查看详情 ↗</span>
           </div>`
      : '';
    note.innerHTML = `
        ${photoHtml}
        <div class="cz-note-head">
          <span class="cz-note-name">${s.name}</span>
          <span class="cz-note-date">${s.date}</span>
        </div>
        <div class="cz-note-poem">${poemHtml}</div>
        <div class="cz-note-event">${s.event}</div>
        ${relicHtml}
        ${s._venueResolved ? `
        <a class="cz-note-venue" href="${s._venueHref}">
          ${icon('pin')} 探访${s.venue}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </a>` : ''}
      `;
    handrollCont.appendChild(note);
    state._noteEls.push(note);
  });
}

/* 生成单站朱砂印章 SVG（站内文字竖排） */
function stampSvg(s) {
  const ch = s.name;
  const len = ch.length;
  // 1字:一行；2字:两行各1；3字:左1右2；4字:2x2
  const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="cz-station-svg">
      <defs>
        <filter id="stampTex_${s.id}" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="${s.id * 7}"/>
          <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.04  0 0 0 0 0.04  0 0 0 0.5 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
          <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge>
        </filter>
      </defs>
      <rect x="5" y="5" width="90" height="90" rx="6" ry="6"
            fill="#b22222" stroke="#6b1111" stroke-width="3.2"
            filter="url(#stampTex_${s.id})" opacity="0.92"/>
      <rect x="11" y="11" width="78" height="78" rx="3" ry="3"
            fill="none" stroke="#fff3c2" stroke-width="1" opacity="0.45"/>
      <g font-family="'STKaiti','KaiTi','FangSong',serif" font-weight="800" fill="#fff3d2"
         text-anchor="middle" dominant-baseline="central">
        ${renderStampText(ch, len)}
      </g>
    </svg>`;
  return svg;
}

function renderStampText(chars, len) {
  const arr = Array.from(chars);
  if (len === 1) {
    return `<text x="50" y="52" font-size="60">${arr[0]}</text>`;
  }
  if (len === 2) {
    return `<text x="50" y="30" font-size="38">${arr[0]}</text>
              <text x="50" y="72" font-size="38">${arr[1]}</text>`;
  }
  if (len === 3) {
    return `<text x="28" y="52" font-size="42" writing-mode="tb">${arr[0]}</text>
              <text x="68" y="30" font-size="34">${arr[1]}</text>
              <text x="68" y="70" font-size="34">${arr[2]}</text>`;
  }
  // 4字及以上：2列竖排，从左到右（左列先上后下，右列再上后下）
  const left = arr.slice(0, Math.ceil(len / 2));
  const right = arr.slice(Math.ceil(len / 2));
  const topY = 50 - ((left.length - 1) * 22) / 2;
  const fs = len >= 6 ? 26 : 30;
  let out = '';
  left.forEach((c, i) => { out += `<text x="34" y="${topY + i * 22}" font-size="${fs}">${c}</text>`; });
  const topY2 = 50 - ((right.length - 1) * 22) / 2;
  right.forEach((c, i) => { out += `<text x="66" y="${topY2 + i * 22}" font-size="${fs}">${c}</text>`; });
  return out;
}


/* ---------- 滚动 → translateX 映射 ---------- */
function onScroll() {
  state._lastActiveT = performance.now();
  // 全屏定格期间：锁住滚动，让卷轴停在当前站，不跟着滚走
  if (_cinematicHoldScroll !== null) {
    const y = window.pageYOffset || document.documentElement.scrollTop;
    // 用 instant 而非默认（默认会继承 CSS scroll-behavior:smooth，与滚轮打架导致抖动）
    if (Math.abs(y - _cinematicHoldScroll) > 1) _instantScroll(_cinematicHoldScroll);
    return;
  }
  if (!state.maxScroll || state.maxScroll <= 0) return;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const clampedScroll = Math.max(0, Math.min(state.maxScroll, scrollTop));
  const progress = clampedScroll / state.maxScroll;  // 0~1

  const x = -progress * state.maxTranslateX;
  state.currX = x;
  handroll.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;

  // 卷轴木纹滚动效果 (两根卷轴: 左卷轴收, 右卷轴放)
  const grainOffset = (progress * 3000).toFixed(1) + 'px';
  if (grainL) grainL.style.backgroundPositionY = grainOffset;
  if (grainR) grainR.style.backgroundPositionY = grainOffset;

  // 找到最靠近中心的站（缓存数字数组，用顺序递增特性直接线性或二分查找）
  const centerAbs = Math.abs(x) + state.viewportW / 2;  // 手卷坐标系下中心 x
  const stampXs = state._stampXs;
  let closestId = 1;
  if (stampXs.length) {
    // stampXs 严格递增（按站号均匀投影），二分 + 最近2点对比
    let lo = 0, hi = stampXs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (stampXs[mid] < centerAbs) lo = mid + 1;
      else hi = mid;
    }
    // lo 是第一个 >= centerAbs 的位置，对比 lo 和 lo-1
    const candidates = [lo];
    if (lo > 0) candidates.push(lo - 1);
    let bestD = Infinity, bestIdx = 0;
    for (const idx of candidates) {
      const d = Math.abs(stampXs[idx] - centerAbs);
      if (d < bestD) { bestD = d; bestIdx = idx; }
    }
    closestId = bestIdx + 1;
  }

  if (closestId && closestId !== state.activeStationId) setActive(closestId);

  // 更新 HUD 总进度
  const miles = Math.round(progress * TOTAL_MILES);
  if (hudMilesB && miles !== state._prevMiles) {
    state._prevMiles = miles;
    hudMilesB.textContent = miles.toLocaleString();
  }
  if (hudBarFill) hudBarFill.style.width = (progress * 100).toFixed(1) + '%';

  // 更新手卷路线进度条
  updateRouteProgress(progress);

  // 更新右上迷你地图进度
  updateMiniRoute(progress);

  // 展开时偶尔飘点小尘埃
  spawnDustIfScrolling();

  // 隐藏滚动提示
  if (progress > 0.02 && hudHint) hudHint.classList.add('hide');
  else if (hudHint) hudHint.classList.remove('hide');
}

/* 更新手卷内红色实线路径进度 */
function updateRouteProgress(progress) {
  if (state._progPath && state._approxRouteLen) {
    const offset = state._approxRouteLen * (1 - progress);
    state._progPath.setAttribute('stroke-dashoffset', offset);
  }
}

/* 更新右上小地图 */
function updateMiniRoute(progress) {
  // 填充进度 path 通过 stroke-dashoffset 控制
  if (routeFill && state._miniRouteLen) {
    const total = state._miniRouteLen;
    routeFill.setAttribute('stroke-dashoffset', (total - progress * total).toFixed(1));
  }
  // 当前站点激活 + marker 定位
  if (!state.activeStationId) return;
  const id = state.activeStationId;
  const dotEls = state._miniDotEls;
  if (dotEls && dotEls.length) {
    for (let i = 0; i < dotEls.length; i++) {
      const n = i + 1;
      dotEls[i].classList.toggle('active', n === id);
      dotEls[i].classList.toggle('passed', n < id);
    }
  }
  // marker 移到当前站位置上方
  if (routeMarker && state._miniPts && state._miniPts[id - 1]) {
    const p = state._miniPts[id - 1];
    // 放大 marker（星形定位点），小地图上更醒目
    routeMarker.setAttribute('transform', `translate(${p.x.toFixed(1)}, ${(p.y - 10).toFixed(1)}) scale(1.4)`);
  }
}

let _scrollDustT = 0;
function spawnDustIfScrolling() {
  if (_reduceMotion) return;
  const now = performance.now();
  if (now - _scrollDustT < 220) return;
  _scrollDustT = now;
  spawnDust(1);
}

/* ========== spawnDust 改为对象池 + rAF 批量（避免频繁 createElement / appendChild）========== */
const DUST_POOL_MAX = 24;
let _dustRafScheduled = false;
function _dustFlushRaf() {
  _dustRafScheduled = false;
  const dustContainer = document.getElementById('czDust') || document.body;
  if (!dustContainer) return;
  const q = state._dustQueue;
  if (!q || !q.length) return;
  // 从对象池取 DOM；不够则一次性补齐 24 个备用
  let pool = state._dustPool;
  while (pool.length < DUST_POOL_MAX) {
    const d = document.createElement('span');
    d.className = 'cz-dust-dot';
    d.style.position = 'fixed';
    d.style.pointerEvents = 'none';
    d.style.opacity = '0';
    d._czDustInUse = false;
    dustContainer.appendChild(d);
    pool.push(d);
  }
  // 出队 → 取空闲池 → 赋值样式 → 加过渡动画 → 计时回收
  while (q.length) {
    const opt = q.shift();
    // 找空闲
    let d = null;
    for (let k = 0; k < pool.length; k++) {
      if (!pool[k]._czDustInUse) { d = pool[k]; break; }
    }
    if (!d) continue; // 池子全用满，丢弃这一条，继续处理其余尘埃
    d._czDustInUse = true;
    d.style.left = opt.x + 'px';
    d.style.top = opt.y + 'px';
    d.style.setProperty('--dust-dx', opt.dx + 'px');
    d.style.background = opt.bg;
    d.style.width = opt.size + 'px';
    d.style.height = opt.size + 'px';
    // 触发 CSS transition：写进属性 --dust-phase（简单起见，移除 class 再加）
    d.classList.remove('cz-dust-dot-fly');
    // force reflow
    void d.offsetWidth;
    d.classList.add('cz-dust-dot-fly');
    // 4.8s 后回收
    (function (el) {
      setTimeout(() => {
        el.classList.remove('cz-dust-dot-fly');
        el.style.opacity = '0';
        el._czDustInUse = false;
      }, 4800);
    })(d);
  }
}

/* 从展开轴(右卷轴处)飘出小尘埃（改入队+rAF批量flush） */
function spawnDust(count = 2) {
  if (!handrollWin) return;
  const rect = handrollWin.getBoundingClientRect();
  const q = state._dustQueue;
  for (let i = 0; i < count; i++) {
    const x = rect.right - 36 - 2 + Math.random() * 18;
    const y = rect.top + rect.height * (0.22 + Math.random() * 0.56);
    const dx = -30 - Math.random() * 70;
    const hue = 38 + Math.random() * 16;
    const size = 2 + Math.random() * 5;
    const bg = `hsla(${hue.toFixed(0)}, 100%, 82%, ${(0.55 + Math.random() * 0.4).toFixed(2)})`;
    q.push({ x, y, dx, size, bg });
  }
  if (!_dustRafScheduled) {
    _dustRafScheduled = true;
    requestAnimationFrame(_dustFlushRaf);
  }
}

/* ---------- 激活某站: 印章发光 + 笺纸飘落 + HUD 更新 + mood切色 ---------- */
/* ============================================================
   沉浸增强：人物小卡 / 诗词浮现 / 环境音景 / 文物详情弹窗
   ============================================================ */

/* ---------- 诗词浮现：路过关键站浮现毛泽东诗词 ---------- */
const POEM_MOMENTS = {
  3: { text: '苍山如海，残阳如血', src: '《忆秦娥·娄山关》' },
  7: { text: '雄关漫道真如铁，\n而今迈步从头越', src: '《忆秦娥·娄山关》' },
  8: { text: '乌蒙磅礴走泥丸', src: '《七律·长征》' },
  9: { text: '金沙水拍云崖暖', src: '《七律·长征》' },
  11: { text: '大渡桥横铁索寒', src: '《七律·长征》' },
  12: { text: '更喜岷山千里雪', src: '《七律·长征》' },
  14: { text: '万水千山只等闲', src: '《七律·长征》' },
  16: { text: '今日长缨在手，\n何时缚住苍龙？', src: '《清平乐·六盘山》' },
  17: { text: '星星之火，可以燎原', src: '毛泽东语录' },
};
const poemOverlay = $('#cz-poem-overlay');
const poemText = $('#cz-poem-text');
const poemSrc = $('#cz-poem-src');
let _poemTimer = null;
function showPoem(id) {
  if (_poemShown.has(id)) return;  // 每站只浮现一次，避免进出反复闪现
  _poemShown.add(id);
  const p = POEM_MOMENTS[id];
  if (!p || !poemOverlay) return;
  clearTimeout(_poemTimer);
  if (poemText) poemText.textContent = p.text;
  if (poemSrc) poemSrc.textContent = p.src || '';
  poemOverlay.classList.add('show');
  _poemTimer = setTimeout(() => poemOverlay.classList.remove('show'), 4600);
}

/* ---------- 环境音景：Web Audio 合成，随 mood 切换 ---------- */
let _audioCtx = null;
let _soundMaster = null;
let _soundOn = false;
let _soundNodes = [];
let _boomTimer = null;
let _lastSndMood = null;
const soundToggle = $('#cz-sound-toggle');

function _noiseBuffer(ctx, brown) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else d[i] = w;
  }
  return buf;
}
function _windNode(ctx, level, cutoff) {
  const src = ctx.createBufferSource();
  src.buffer = _noiseBuffer(ctx, false);
  src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = ctx.createGain(); g.gain.value = level;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
  const lg = ctx.createGain(); lg.gain.value = level * 0.45;
  lfo.connect(lg).connect(g.gain);
  src.connect(f).connect(g).connect(_soundMaster);
  src.start(); lfo.start();
  return { stop() { try { src.stop(); } catch (e) { } try { lfo.stop(); } catch (e) { } } };
}
function _rumbleNode(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = _noiseBuffer(ctx, true);
  src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 110;
  const g = ctx.createGain(); g.gain.value = 0.5;
  src.connect(f).connect(g).connect(_soundMaster);
  src.start();
  return { stop() { try { src.stop(); } catch (e) { } } };
}
function _droneNode(ctx, freq, level) {
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 1.5;
  const g = ctx.createGain(); g.gain.value = level;
  o1.connect(g); o2.connect(g); g.connect(_soundMaster);
  o1.start(); o2.start();
  return { stop() { try { o1.stop(); } catch (e) { } try { o2.stop(); } catch (e) { } } };
}
function _padNode(ctx) {
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700;
  const g = ctx.createGain(); g.gain.value = 0.05;
  filter.connect(g).connect(_soundMaster);
  const outs = [220, 277.18, 329.63];
  const nodes = outs.map((fq, i) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = fq * 1.005;
    const og = ctx.createGain(); og.gain.value = 1 / (i + 1);
    o.connect(og); o2.connect(og); og.connect(filter);
    o.start(); o2.start();
    return [o, o2];
  }).flat();
  return { stop() { nodes.forEach(n => { try { n.stop(); } catch (e) { } }); } };
}
function _boomOnce() {
  if (!_audioCtx) return;
  const ctx = _audioCtx;
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(95, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(26, ctx.currentTime + 1.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
  osc.connect(g).connect(_soundMaster);
  osc.start(); osc.stop(ctx.currentTime + 2.1);
}
function _scheduleBooms() {
  clearTimeout(_boomTimer);
  const loop = () => { _boomOnce(); _boomTimer = setTimeout(loop, 3200 + Math.random() * 4600); };
  _boomTimer = setTimeout(loop, 1400);
}
function playSoundscape(mood) {
  if (!_audioCtx || !_soundMaster || mood === _lastSndMood) return;
  _lastSndMood = mood;
  clearTimeout(_boomTimer);
  _soundNodes.forEach(n => n.stop());
  _soundNodes = [];
  const level = mood === 'snow' ? 0.5 : mood === 'blood' ? 0.24 : 0.3;
  const cutoff = mood === 'snow' ? 1500 : mood === 'blood' ? 850 : 950;
  _soundNodes.push(_windNode(_audioCtx, level, cutoff));
  if (mood === 'blood') { _soundNodes.push(_rumbleNode(_audioCtx)); _scheduleBooms(); }
  else if (mood === 'swamp') { _soundNodes.push(_droneNode(_audioCtx, 54, 0.5)); }
  else if (mood === 'gold') { _soundNodes.push(_padNode(_audioCtx)); }
  else if (mood === 'ember') { _soundNodes.push(_droneNode(_audioCtx, 70, 0.18)); }
}
function updateSoundscape(mood) {
  if (!_audioCtx || !_soundOn) return;
  playSoundscape(mood);
}
function updateSoundToggle() {
  if (soundToggle) soundToggle.innerHTML = _soundOn ? icon('speaker') : icon('speaker-off');
}
function initSound() {
  if (_audioCtx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    _audioCtx = new AC();
    _soundMaster = _audioCtx.createGain();
    _soundMaster.gain.value = 0.16;
    _soundMaster.connect(_audioCtx.destination);
    _soundOn = true;
    updateSoundToggle();
    const s = state.activeStationId ? STATIONS[state.activeStationId - 1] : null;
    playSoundscape(s ? s.mood : 'ember');
  } catch (e) { }
}
function toggleSound() {
  if (!_audioCtx) { initSound(); return; }
  _soundOn = !_soundOn;
  if (_soundOn) {
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    _soundMaster.gain.value = 0.16;
    const s = state.activeStationId ? STATIONS[state.activeStationId - 1] : null;
    _lastSndMood = null;
    playSoundscape(s ? s.mood : 'ember');
  } else {
    clearTimeout(_boomTimer);
    _soundNodes.forEach(n => n.stop());
    _soundNodes = [];
    _soundMaster.gain.value = 0;
  }
  updateSoundToggle();
}

/* ---------- 自动行军：自动匀速滚动浏览全程 ---------- */
const autoplayBtn = $('#cz-autoplay-btn');
let _autoRaf = null;
function startAutoScroll() {
  stopAutoScroll();
  const targetDur = 75;  // 全程约 75 秒走完
  const speedPerMs = (state.maxScroll > 0) ? state.maxScroll / (targetDur * 1000) : 0.03;
  let lastT = performance.now();
  const tick = (t) => {
    const dt = Math.min(100, t - lastT);  // 封顶100ms，防后台标签恢复后跳一大段
    lastT = t;
    if (_cinematicHoldScroll === null) {  // 全屏定格期间暂停等待
      const y = window.pageYOffset || document.documentElement.scrollTop;
      const next = Math.max(0, Math.min(state.maxScroll, y + speedPerMs * dt));
      _instantScroll(next);
      if (next >= state.maxScroll) { stopAutoScroll(); return; }
    }
    _autoRaf = requestAnimationFrame(tick);
  };
  _autoRaf = requestAnimationFrame(tick);
  updateAutoBtn();
}
function stopAutoScroll() {
  if (_autoRaf) { cancelAnimationFrame(_autoRaf); _autoRaf = null; }
  updateAutoBtn();
}
function updateAutoBtn() {
  if (autoplayBtn) {
    autoplayBtn.innerHTML = _autoRaf ? icon('pause') + ' 停止' : icon('play') + ' 自动行军';
    autoplayBtn.setAttribute('aria-pressed', _autoRaf ? 'true' : 'false');
  }
}
function toggleAutoScroll() {
  if (_autoRaf) { stopAutoScroll(); return; }
  const y = window.pageYOffset || document.documentElement.scrollTop;
  if (state.maxScroll > 0 && y >= state.maxScroll - 2) _instantScroll(0);  // 已到末尾则从头再来
  startAutoScroll();
}

/* ---------- 文物详情弹窗 ---------- */
const relicModal = $('#cz-relic-modal');
const relicSvgBox = $('#cz-relic-svg');
const relicNameEl = $('#cz-relic-name');
const relicStoryEl = $('#cz-relic-story');
const relicStationEl = $('#cz-relic-station');
function openRelicDetail(stationId) {
  const s = STATIONS[stationId - 1];
  const relic = RELIC_MAP[s && s.id];
  if (!s || !relic || !relicModal) return;
  if (relicSvgBox) relicSvgBox.innerHTML = relic.svg;
  if (relicNameEl) relicNameEl.textContent = relic.name;
  if (relicStoryEl) relicStoryEl.textContent = relic.story;
  if (relicStationEl) relicStationEl.textContent = `${s.name} · ${s.date} · 已走 ${s.miles} 里`;
  relicModal.classList.add('show');
  lockBody();
  const closeBtn = $('#cz-relic-close');
  trapFocus(relicModal, {
    initialFocus: closeBtn,
    onClose: closeRelic
  });
}
function closeRelic() {
  // 仅当文物弹窗确实打开时才解锁，避免 Escape 误触发把滚动锁计数减穿
  if (!relicModal || !relicModal.classList.contains('show')) return;
  releaseFocus();
  relicModal.classList.remove('show');
  unlockBody();
}

/* ---------- 终点成就：走完全程 → 长征纪念卡 ---------- */
const completeOverlay = $('#cz-complete');
let _completeShown = false;
function showComplete() {
  if (!completeOverlay) return;
  completeOverlay.classList.add('show');
  completeOverlay.setAttribute('aria-hidden', 'false');
  lockBody();
  const completeBtn = $('#cz-complete-btn');
  trapFocus(completeOverlay, {
    initialFocus: completeBtn,
    onClose: closeComplete
  });
}
function closeComplete() {
  if (!completeOverlay || !completeOverlay.classList.contains('show')) return;
  releaseFocus();
  completeOverlay.classList.remove('show');
  completeOverlay.setAttribute('aria-hidden', 'true');
  unlockBody();
}

/* ---------- 长征纪念卡：专属弹窗 ---------- */
const CZ_CARD_BGS = [
  { label: '延安', src: 'images/longmarch/yanan.jpg' },
  { label: '瑞金', src: 'images/longmarch/ruijin.jpg' },
  { label: '遵义', src: 'images/longmarch/zunyi.jpg' },
  { label: '泸定桥', src: 'images/longmarch/luding.jpg' },
  { label: '雪山', src: 'images/longmarch/jiajinshan.jpg' },
  { label: '草地', src: 'images/longmarch/caodi.jpg' },
  { label: '湘江', src: 'images/longmarch/xiangjiang.jpg' },
  { label: '会宁', src: 'images/longmarch/huining.jpg' },
];
// 精神词列表复用 cardgen 的 SPIRITS（单一来源，避免两处漂移）
const CZ_CARD_SPIRITS = Array.isArray(CZ_SPIRITS) ? CZ_SPIRITS : ['建党', '红船', '井冈山', '长征', '延安', '西柏坡', '抗战', '红岩', '红旗渠', '两弹一星', '苏区', '雷锋精神'];
const czCardModal = $('#cz-card-modal');
const czCardBgs = $('#cz-card-bgs');
const czCardSpirits = $('#cz-card-spirits');
const czCardName = $('#cz-card-name');
const czCardPreview = $('#cz-card-preview');
const czCardPreviewImg = $('#cz-card-preview-img');
const czCardSavehint = $('#cz-card-savehint');
let _czCardBg = 0;
let _czCardSpirit = 0;
let _czCardDataUrl = null;

function buildCardModal() {
  if (!czCardBgs || !czCardSpirits) return;
  if (czCardBgs.children.length > 0) {
    // 已构建过：保留用户已选的背景/精神高亮
    czCardBgs.querySelectorAll('.cz-card-bg').forEach(x => x.classList.toggle('selected', parseInt(x.dataset.i, 10) === _czCardBg));
    czCardSpirits.querySelectorAll('.cz-card-chip').forEach(x => x.classList.toggle('selected', parseInt(x.dataset.i, 10) === _czCardSpirit));
    return;
  }
  const bp = getBasePath();
  czCardBgs.innerHTML = CZ_CARD_BGS.map((b, i) =>
    `<div class="cz-card-bg${i === 0 ? ' selected' : ''}" data-i="${i}" data-src="${escapeAttr(bp + b.src)}"><span>${b.label}</span></div>`
  ).join('');
  czCardBgs.querySelectorAll('.cz-card-bg').forEach(el => {
    const src = el.dataset.src;
    if (src) el.style.backgroundImage = 'url(' + src + ')';
    el.addEventListener('click', () => {
      _czCardBg = parseInt(el.dataset.i, 10);
      czCardBgs.querySelectorAll('.cz-card-bg').forEach(x => x.classList.toggle('selected', x === el));
    });
  });
  czCardSpirits.innerHTML = CZ_CARD_SPIRITS.map((s, i) =>
    `<button type="button" class="cz-card-chip${i === 0 ? ' selected' : ''}" data-i="${i}">${s}</button>`
  ).join('');
  czCardSpirits.querySelectorAll('.cz-card-chip').forEach(el => {
    el.addEventListener('click', () => {
      _czCardSpirit = parseInt(el.dataset.i, 10);
      czCardSpirits.querySelectorAll('.cz-card-chip').forEach(x => x.classList.toggle('selected', x === el));
    });
  });
}
function openCardModal() {
  if (!czCardModal) return;
  buildCardModal();
  czCardModal.classList.add('open');
  lockBody();
  trapFocus(czCardModal, {
    initialFocus: czCardName,
    onClose: closeCardModal
  });
}
function closeCardModal() {
  if (!czCardModal || !czCardModal.classList.contains('open')) return;
  releaseFocus();
  czCardModal.classList.remove('open');
  unlockBody();
  _czCardDataUrl = null; // 复位，避免重开后直接导出上一张旧卡面
}
function generateLongMarchCard() {
  const genBtn = $('#cz-card-gen');
  if (genBtn && genBtn.disabled) return;
  if (genBtn) { genBtn.disabled = true; genBtn.innerHTML = '正在盖章…'; }
  const resetBtn = () => { if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = icon('sparkle') + ' 生成纪念卡'; } };
  const name = (czCardName && czCardName.value.trim()) || '同学';
  const spirit = CZ_CARD_SPIRITS[_czCardSpirit] || '长征';
  const bg = CZ_CARD_BGS[_czCardBg] || CZ_CARD_BGS[0];
  if (typeof czRenderCard !== 'function') {
    resetBtn();
    showToast('纪念卡模块未加载');
    return;
  }
  const img = new Image();
  // 背景图挂起时 8 秒超时复位按钮，避免长期禁用
  const failTimer = setTimeout(() => {
    if (genBtn && genBtn.disabled) { resetBtn(); showToast('背景图加载超时，请重试'); }
  }, 8000);
  img.onload = () => {
    clearTimeout(failTimer);
    try {
      _czCardDataUrl = czRenderCard(img, spirit, name, '二万五千里 · 走完全程');
    } catch (e) {
      _czCardDataUrl = null;
      resetBtn();
      showToast('生成失败，请重试');
      return;
    }
    if (czCardPreview && czCardPreviewImg) {
      czCardPreviewImg.src = _czCardDataUrl;
      czCardPreview.classList.remove('is-hidden');
    }
    if (czCardSavehint) {
      const showHint = isTouchDevice() && window.innerWidth < 900;
      czCardSavehint.classList.toggle('is-hidden', !showHint);
    }
    resetBtn();
  };
  img.onerror = () => { clearTimeout(failTimer); _czCardDataUrl = null; resetBtn(); showToast('背景图加载失败'); };
  img.src = getBasePath() + bg.src;
}
function downloadLongMarchCard() {
  if (!_czCardDataUrl || typeof czDataUrlToBlob !== 'function') return;
  const blob = czDataUrlToBlob(_czCardDataUrl);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = '长征纪念卡_' + Date.now() + '.png';
  a.href = url;
  document.body.appendChild(a);
  a.addEventListener('click', ev => ev.stopPropagation());
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function shareLongMarchCard() {
  if (!_czCardDataUrl || typeof czDataUrlToBlob !== 'function') return;
  const blob = czDataUrlToBlob(_czCardDataUrl);
  if (!blob) return;
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], '长征纪念卡.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: '长征纪念卡', text: '我走完了二万五千里长征' }).catch(() => { });
      return;
    }
  }
  downloadLongMarchCard();
}

/* 接线：音景开关 + 文物弹窗关闭 + 笺纸文物点击（事件委托） */
function initImmersiveUI() {
  if (soundToggle) soundToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleSound(); });
  if (autoplayBtn) autoplayBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleAutoScroll(); });
  // 用户手动滚动 / 触摸 / 方向键 → 立即接管自动行军
  ['wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (_autoRaf) stopAutoScroll(); }, { passive: true }));
  window.addEventListener('keydown', (e) => {
    if (_autoRaf && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) stopAutoScroll();
  });
  const relicClose = $('#cz-relic-close');
  if (relicClose) relicClose.addEventListener('click', closeRelic);
  if (relicModal) relicModal.addEventListener('click', (e) => { if (e.target === relicModal) closeRelic(); });
  // Escape：按"最上层弹窗优先"关闭，避免误关下层弹窗并破坏 body 滚动锁计数
  // 已与 focus-trap.js 协作：focus-trap 处理 Escape 时会 preventDefault，此处跳过已处理事件
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (czCardModal && czCardModal.classList.contains('open')) { closeCardModal(); return; }
    if (completeOverlay && completeOverlay.classList.contains('show')) { closeComplete(); return; }
    closeRelic();
  });
  // 终点成就：领取长征纪念卡（打开专属弹窗）/ 关闭
  const completeBtn = $('#cz-complete-btn');
  if (completeBtn) completeBtn.addEventListener('click', (e) => { e.stopPropagation(); openCardModal(); });
  const completeClose = $('#cz-complete-close');
  if (completeClose) completeClose.addEventListener('click', closeComplete);
  if (completeOverlay) completeOverlay.addEventListener('click', (e) => { if (e.target === completeOverlay) closeComplete(); });
  // 长征纪念卡弹窗：关闭 / 生成 / 下载 / 分享
  const czCardClose = $('#cz-card-close');
  if (czCardClose) czCardClose.addEventListener('click', closeCardModal);
  if (czCardModal) czCardModal.addEventListener('click', (e) => { if (e.target === czCardModal) closeCardModal(); });
  const czCardGen = $('#cz-card-gen');
  if (czCardGen) czCardGen.addEventListener('click', generateLongMarchCard);
  const czCardDownload = $('#cz-card-download');
  if (czCardDownload) czCardDownload.addEventListener('click', downloadLongMarchCard);
  const czCardShare = $('#cz-card-share');
  if (czCardShare) czCardShare.addEventListener('click', shareLongMarchCard);
  if (handrollCont) {
    handrollCont.addEventListener('click', (e) => {
      const relicEl = e.target.closest('.cz-note-relic');
      if (!relicEl) return;
      const note = relicEl.closest('.cz-note');
      const sid = note ? parseInt(note.dataset.stationId, 10) : 0;
      if (sid) openRelicDetail(sid);
    });
  }
}

function setActive(id) {
  state.activeStationId = id;
  const s = STATIONS[id - 1]; // 数组索引 = id-1，避免 find 遍历
  if (!s) return;

  // 印章 active（缓存数组遍历）
  const stampEls = state._stampEls;
  for (let i = 0; i < stampEls.length; i++) {
    const el = stampEls[i];
    if (i + 1 === id) el.classList.add('active');
    else el.classList.remove('active');
  }

  // 笺纸 dropped（缓存数组遍历；世代标记取消过期定时器，快进回滚不串状态）
  const dropGen = ++_dropGen;
  const noteEls = state._noteEls;
  for (let i = 0; i < noteEls.length; i++) {
    const el = noteEls[i];
    const sid = i + 1;
    if (sid <= id) {
      if (!el.classList.contains('dropped')) {
        const delay = Math.max(0, (id - sid)) * 18;
        setTimeout(() => { if (_dropGen === dropGen) el.classList.add('dropped'); }, delay);
      }
    } else {
      if (el.classList.contains('dropped')) el.classList.remove('dropped');
    }
  }

  // HUD
  if (hudIndex) hudIndex.textContent = `第 ${s.id} / ${STATIONS.length} 站`;
  if (hudStation) hudStation.textContent = s.name;
  if (hudYear) hudYear.textContent = s.date;

  // mood 切换(背景氛围色 + Canvas 气候粒子类型)
  setMood(s.mood);
  if (typeof state._setAtmoMood === 'function') state._setAtmoMood(s.mood);

  // 沉浸增强：诗词浮现 + 环境音景
  showPoem(s.id);
  updateSoundscape(s.mood);

  // 真实场景照片背景层
  const photo = STATION_PHOTOS[s.id];
  setPhoto(photo);

  // 到达延安 → 终点成就（取代小剧场，直接进入大场面）
  if (s.id === 17 && !_completeShown) {
    _completeShown = true;
    _shownTheater.add(17);  // 成就取代站17小剧场，标记已播，回滚不补播
    showComplete();
  } else if (_firstStationDone && !_shownTheater.has(s.id)) {
    // 每站小剧场：先让笺纸卡片落定，再切入该站实景 + 专属天气（每站只播一次，回滚不重放）
    _shownTheater.add(s.id);
    const sid = s.id;
    clearTimeout(_theaterTimer);
    _theaterTimer = setTimeout(() => {
      // 若用户已滑到别的站则不播
      if (state.activeStationId !== sid) return;
      _cinematicHoldScroll = window.pageYOffset || document.documentElement.scrollTop;
      showTheater(sid);
    }, 1000);
  }
}

/* 切换背景照片层 */
function setPhoto(photo) {
  if (!bgPhoto) return;
  if (photo) {
    bgPhoto.style.backgroundImage = `url(${getBasePath()}images/longmarch/${photo})`;
    bgPhoto.classList.add('active');
  } else {
    bgPhoto.classList.remove('active');
  }
}

/* 通用工具：瞬时滚动（兼容旧浏览器 + CSS scroll-behavior:smooth 冲突） */
function _instantScroll(y) {
  try { window.scrollTo({ top: y, behavior: 'instant' }); }
  catch (e) { window.scrollTo(0, y); }
}
/* 弹窗 body 滚动锁计数（多弹窗叠加时避免互相解锁） */
let _bodyScrollLock = 0;
function lockBody() { _bodyScrollLock++; document.body.style.overflow = 'hidden'; }
function unlockBody() { _bodyScrollLock = Math.max(0, _bodyScrollLock - 1); if (_bodyScrollLock === 0) document.body.style.overflow = ''; }
/* 笺纸 dropped 世代标记（快速回滚时取消过期定时器） */
let _dropGen = 0;
/* 诗词每站只浮现一次 */
const _poemShown = new Set();

/* 每站小剧场：到站切入该站实景 + 专属天气 + 氛围 */
let _theaterTimer = null;
let _theaterHideTimer = null;
let _cinematicHoldScroll = null;  // 小剧场期间锁定的滚动位置（防卷轴跟着滚走）
const _shownTheater = new Set();  // 已播过小剧场的站（回滚不重放）
let _firstStationDone = false;
let _theaterRaf = null;
const theaterOverlay = $('#cz-theater');
const theaterPhoto = $('#cz-theater-photo');
const theaterName = $('#cz-theater-name');
const theaterDate = $('#cz-theater-date');
const theaterWeatherCv = $('#cz-theater-weather');
/* 手绘山水场景为静态 HTML（czScrollScene），由 CSS 驱动，无需 JS 注入 */

function showTheater(id) {
  const s = STATIONS[id - 1];
  if (!s || !theaterOverlay) {
    _cinematicHoldScroll = null;  // 早退也复位，避免锁死滚动
    return;
  }
  const photo = STATION_PHOTOS[s.id];
  if (photo && theaterPhoto) theaterPhoto.style.backgroundImage = `url(${getBasePath()}images/longmarch/${photo})`;
  if (theaterName) theaterName.textContent = s.name;
  if (theaterDate) theaterDate.textContent = s.date + ' · 已走 ' + (s.miles || 0).toLocaleString() + ' 里';
  theaterOverlay.classList.toggle('fog-on', s.mood === 'swamp');
  theaterOverlay.classList.toggle('flash-on', s.mood === 'blood');  // 血战站雷暴电闪
  startTheaterWeather(s.mood);
  theaterOverlay.classList.add('show');
  theaterOverlay.setAttribute('aria-hidden', 'false');
  clearTimeout(_theaterHideTimer);
  _theaterHideTimer = setTimeout(() => {
    _cinematicHoldScroll = null;  // 收场：恢复滚动
    theaterOverlay.classList.remove('show');
    theaterOverlay.setAttribute('aria-hidden', 'true');
    stopTheaterWeather();
  }, 1000);
}

/* 小剧场天气：Canvas 粒子（血色雨+火光余烬+硝烟 / 风雪 / 星火 / 金光 / 阴雾细雨） */
function startTheaterWeather(mood) {
  const cv = theaterWeatherCv;
  if (!cv) return;
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  const ctx = cv.getContext('2d');
  const type = (mood === 'blood') ? 'bloodrain' : (mood === 'snow') ? 'snow' : (mood === 'gold') ? 'gold' : (mood === 'swamp') ? 'fog' : 'embers';
  const parts = [];
  const add = (t, n) => { for (let i = 0; i < n; i++) parts.push(_makeWPart(t)); };
  if (type === 'snow') add('snow', 130);
  else if (type === 'bloodrain') { add('bloodrain', 90); add('embers', 50); add('smoke', 14); }
  else if (type === 'embers') add('embers', 60);
  else if (type === 'gold') add('gold', 60);
  // swamp 的雾气由 CSS .cz-theater-fog 层实现；canvas 无 fog 更新/绘制分支，
  // 不再创建每帧空跑的不渲染死粒子
  cancelAnimationFrame(_theaterRaf);
  const draw = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i]._t;
      _drawWPart(ctx, parts[i], cv.width, cv.height, t);
      _updateWPart(parts[i], t);
    }
    _theaterRaf = requestAnimationFrame(draw);
  };
  _theaterRaf = requestAnimationFrame(draw);
}
function stopTheaterWeather() {
  cancelAnimationFrame(_theaterRaf);
  _theaterRaf = null;
}
function _makeWPart(type) {
  const p = { x: Math.random(), y: Math.random(), phase: Math.random() * Math.PI * 2, r: 1.5, spd: 0.01, len: 0.02, w: 2, _t: type };
  if (type === 'bloodrain') { p.len = 0.018 + Math.random() * 0.03; p.spd = 0.03 + Math.random() * 0.05; p.w = 1.5 + Math.random() * 1.5; }
  else if (type === 'snow') { p.r = 1.5 + Math.random() * 3; p.spd = 0.006 + Math.random() * 0.014; p.sway = 0.5 + Math.random(); }
  else if (type === 'embers') { p.r = 1 + Math.random() * 2.5; p.spd = 0.004 + Math.random() * 0.01; p.sway = 0.3 + Math.random() * 0.8; }
  else if (type === 'gold') { p.r = 0.8 + Math.random() * 2; p.spd = 0.003 + Math.random() * 0.008; p.sway = 0.4 + Math.random(); }
  else if (type === 'smoke') { p.r = 8 + Math.random() * 16; p.spd = 0.002 + Math.random() * 0.004; p.sway = 0.4 + Math.random() * 0.6; p.op = 0.12 + Math.random() * 0.18; }
  return p;
}
function _updateWPart(p, type) {
  if (type === 'bloodrain') {
    p.x += 0.005; p.y += p.spd;
    if (p.y > 1) { p.y = -0.03; p.x = Math.random(); }
    if (p.x > 1) p.x = -0.02;
  } else if (type === 'snow') {
    p.phase += 0.03; p.x += Math.sin(p.phase) * p.sway * 0.002; p.y += p.spd;
    if (p.y > 1) { p.y = -0.02; p.x = Math.random(); }
  } else if (type === 'embers' || type === 'gold') {
    p.phase += (type === 'embers' ? 0.04 : 0.02);
    p.x += Math.sin(p.phase) * p.sway * 0.002; p.y -= p.spd;
    if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
  } else if (type === 'smoke') {
    p.phase += 0.015; p.x += Math.sin(p.phase) * p.sway * 0.0012; p.y -= p.spd; p.r += 0.02;
    if (p.y < -0.05 || p.r > 60) { p.y = 1.02; p.x = Math.random(); p.r = 8 + Math.random() * 16; }
  }
}
function _drawWPart(ctx, p, w, h, type) {
  const X = p.x * w, Y = p.y * h;
  if (type === 'bloodrain') {
    ctx.strokeStyle = 'rgba(200, 30, 20, 0.5)';
    ctx.lineWidth = p.w;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - p.len * w * 0.05, Y + p.len * h); ctx.stroke();
  } else if (type === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(X, Y, p.r, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'embers') {
    ctx.fillStyle = 'rgba(255,150,70,0.8)';
    ctx.beginPath(); ctx.arc(X, Y, p.r, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'gold') {
    ctx.fillStyle = 'rgba(255,215,110,0.7)';
    ctx.beginPath(); ctx.arc(X, Y, p.r, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'smoke') {
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, p.r);
    g.addColorStop(0, `rgba(45,32,25,${p.op})`);
    g.addColorStop(1, 'rgba(45,32,25,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(X, Y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

/* 切换背景 mood 层（用缓存集合，不再每次 querySelector） */
function setMood(mood) {
  const map = state._moodEls;
  if (!map || Object.keys(map).length === 0) {
    if (!bgLayer) return;
    map.ember = bgLayer.querySelector('.cz-bg-mood-ember');
    map.blood = bgLayer.querySelector('.cz-bg-mood-blood');
    map.snow = bgLayer.querySelector('.cz-bg-mood-snow');
    map.swamp = bgLayer.querySelector('.cz-bg-mood-swamp');
    map.gold = bgLayer.querySelector('.cz-bg-mood-gold');
  }
  for (const k of Object.keys(map)) {
    const el = map[k];
    if (!el) continue;
    if (k === mood) el.classList.add('active');
    else el.classList.remove('active');
  }
}

/* ---------- 构建右上迷你地图: SVG路径+17站点圆点 ---------- */
function buildMiniRoute() {
  if (!routeTrack || !routeFill || !routeDots) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  // 600x360 viewBox, 留 padding
  const PAD = 38;
  const W = 600 - PAD * 2;
  const H = 360 - PAD * 2;
  const n = STATIONS.length;

  // 把站点投影到 600x360（x均匀分布, y 按 s.y 百分比, 再加点随机微扰让路径自然）
  const pts = STATIONS.map((s, i) => {
    const t = i / (n - 1);  // 0~1
    // 给 y 加轻微的正弦扰动, 让图更好看
    const wave = Math.sin(t * Math.PI * 1.7) * 12 + ((i * 37) % 17) - 8;
    return {
      x: PAD + t * W,
      y: PAD + (s.y / 100) * H + wave * 0.35
    };
  });
  // 保存投影后的点，供 marker 定位用
  state._miniPts = pts;

  // 路径(平滑贝塞尔)
  const d = buildSmoothPath(pts);
  routeTrack.setAttribute('d', d);
  routeFill.setAttribute('d', d);

  // 估算路径总长，用于 stroke-dasharray 控制进度
  let approxLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    approxLen += Math.sqrt(dx * dx + dy * dy);
  }
  approxLen = approxLen * 1.12;
  state._miniRouteLen = approxLen;
  routeFill.setAttribute('stroke-dasharray', `${approxLen} ${approxLen + 200}`);
  routeFill.setAttribute('stroke-dashoffset', approxLen);

  // 17个站点圆点(点击跳转)
  routeDots.innerHTML = '';
  state._miniDotEls.length = 0;
  pts.forEach((p, i) => {
    const s = STATIONS[i];
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', 'cz-route-dot');
    g.setAttribute('data-station-id', s.id);
    g.setAttribute('transform', `translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
    g.style.cursor = 'pointer';

    // 原生 tooltip：站名 · 日期 · 里程
    const tip = document.createElementNS(svgNS, 'title');
    tip.textContent = `${s.name} · ${s.date} · ${s.miles}里`;
    g.appendChild(tip);

    const halo = document.createElementNS(svgNS, 'circle');
    halo.setAttribute('class', 'cz-route-dot-halo');
    halo.setAttribute('r', 11);
    halo.setAttribute('fill', 'rgba(255, 215, 110, 0.0)');
    halo.setAttribute('stroke', 'rgba(255, 215, 110, 0.35)');
    halo.setAttribute('stroke-width', 1.5);
    g.appendChild(halo);

    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('r', 6);
    c.setAttribute('class', 'cz-route-dot-core');
    c.setAttribute('fill', '#3a1007');
    c.setAttribute('stroke', '#ffd76e');
    c.setAttribute('stroke-width', 1.8);
    g.appendChild(c);

    // 标签（偶数站上，奇数站下）——只给关键站标名，避免 17 个名字在 200-300px 小卡片上糊成一团
    const KEY_STATIONS = [1, 7, 11, 16, 17];
    if (KEY_STATIONS.includes(s.id)) {
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', 0);
      label.setAttribute('y', (i % 2 === 0 ? -13 : 20));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-family', "'STKaiti','KaiTi','FangSong',serif");
      label.setAttribute('font-size', 20);
      label.setAttribute('fill', '#f8df9c');
      label.setAttribute('opacity', 0.9);
      label.textContent = s.name;
      g.appendChild(label);
    }

    g.addEventListener('click', () => scrollToStation(s.id));
    routeDots.appendChild(g);
    state._miniDotEls.push(g);
  });
}

function scrollToStation(id) {
  // 手动跳转站台时立即接管自动行军，避免 rAF 逐帧把目标跳转覆盖回去
  stopAutoScroll();
  const sx = state._stampXs[id - 1];
  if (sx === undefined || !state.maxTranslateX) return;
  // 想让 sx 落在手卷窗口中心 = translateX = state.viewportW/2 - sx
  // 但 translateX 取值范围 [-state.maxTranslateX, 0]
  const targetX = Math.max(-state.maxTranslateX, Math.min(0, state.viewportW / 2 - sx));
  const targetProgress = Math.abs(targetX) / state.maxTranslateX;
  const targetScroll = targetProgress * state.maxScroll;
  // 尊重 prefers-reduced-motion，避免动效敏感用户被连续平滑滚动拉扯
  window.scrollTo({ top: targetScroll, behavior: _reduceMotion ? 'auto' : 'smooth' });
}

/* ---------- Canvas 气候粒子系统：5 种粒子按 mood 切换 ---------- */
function initAtmosphere() {
  if (_reduceMotion) return;
  const c = document.getElementById('cz-atmos');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, dpr;
  const parts = [];
  const small = window.innerWidth < 768;
  const isHiDpr = (window.devicePixelRatio || 1) >= 2;
  const N_EMBER = small ? (isHiDpr ? 22 : 32) : (isHiDpr ? 52 : 72);
  const N_SNOW = small ? (isHiDpr ? 45 : 65) : (isHiDpr ? 85 : 115);
  const N_BLOOD = small ? (isHiDpr ? 10 : 15) : (isHiDpr ? 15 : 20);
  const N_BUBBLE = small ? (isHiDpr ? 16 : 22) : (isHiDpr ? 28 : 40);
  const N_GOLD = small ? (isHiDpr ? 28 : 40) : (isHiDpr ? 55 : 80);
  let curMood = null;
  let curCount = 0;
  let curSpawn = null;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ========== 粒子生成器 ==========
  const spawners = {
    ember: () => ({
      type: 'ember',
      x: Math.random() * W,
      y: H + Math.random() * 40,
      vx: -0.3 + Math.random() * 0.6,
      vy: -0.5 - Math.random() * 1.1,
      r: 1 + Math.random() * 2.6,
      life: 0,
      maxLife: 4000 + Math.random() * 5000,
      hue: 10 + Math.random() * 38,
      flick: Math.random() * Math.PI * 2
    }),
    snow: () => ({
      type: 'snow',
      x: Math.random() * W,
      y: -10 - Math.random() * 40,
      vx: -0.6 + Math.random() * 1.2,
      vy: 0.4 + Math.random() * 1.1,
      r: 0.9 + Math.random() * 2.6,
      life: 0,
      maxLife: 6000 + Math.random() * 6000,
      drift: Math.random() * Math.PI * 2,
      driftSp: 0.001 + Math.random() * 0.002
    }),
    blood: () => ({
      type: 'blood',
      x: Math.random() * W,
      y: -10 - Math.random() * 60,
      vx: -0.15 + Math.random() * 0.3,
      vy: 0.7 + Math.random() * 1.4,
      r: 0.7 + Math.random() * 1.8,
      life: 0,
      maxLife: 5000 + Math.random() * 4000
    }),
    swamp: () => ({
      type: 'bubble',
      x: Math.random() * W,
      y: H + Math.random() * 60,
      vx: -0.2 + Math.random() * 0.4,
      vy: -0.3 - Math.random() * 0.7,
      r: 1.5 + Math.random() * 4.5,
      life: 0,
      maxLife: 5500 + Math.random() * 5500,
      wob: Math.random() * Math.PI * 2
    }),
    gold: () => ({
      type: 'gold',
      x: Math.random() * W,
      y: H + Math.random() * 40,
      vx: -0.4 + Math.random() * 0.8,
      vy: -0.6 - Math.random() * 1.4,
      r: 0.8 + Math.random() * 2.4,
      life: 0,
      maxLife: 4500 + Math.random() * 5500,
      spin: Math.random() * Math.PI * 2,
      sparkle: Math.random() * Math.PI * 2
    })
  };

  function setMoodConfig(mood) {
    if (mood === curMood) return;
    curMood = mood;
    if (mood === 'ember') { curCount = N_EMBER; curSpawn = spawners.ember; }
    else if (mood === 'blood') { curCount = N_BLOOD; curSpawn = spawners.blood; }
    else if (mood === 'snow') { curCount = N_SNOW; curSpawn = spawners.snow; }
    else if (mood === 'swamp') { curCount = N_BUBBLE; curSpawn = spawners.swamp; }
    else if (mood === 'gold') { curCount = N_GOLD; curSpawn = spawners.gold; }
    else { curCount = N_EMBER; curSpawn = spawners.ember; }
    // 整体重建粒子池：旧类型粒子不残留（否则切 mood 后雪花/余烬残留数秒）
    parts.length = 0;
    for (let i = 0; i < curCount; i++) parts.push(curSpawn());
  }
  state._setAtmoMood = setMoodConfig;
  setMoodConfig('ember');

  // ========== 渲染循环 ==========
  let lastT = performance.now();
  let atmosRafId = 0;
  let paused = false;

  function resume() {
    if (!paused) return;
    paused = false;
    lastT = performance.now();
    if (atmosRafId) cancelAnimationFrame(atmosRafId);
    atmosRafId = requestAnimationFrame(loop);
  }
  function pause() {
    paused = true;
    if (atmosRafId) cancelAnimationFrame(atmosRafId);
    atmosRafId = 0;
    ctx.clearRect(0, 0, W, H);
  }

  function loop(t) {
    atmosRafId = requestAnimationFrame(loop);
    const dt = Math.min(60, t - lastT); lastT = t;
    if (document.hidden) { pause(); return; }
    const idleMs = t - (state._lastActiveT || 0);
    if (idleMs > 4500 && parts.length) {
      pause();
      return;
    }
    ctx.clearRect(0, 0, W, H);

    // 按粒子类型走独立分支（优化：避免每粒子 5 次 if 判断）
    const spawnFn = curSpawn;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      let dead = false;
      if (p.type === 'ember') {
        p.flick += dt * 0.01;
        p.x += p.vx;
        p.y += p.vy - 0.15 * Math.sin(p.flick);
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
          grad.addColorStop(0, `hsla(${p.hue},100%,75%,${alpha * 0.95})`);
          grad.addColorStop(0.35, `hsla(${p.hue},100%,55%,${alpha * 0.45})`);
          grad.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y < -10) dead = true;
      } else if (p.type === 'snow') {
        p.drift += dt * p.driftSp;
        p.x += p.vx + Math.sin(p.drift) * 0.55;
        p.y += p.vy;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          ctx.fillStyle = `hsla(210,100%,96%,${alpha * 0.92})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(205,100%,88%,${alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y > H + 15) dead = true;
      } else if (p.type === 'blood') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.0025 * dt;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          ctx.fillStyle = `hsla(0,88%,32%,${alpha * 0.92})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(0,70%,22%,${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(p.x + 0.8, p.y + 0.6, p.r * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y > H + 15) dead = true;
      } else if (p.type === 'bubble') {
        p.wob += dt * 0.002;
        p.x += p.vx + Math.sin(p.wob) * 0.35;
        p.y += p.vy;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          const a1 = alpha * 0.8;
          const a2 = alpha * 0.18;
          ctx.strokeStyle = `hsla(98,45%,68%,${a1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `hsla(98,55%,78%,${a2})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(98,70%,90%,${a1})`;
          ctx.beginPath();
          ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, Math.max(0.5, p.r * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y < -15) dead = true;
      } else if (p.type === 'gold') {
        p.spin += dt * 0.006;
        p.sparkle += dt * 0.005;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          const a1 = alpha * 0.95;
          const a2 = alpha * 0.45;
          const sparkM = 0.65 + 0.35 * Math.sin(p.sparkle);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          grad.addColorStop(0, `hsla(48,100%,82%,${alpha * 0.9})`);
          grad.addColorStop(0.4, `hsla(46,100%,62%,${a2})`);
          grad.addColorStop(1, `hsla(44,100%,55%,0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(52,100%,${Math.round(70 + sparkM * 22)}%,${a1})`;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          const s = p.r * 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.28, -s * 0.28);
          ctx.lineTo(s, 0);
          ctx.lineTo(s * 0.28, s * 0.28);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.28, s * 0.28);
          ctx.lineTo(-s, 0);
          ctx.lineTo(-s * 0.28, -s * 0.28);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        if (p.life > p.maxLife || p.y < -10) dead = true;
      }
      if (dead) {
        if (spawnFn) parts[i] = spawnFn();
        else { parts[i] = parts[parts.length - 1]; parts.pop(); }
      }
    }
  }
  atmosRafId = requestAnimationFrame(loop);
  state._lastActiveT = performance.now();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else { resume(); state._lastActiveT = performance.now(); }
  });
  const wake = () => { state._lastActiveT = performance.now(); if (paused) resume(); };
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('wheel', wake, { passive: true });
}

/* ---------- 初始化 ---------- */
async function init() {
  if (!main) return;
  await resolveVenueLinks();
  layout();
  initImmersiveUI();
  // 滚动驱动：scroll 事件 + RAF 节流
  let ticking = false;
  const onScrollRaf = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { try { onScroll(); } finally { ticking = false; } }); } };
  window.addEventListener('scroll', onScrollRaf, { passive: true });

  // 键盘导航：Left/Right 切换站点
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // 忽略输入框内的按键
      const tag = (document.activeElement || {}).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      const cur = state.activeStationId || 1;
      const next = e.key === 'ArrowLeft' ? Math.max(1, cur - 1) : Math.min(STATIONS.length, cur + 1);
      if (next !== cur) scrollToStation(next);
    }
  });

  let resizing;
  window.addEventListener('resize', () => {
    clearTimeout(resizing);
    resizing = setTimeout(layout, 180);
  });

  // 初始展开第一站
  setActive(1);
  _firstStationDone = true;  // 首站（加载即达）不播小剧场

  // 粒子特效
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initAtmosphere, 100);
  } else {
    window.addEventListener('load', initAtmosphere, { once: true });
  }

  // 每隔一段时间自动飘点尘埃（增加空气流动的真实感）
  setInterval(() => {
    if (_reduceMotion || document.hidden) return;
    if (Math.random() < 0.55) spawnDust(1 + Math.floor(Math.random() * 2));
  }, 1500);
}

export { init };
