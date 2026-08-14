/* ============================================================
   赓续血脉・数绘红旅 — 场馆收藏 (Favorites)
   职责：收藏的读取 / 判断 / 切换（localStorage 持久化）
   约束：只依赖 utils.js，被 renderers.js / action-delegate.js 引用
   ============================================================ */

import { safeStorage } from './utils.js?v=2026081431';

// 模块级缓存：卡片渲染期间 isFavorite 高频调用（导览网格每张卡），避免每次 JSON.parse localStorage
let _favCache = null;
// 跨标签页同步：另一标签页写 redguide_favs（localStorage 共享）时失效本页缓存
try { window.addEventListener('storage', function (e) { if (e.key === 'redguide_favs') _favCache = null; }); } catch (err) { }
function loadFavorites() {
  if (_favCache === null) {
    const raw = safeStorage.get('redguide_favs', [], localStorage);
    _favCache = Array.isArray(raw) ? raw.filter(f => typeof f === 'string' || typeof f === 'number').map(String) : [];
  }
  return _favCache;
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
  if (ok) _favCache = next;  // 写成功后同步缓存，避免界面与存储发散
  return ok ? on : null;  // null = 写失败（配额满/隐私模式），调用方可提示且不改 UI
}

export { isFavorite, toggleFavorite };
