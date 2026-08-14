/* ============================================================
   赓续血脉・数绘红旅 — 红色记忆时间线 (Homepage Timeline)
   职责：首页年份时间线 + 事件详情面板（场馆链接）
         「漫漫长路」：SVG 蜿蜒山路 + 路碑印章节点 + 走过之路点亮
   约束：依赖 utils(getBasePath) / venue-store(getVenues)；被 homepage.js 引用
   ============================================================ */

import { getBasePath, escapeHtml } from './utils.js?v=2026081516';
import { icon } from './icons.js?v=2026081516';
import { getVenues } from './venue-store.js?v=2026081516';
import { findVenueByName } from './data.js?v=2026081516';
import { HISTORY_EVENTS } from './red-history.js?v=2026081516';

function prefersReduce() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* 生成「漫漫长路」SVG：红色正弦山路 + 金色点亮层；
   节点按同一曲线经 --tl-off 定 Y 偏移（相邻上下交错，像翻山） */
function buildRoute() {
  const track = document.querySelector('.timeline-track');
  if (!track) return null;
  const old = track.querySelector('.tl-route');
  if (old) old.remove();

  const nodes = Array.from(track.querySelectorAll('.tl-node'));
  if (nodes.length < 2) return null;

  const ns = 'http://www.w3.org/2000/svg';
  // 波形参数：中心线对齐路碑中心（.tl-dot 是 track 内 flex 项顶部子元素，14px dot 半高 7，
  // SVG 相对 track 定位，故基线取 7；20px 顶内距在 .timeline-scroll 上、不进 track 坐标系）
  const baseY = 7;
  const amp = prefersReduce() ? 0 : 13;
  const wavelength = 240;
  const waveY = (x) => baseY + amp * Math.sin((2 * Math.PI * x) / wavelength);

  const pts = nodes.map((n) => {
    const x = n.offsetLeft + n.offsetWidth / 2;
    const y = waveY(x);
    n.style.setProperty('--tl-off', (y - baseY) + 'px');
    return { x, y };
  });

  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'tl-route');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  // viewBox 上界取 -12：波形（7±13）会越过 y=0，负区间须纳入可视盒，否则山路顶部被裁
  svg.setAttribute('viewBox', '0 -12 ' + track.scrollWidth + ' ' + (track.offsetHeight + 12));
  track.prepend(svg);

  // 路从 track 左缘起，蜿蜒穿过所有节点，终点略延伸（金星之下）
  const startX = 16;
  const endX = pts[pts.length - 1].x + 8;
  let d = 'M ' + startX + ' ' + waveY(startX);
  for (let x = startX + 8; x <= endX; x += 8) {
    d += ' L ' + x + ' ' + waveY(x);
  }

  const base = document.createElementNS(ns, 'path');
  base.setAttribute('d', d);
  base.setAttribute('class', 'route-base');
  const lit = document.createElementNS(ns, 'path');
  lit.setAttribute('d', d);
  lit.setAttribute('class', 'route-lit');
  svg.appendChild(base);
  svg.appendChild(lit);

  // 各节点累计弧长（弦长近似弧长，缓坡足够）——金色路段延伸到激活节点
  const lens = [0];
  lens[0] = Math.hypot(pts[0].x - startX, waveY(startX) - pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    lens[i] = lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  const total = lens[lens.length - 1];
  lit.style.strokeDasharray = '0 ' + total;

  function litTo(idx) {
    const L = lens[idx];
    lit.style.strokeDasharray = (L > 0 ? L : 0.01) + ' ' + total;
  }

  return { litTo };
}

