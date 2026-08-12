/* ============================================================
   赓续血脉・数绘红旅 — 场馆共享状态 (Venue Store)
   职责：AI 聊天引擎与首页时间线共享的场馆列表，单一持有者
   约束：只依赖 data.js 的权威缓存（不自己缓存副本，避免失败语义分叉）；
         被 chat.js / timeline.js 引用
   ============================================================ */

import * as RedData from './data.js?v=2026081312';

async function loadVenues() {
  try {
    await RedData.loadAllVenues();
  } catch (e) {
    console.warn('[VenueStore] 场馆数据加载失败，相关功能降级运行', e);
  }
  // 无论成功失败都返回 data.js 权威缓存：失败时 []，之后任何一方重试成功即被读到，
  // 不再出现"venue-store 缓存 [] 而 data.js 已成功"的双缓存分叉
  return RedData.getVenuesCache();
}

function getVenues() {
  return RedData.getVenuesCache();
}

export { loadVenues, getVenues };
