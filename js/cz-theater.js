/* ============================================================
   cz-theater — 长征手卷页"每站小剧场"：实景 + 专属天气粒子 + hold 滚动锁
   职责：切入站点实景、播放天气 Canvas 粒子、1s 收场；
         小剧场期间的滚动锁（theaterLock）供 longmarch 的
         onScroll/scrollToStation/startAutoScroll 协作。
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081318';
import { $ } from './ui.js?v=2026081318';
import { STATIONS, STATION_PHOTOS } from './cz-stations.js?v=2026081318';

let _theaterRaf = null;
let _theaterHideTimer = null;
let _cinematicHoldScroll = null;   // 小剧场期间锁定的滚动位置（防卷轴跟着滚走）
let _pendingStationScroll = null;  // hold 期间被 snap-back 吞掉的跳站请求（收场后补执行）

const theaterOverlay = $('#cz-theater');
const theaterPhoto = $('#cz-theater-photo');
const theaterName = $('#cz-theater-name');
const theaterDate = $('#cz-theater-date');
const theaterWeatherCv = $('#cz-theater-weather');
/* 手绘山水场景为静态 HTML（czScrollScene），由 CSS 驱动，无需 JS 注入 */

/* 小剧场 hold 滚动锁：唯一出口，longmarch 的滚动/跳站/自动行军经此协作 */
export const theaterLock = {
  get active() { return _cinematicHoldScroll !== null; },
  hold() { _cinematicHoldScroll = window.pageYOffset || document.documentElement.scrollTop; },
  release() { _cinematicHoldScroll = null; },
  getY() { return _cinematicHoldScroll; },
  deferStation(id) { _pendingStationScroll = id; },
  consumeDeferred() { const p = _pendingStationScroll; _pendingStationScroll = null; return p; },
};

export function showTheater(id, onDeferredJump) {
  const s = STATIONS[id - 1];
  if (!s || !theaterOverlay) {
    theaterLock.release();  // 早退也复位，避免锁死滚动
    return;
  }
  const photo = STATION_PHOTOS[s.id];
  if (photo && theaterPhoto) theaterPhoto.style.backgroundImage = `url(${getBasePath()}assets/长征图片/${photo})`;
  if (theaterName) theaterName.textContent = s.name;
  if (theaterDate) theaterDate.textContent = s.date + ' · 已走 ' + (s.miles || 0).toLocaleString() + ' 里';
  theaterOverlay.classList.toggle('fog-on', s.mood === 'swamp');
  theaterOverlay.classList.toggle('flash-on', s.mood === 'blood');  // 血战站雷暴电闪
  // 天气层渲染异常不阻断收尾：否则 hide 定时器不建立、theaterLock 永久锁死滚动
  try { startTheaterWeather(s.mood); } catch (e) { /* 忽略，剧场仍正常收场 */ }
  theaterOverlay.classList.add('show');
  theaterOverlay.setAttribute('aria-hidden', 'false');
  // 小剧场是纯展示的沉浸实景：给读屏一个可识别的命名图形角色，避免只暴露一堆匿名内容
  theaterOverlay.setAttribute('role', 'img');
  theaterOverlay.setAttribute('aria-label', s.name + ' 实景 · ' + s.date);
  clearTimeout(_theaterHideTimer);
  _theaterHideTimer = setTimeout(() => {
    theaterLock.release();  // 收场：恢复滚动
    theaterOverlay.classList.remove('show');
    theaterOverlay.setAttribute('aria-hidden', 'true');
    stopTheaterWeather();
    // hold 期间被 snap-back 吞掉的跳站请求，收场后补执行
    const pid = theaterLock.consumeDeferred();
    if (pid && onDeferredJump) onDeferredJump(pid);
  }, 1000);
}

/* 小剧场天气：Canvas 粒子（血色雨+火光余烬+硝烟 / 风雪 / 星火 / 金光 / 阴雾细雨） */
function startTheaterWeather(mood) {
  const cv = theaterWeatherCv;
  if (!cv) return;
  // HiDPI 缩放：背板按 dpr 放大、绘制用 CSS 像素变换（与 initAtmosphere 一致），避免粒子发虚
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = w * dpr;
  cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const type = (mood === 'blood') ? 'bloodrain' : (mood === 'snow') ? 'snow' : (mood === 'gold') ? 'gold' : (mood === 'swamp') ? 'fog' : 'embers';
  const parts = [];
  const add = (t, n) => { for (let i = 0; i < n; i++) parts.push(_makeWPart(t)); };
  if (type === 'snow') add('snow', 130);
  else if (type === 'bloodrain') { add('bloodrain', 90); add('embers', 50); add('smoke', 14); }
  else if (type === 'embers') add('embers', 60);
  else if (type === 'gold') add('gold', 60);
  // swamp 的雾气由 CSS .cz-theater-fog 层实现；canvas 无粒子 → 不启动空转 rAF
  cancelAnimationFrame(_theaterRaf);
  _theaterRaf = null;
  if (parts.length === 0) return;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i]._t;
      _drawWPart(ctx, parts[i], w, h, t);
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
