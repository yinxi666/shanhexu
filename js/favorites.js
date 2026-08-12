/* ============================================================
   赓续血脉・数绘红旅 — 场馆收藏 (Favorites)
   职责：收藏的读取 / 判断 / 切换（localStorage 持久化）
   约束：只依赖 utils.js，被 renderers.js / action-delegate.js 引用
   ============================================================ */

import { safeStorage } from './utils.js?v=2026081027';

function loadFavorites() {
  const raw = safeStorage.get('redguide_favs', [], localStorage);
  return Array.isArray(raw) ? raw.filter(f => typeof f === 'string' || typeof f === 'number').map(String) : [];
}

function isFavorite(id) {
  return loadFavorites().includes(String(id));
}

function toggleFavorite(id) {
  const favs = loadFavorites();
  id = String(id);
  const on = !favs.includes(id);
  const next = on ? favs.concat(id) : favs.filter(f => f !== id);
  const ok = safeStorage.set('redguide_favs', next, localStorage);
  return ok ? on : null;  // null = 写失败（配额满/隐私模式），调用方可提示且不改 UI
}

export { isFavorite, toggleFavorite };