function initTimeline() {
  // 首页 guard 已在 homepage.js initHomepageInnovation 统一执行，此处不重复
  const nodes = document.querySelectorAll('.tl-node');
  const detail = document.getElementById('timeline-detail');
  if (!nodes.length || !detail) return;

  // 「漫漫长路」山路 + 点亮；resize 跨断点重算（860px 改节点 padding 后波形要对齐）
  let route = buildRoute();
  let resizeRaf = false;
  window.addEventListener('resize', function () {
    if (resizeRaf) return;
    resizeRaf = true;
    requestAnimationFrame(function () {
      resizeRaf = false;
      route = buildRoute();
      const cur = document.querySelector('.tl-node.active');
      if (route && cur) {
        const idx = Array.prototype.findIndex.call(nodes, (n) => n.dataset.year === cur.dataset.year);
        if (idx >= 0) route.litTo(idx);
      }
    });
  });

  // 年份→事件叙述来自单一知识源 red-history.js（AI 问答共用），此处仅附加时间线专属的场馆链接
  const events = {
    '1921': { ...HISTORY_EVENTS['1921'], venues: ['中共一大会址纪念馆', '嘉兴南湖红船'] },
    '1927': { ...HISTORY_EVENTS['1927'], venues: ['南昌八一起义纪念馆', '井冈山革命博物馆', '广州起义烈士陵园'] },
    '1929': { ...HISTORY_EVENTS['1929'], venues: ['古田会议会址'] },
    '1931': { ...HISTORY_EVENTS['1931'], venues: ['九一八历史博物馆'] },
    '1934': { ...HISTORY_EVENTS['1934'], venues: ['井冈山革命博物馆'] },
    '1935': { ...HISTORY_EVENTS['1935'], venues: ['遵义会议会址', '泸定桥革命文物陈列馆（泸定桥景区）', '延安革命纪念馆'] },
    '1936': { ...HISTORY_EVENTS['1936'], venues: ['会宁红军长征胜利纪念馆', '六盘山红军长征纪念馆'] },
    '1937': { ...HISTORY_EVENTS['1937'], venues: ['八路军太行纪念馆', '东北烈士纪念馆'] },
    '1945': { ...HISTORY_EVENTS['1945'], venues: ['红岩革命纪念馆'] },
    '1947': { ...HISTORY_EVENTS['1947'], venues: ['孟良崮战役纪念馆', '西柏坡纪念馆'] },
    '1949': { ...HISTORY_EVENTS['1949'], venues: ['西柏坡纪念馆', '中国共产党历史展览馆'] },
    '1960': { ...HISTORY_EVENTS['1960'], venues: ['红旗渠纪念馆'] },
    '1964': { ...HISTORY_EVENTS['1964'], venues: ['青海原子城纪念馆'] },
  };

  function showEvent(year) {
    const ev = events[year];
    if (!ev) { detail.classList.add('is-hidden'); return; }

    nodes.forEach(function (n) {
      n.classList.toggle('active', n.dataset.year === year);
      n.setAttribute('aria-current', n.dataset.year === year ? 'true' : 'false');
    });
    // 走过之路点亮：金色路段从起点延伸到该节点
    if (route) {
      const idx = Array.prototype.findIndex.call(nodes, (n) => n.dataset.year === year);
      if (idx >= 0) route.litTo(idx);
    }
    // 详情面板内容动态更新：暴露为 live region 供读屏播报
    if (!detail.hasAttribute('role')) { detail.setAttribute('role', 'status'); detail.setAttribute('aria-live', 'polite'); }

    const bp = getBasePath();
    const venues = getVenues();
    const venueLinks = ev.venues.map(function (vn) {
      // 复用 data.js 的单一场馆匹配器，避免时间线与聊天各持一套匹配逻辑
      const v = findVenueByName(venues, vn);
      if (!v) return '<span class="tl-venue-link is-muted">' + icon('building') + ' ' + escapeHtml(vn) + '</span>';
      return '<a class="tl-venue-link" href="' + bp + 'pages/detail.html?id=' + encodeURIComponent(v.id) + '">' + icon('building') + ' ' + escapeHtml(vn) + '</a>';
    }).join('');

    detail.innerHTML = '<h3>' + escapeHtml(ev.title) + '</h3><p>' + escapeHtml(ev.desc) + '</p><div class="tl-venues">' + venueLinks + '</div>';
    detail.classList.remove('is-hidden');
  }

  let userInteracted = false;
  nodes.forEach(function (node) {
    node.addEventListener('click', function () { userInteracted = true; showEvent(node.dataset.year); });
    // 键盘可达：Enter/Space 与点击一致
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); userInteracted = true; showEvent(node.dataset.year); }
    });
  });

  // 自动激活第一个（若用户已在 400ms 内点过其他年份则不覆盖）
  setTimeout(function () { if (!userInteracted) showEvent('1921'); }, 400);
}

export { initTimeline };
