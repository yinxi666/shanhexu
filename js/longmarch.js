/* ============================================================
 *  重走长征 · 物理手卷展开模式 A
 *  核心：用户纵向scroll → 横向手卷 translateX 展开
 *  双卷轴木杆旋转 + 17站朱砂印章 + 飘落笺纸 + mood切换
 * ============================================================ */
import * as RedData from './data.js?v=2026081310';
import { getBasePath } from './utils.js?v=2026081310';
import { $ } from './ui.js?v=2026081310';
import { icon } from './icons.js?v=2026081310';

/* ---------- 17站长征关键节点 ---------- */
import { STATIONS, TOTAL_MILES, STATION_PHOTOS, VENUE_LOOKUP, buildSmoothPath } from './cz-stations.js?v=2026081310';
import { RELIC_MAP, POEM_MOMENTS } from './cz-content.js?v=2026081310';
import * as czSound from './cz-sound.js?v=2026081310';
import { stampSvg } from './cz-stamps.js?v=2026081310';
import { openCardModal, closeCardModal, isCardModalOpen, initCardModalUI } from './cz-card-modal.js?v=2026081310';
import { openRelicDetail, closeRelic, showComplete, closeComplete, isRelicOpen, isCompleteOpen, initModalsUI } from './cz-modals.js?v=2026081310';
import { showTheater, theaterLock } from './cz-theater.js?v=2026081310';
import { initAtmosphere } from './cz-atmosphere.js?v=2026081310';

/* 共享 reduced-motion 检测（动态响应系统设置变化）。
   兼容旧浏览器：MediaQueryList.addEventListener 是 Safari 14 才引入，
   Safari 13.1 只有 addListener——此处为模块顶层，未守卫会拖垮整站模块图，
   故用特性检测 + 旧 API 回退 */
const _reduceMotionMQ = matchMedia('(prefers-reduced-motion: reduce)');
let _reduceMotion = _reduceMotionMQ.matches;
if (typeof _reduceMotionMQ.addEventListener === 'function') {
  _reduceMotionMQ.addEventListener('change', e => { _reduceMotion = e.matches; });
} else if (typeof _reduceMotionMQ.addListener === 'function') {
  _reduceMotionMQ.addListener(e => { _reduceMotion = e.matches; });
}

async function resolveVenueLinks() {
  // 默认：站内无对应场馆 → 不显示「探访」按钮（_venueHref 仅在命中后赋值，未命中值无消费方）
  STATIONS.forEach(s => { s._venueResolved = false; });
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

/* 场馆链接异步解析完成后，把"探访"按钮补进已渲染的笺纸（layout 先跑，不阻塞首屏） */
function patchVenueLinks() {
  STATIONS.forEach((s, i) => {
    if (!s._venueResolved) return;
    const note = state._noteEls[i];
    if (!note || note.querySelector('.cz-note-venue')) return;
    const a = document.createElement('a');
    a.className = 'cz-note-venue';
    a.href = s._venueHref;
    a.innerHTML = `${icon('pin')} 探访${s.venue}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`;
    note.appendChild(a);
  });
}

/* ---------- DOM 引用 ---------- */
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
  viewportW: 0,        // 手卷窗口宽度
  scrollH: 0,          // 驱动条总高
  maxTranslateX: 0,    // 手卷最大 translateX
  maxScroll: 0,        // 驱动条最大 scroll
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
  // 每站占宽：移动端（vw<1024，含手机竖屏/横屏/小平板）收紧站间距——
  // 竖屏 390px 从 660 降到 ~330px（滚动密度翻倍、空白纸减少、垂直滚动路程减半）；
  // 横屏手机 844px 上限 540px（窗口宽，仍可看到约 1.5 站）。桌面 ≥1024 保持 ≥660，保留手卷"展开感"。
  // 间距 > 便签宽 + 间隙，避免定格与下一站卡片重叠
  const perStationW = vw < 1024 ? Math.max(330, Math.min(540, vw * 0.8)) : Math.max(660, vw * 0.9);
  // 两侧 padding：桌面保持 vw/2；移动端（vw<1024，与站距收紧断点一致）收紧为 (vw-每站宽)/2，
  // 让首站初始即居中（否则首站便签初始被裁掉一半）
  const sidePad = vw < 1024 ? Math.max(20, (vw - perStationW) / 2) : vw * 0.5;
  const totalW = perStationW * STATIONS.length + sidePad * 2;

  handroll.style.width = totalW + 'px';

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
  // 场馆链接补投：buildContents 重建笺纸后，若链接已解析过，重新注入「探访」按钮（幂等）
  patchVenueLinks();
  // resize 重建后补投已到站笺纸：新建的 .cz-note 默认 opacity:0，
  // 若活动站未变，onScroll 不会触发 setActive 重新 drop，导致当前站笔记整体隐形
  if (state.activeStationId) dropNotesUpTo(state.activeStationId);
}

