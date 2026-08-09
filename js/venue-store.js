/* ============================================================
   赓续血脉・数绘红旅 — 场馆共享状态 (Venue Store)
   职责：AI 聊天引擎与首页时间线共享的场馆列表，单一持有者
   约束：只依赖 data.js，被 chat.js / timeline.js 引用
   ============================================================ */

import * as RedData from './data.js?v=2026080502';

let venuesCache = [];

async function loadVenues() {
  try {
    venuesCache = await RedData.loadAllVenues();
  } catch (e) {
    console.warn('[VenueStore] 场馆数据加载失败，相关功能降级运行', e);
    venuesCache = [];
  }
  return venuesCache;
}

function getVenues() {
  return venuesCache;
}

export { loadVenues, getVenues };
