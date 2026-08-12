/* ============================================================
   赓续血脉・数绘红旅 — 红色记忆时间线 (Homepage Timeline)
   职责：首页年份时间线 + 事件详情面板（场馆链接）
   约束：依赖 utils(getBasePath) / venue-store(getVenues)；被 homepage.js 引用
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081320';
import { icon } from './icons.js?v=2026081320';
import { getVenues } from './venue-store.js?v=2026081320';
import { findVenueByName } from './data.js?v=2026081320';
import { HISTORY_EVENTS } from './red-history.js?v=2026081320';

function initTimeline() {
  // 首页 guard 已在 homepage.js initHomepageInnovation 统一执行，此处不重复
  const nodes = document.querySelectorAll('.tl-node');
  const detail = document.getElementById('timeline-detail');
  if (!nodes.length || !detail) return;

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

    nodes.forEach(function (n) { n.classList.toggle('active', n.dataset.year === year); });

    const bp = getBasePath();
    const venues = getVenues();
    const venueLinks = ev.venues.map(function (vn) {
      // 复用 data.js 的单一场馆匹配器，避免时间线与聊天各持一套匹配逻辑
      const v = findVenueByName(venues, vn);
      if (!v) return '<span class="tl-venue-link is-muted">' + icon('building') + ' ' + vn + '</span>';
      return '<a class="tl-venue-link" href="' + bp + 'pages/detail.html?id=' + encodeURIComponent(v.id) + '">' + icon('building') + ' ' + vn + '</a>';
    }).join('');

    detail.innerHTML = '<h3>' + ev.title + '</h3><p>' + ev.desc + '</p><div class="tl-venues">' + venueLinks + '</div>';
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