/* 把所有 sid <= id 的笺纸立即标为 dropped（resize 重建后补投用，镜像 setActive 的落纸逻辑） */
function dropNotesUpTo(id) {
  const noteEls = state._noteEls;
  for (let i = 0; i < noteEls.length; i++) {
    const el = noteEls[i];
    if (i + 1 <= id) el.classList.add('dropped');
  }
}

/* 在老宣纸手卷上随机散布墨迹墨点（28 个不规则大小污渍） */
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
/* 路径长度近似：相邻点直线距离累加 ×1.12 修正贝塞尔弧长（手卷主线与迷你地图共用） */
function approxPathLen(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len * 1.12;
}

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

  // 先估算路径总长度（直线近似 ×1.12 贝塞尔修正，与迷你地图共用同一 helper）
  const approxLen = approxPathLen(pts);
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

    stamp.innerHTML = `
        <span class="cz-stamp-index">第 ${s.id} 站 · ${s.date}</span>
        <div class="cz-stamp-inner">
          ${stampSvg(s)}
        </div>
      `;
    // 印章键盘可达：tabindex + Enter/Space 触发跳站（与点击同路径）
    stamp.tabIndex = 0;
    stamp.setAttribute('role', 'button');
    stamp.setAttribute('aria-label', `跳转到第 ${s.id} 站 ${s.name}`);
    stamp.addEventListener('click', () => scrollToStation(s.id));
    stamp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToStation(s.id); }
    });
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
      ? `<div class="cz-note-photo"><img src="${getBasePath()}assets/长征图片/${photo}" alt="${s.name}实景" loading="lazy"></div>`
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
      `;
    handrollCont.appendChild(note);
    state._noteEls.push(note);
  });
}

/* ---------- 滚动 → translateX 映射 ---------- */
function onScroll() {
  state._lastActiveT = performance.now();
  // 全屏定格期间：锁住滚动，让卷轴停在当前站，不跟着滚走
  if (theaterLock.active) {
    const y = window.pageYOffset || document.documentElement.scrollTop;
    // 用 instant 而非默认（默认会继承 CSS scroll-behavior:smooth，与滚轮打架导致抖动）
    if (Math.abs(y - theaterLock.getY()) > 1) _instantScroll(theaterLock.getY());
    return;
  }
  if (!state.maxScroll || state.maxScroll <= 0) return;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const clampedScroll = Math.max(0, Math.min(state.maxScroll, scrollTop));
  const progress = clampedScroll / state.maxScroll;  // 0~1

  const x = -progress * state.maxTranslateX;
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
  poemOverlay.setAttribute('aria-hidden', 'false');  // 视觉可见时必须同步 ARIA 状态，否则读屏丢失诗词内容
  _poemTimer = setTimeout(() => {
    poemOverlay.classList.remove('show');
    poemOverlay.setAttribute('aria-hidden', 'true');
  }, 4600);
}

/* 环境音开关按钮（传入 cz-sound 模块的 initSound） */
const soundToggle = $('#cz-sound-toggle');

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
    if (!theaterLock.active) {  // 全屏定格期间暂停等待
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

/* 接线：音景开关 + 文物弹窗关闭 + 笺纸文物点击（事件委托） */
function initImmersiveUI() {
  // 环境音引擎初始化(自包含模块管理开关点击与状态，注入当前站点回调供 mood 使用)
  czSound.initSound(soundToggle, () => {
    const s = state.activeStationId ? STATIONS[state.activeStationId - 1] : null;
    return s;
  });
  if (autoplayBtn) autoplayBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleAutoScroll(); });
  // 用户手动滚动 / 触摸 / 方向键 → 立即接管自动行军
  ['wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, (e) => {
    if (!_autoRaf) return;
    // 触屏点按自动行军按钮时不在此停：让 click 的 toggle 全权控制，避免"touchstart先停→click再启"竞态导致无法停止
    if (ev === 'touchstart' && e.target && e.target.closest && e.target.closest('#cz-autoplay-btn')) return;
    stopAutoScroll();
  }, { passive: true }));
  window.addEventListener('keydown', (e) => {
    if (_autoRaf && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) stopAutoScroll();
  });
  const relicClose = $('#cz-relic-close');
  if (relicClose) relicClose.addEventListener('click', closeRelic);
  initModalsUI(); // 文物/成就弹窗的遮罩点击接线收在 cz-modals 内
  // Escape：按"最上层弹窗优先"关闭，避免误关下层弹窗并破坏 body 滚动锁计数
  // 已与 focus-trap.js 协作：focus-trap 处理 Escape 时会 preventDefault，此处跳过已处理事件
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    // preventDefault：标记事件已处理，避免 focus-trap（后注册、栈式）再触发下层弹窗的 Escape 连关
    if (isCardModalOpen()) { e.preventDefault(); closeCardModal(); return; }
    if (isCompleteOpen()) { e.preventDefault(); closeComplete(); return; }
    e.preventDefault();
    closeRelic();
  });
  // 终点成就：领取长征纪念卡（打开专属弹窗）/ 关闭（成就弹窗遮罩接线已在 initModalsUI 内）
  const completeBtn = $('#cz-complete-btn');
  if (completeBtn) completeBtn.addEventListener('click', (e) => { e.stopPropagation(); openCardModal(); });
  const completeClose = $('#cz-complete-close');
  if (completeClose) completeClose.addEventListener('click', closeComplete);
  // 长征纪念卡弹窗：关闭 / 生成 / 下载 / 分享（接线收在 cz-card-modal 内）
  initCardModalUI();
  if (handrollCont) {
    handrollCont.addEventListener('click', (e) => {
      const relicEl = e.target.closest('.cz-note-relic');
      if (!relicEl) return;
      const note = relicEl.closest('.cz-note');
      const sid = note ? parseInt(note.dataset.stationId, 10) : 0;
      if (sid) openRelicDetail(sid);
    });
    // 文物块 role=button 键盘可达：Enter/Space 触发同一打开路径（与 click 委托一致）
    handrollCont.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const relicEl = e.target.closest('.cz-note-relic');
      if (!relicEl) return;
      e.preventDefault();
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
  czSound.updateSoundscape(s.mood);

  // 真实场景照片背景层
  const photo = STATION_PHOTOS[s.id];
  setPhoto(photo);

  // 到达延安 → 终点成就（取代小剧场，直接进入大场面）；只播一次（已关闭后回访不再触发）
  if (s.id === 17 && !_achievementDone) {
    _achievementDone = true;
    _shownTheater.add(17);  // 成就取代站17小剧场，标记已播，回滚不补播
    showComplete();  // _achievementDone 守卫保证只弹一次，关闭后回访不再触发
    stopAutoScroll();  // 终点成就已 lockBodyScroll，停止自动行军空转 rAF
  } else if (_firstStationDone && !_shownTheater.has(s.id)) {
    // 每站小剧场：先让笺纸卡片落定，再切入该站实景 + 专属天气
    // 仅在真正开播时标记"已播"：快速滑过/被取消的站不记入，回滚回来会重新调度，避免"快速路过"永久丢失
    const sid = s.id;
    clearTimeout(_theaterTimer);
    _theaterTimer = setTimeout(() => {
      // 若用户已滑到别的站则不播（不标记，回来可补播）
      if (state.activeStationId !== sid) return;
      _shownTheater.add(sid);
      theaterLock.hold();
      showTheater(sid, scrollToStation);  // 收场后补执行被吞掉的跳站
    }, 1000);
  }
}

/* 切换背景照片层 */
function setPhoto(photo) {
  if (!bgPhoto) return;
  if (photo) {
    bgPhoto.style.backgroundImage = `url(${getBasePath()}assets/长征图片/${photo})`;
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
/* 笺纸 dropped 世代标记（快速回滚时取消过期定时器） */
let _dropGen = 0;
/* 诗词每站只浮现一次 */
const _poemShown = new Set();

/* 每站小剧场调度（播放本身在 cz-theater.js） */
let _theaterTimer = null;
const _shownTheater = new Set();  // 已播过小剧场的站（回滚不重放）
let _achievementDone = false;  // 终点成就只触发一次（关闭后回访延安不再重弹）
let _firstStationDone = false;

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

  // 估算路径总长，用于 stroke-dasharray 控制进度（与手卷主线共用 approxPathLen）
  const approxLen = approxPathLen(pts);
  state._miniRouteLen = approxLen;
  routeFill.setAttribute('stroke-dasharray', `${approxLen} ${approxLen + 200}`);
  routeFill.setAttribute('stroke-dashoffset', approxLen);

  // 17个站点圆点(点击跳转)
  // 只给关键站标名，避免 17 个名字在 200-300px 小卡片上糊成一团
  const KEY_STATIONS = [1, 7, 11, 16, 17];
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

    // 标签（偶数站上，奇数站下）——只给关键站标名
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

    // 迷你圆点键盘可达：tabindex + Enter/Space 触发跳站（SVG 元素经 tabindex 可聚焦）
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `跳转到第 ${s.id} 站 ${s.name}`);
    g.addEventListener('click', () => scrollToStation(s.id));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToStation(s.id); }
    });
    routeDots.appendChild(g);
    state._miniDotEls.push(g);
  });
}

function scrollToStation(id) {
  // 手动跳转站台时立即接管自动行军，避免 rAF 逐帧把目标跳转覆盖回去
  stopAutoScroll();
  // 小剧场 hold 期间滚动手卷会被 _instantScroll 拉回：挂起跳转，收场后补执行
  if (theaterLock.active) { theaterLock.deferStation(id); return; }
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

/* ---------- 初始化 ---------- */
async function init() {
  if (!main) return;
  // 手卷是首屏唯一视觉核心：先 layout 立即展开，场馆 JSON 解析改为后台进行，完成后补"探访"链接
  layout();
  resolveVenueLinks().then(patchVenueLinks);
  initImmersiveUI();
  // 滚动驱动：scroll 事件 + RAF 节流
  let ticking = false;
  const onScrollRaf = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { try { onScroll(); } finally { ticking = false; } }); } };
  window.addEventListener('scroll', onScrollRaf, { passive: true });

  // 键盘导航：Left/Right 切换站点（弹窗/小剧场开启时不响应，与 Escape 处理器的逐层守卫一致）
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // 忽略输入框内的按键
      const tag = (document.activeElement || {}).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (isCardModalOpen()) return;
      if (isCompleteOpen()) return;
      if (isRelicOpen()) return;
      if (theaterLock.active) return;
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

  // 初始展开第一站：layout() 末尾的 onScroll 已按当前位置选中站点，
  // 仅当未激活任何站点时兜底到第 1 站，避免覆盖浏览器恢复的滚动位置导致 HUD/氛围错位
  if (!state.activeStationId) setActive(1);
  _firstStationDone = true;  // 首站（加载即达）不播小剧场
  // 站 1 是加载即达的初始视图：标记"已播"，否则首次回访时（_firstStationDone 已为 true）
  // 会在站 1 补播一次剧场，与"首站不播"的意图相悖
  _shownTheater.add(1);

  // 粒子特效（状态访问器注入，解耦 cz-atmosphere 与手卷 state）
  const startAtmosphere = () => initAtmosphere({
    canvas: document.getElementById('cz-atmos'),
    getReduceMotion: () => _reduceMotion,
    getActiveStationId: () => state.activeStationId,
    getLastActiveT: () => state._lastActiveT,
    setLastActiveT: (t) => { state._lastActiveT = t; },
    setMoodBridge: (fn) => { state._setAtmoMood = fn; }
  });
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(startAtmosphere, 100);
  } else {
    window.addEventListener('load', startAtmosphere, { once: true });
  }

  // 每隔一段时间自动飘点尘埃（增加空气流动的真实感）
  setInterval(() => {
    if (_reduceMotion || document.hidden) return;
    if (Math.random() < 0.55) spawnDust(1 + Math.floor(Math.random() * 2));
  }, 1500);
}

export { init };
