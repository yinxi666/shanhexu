/* ============================================================
   赓续血脉・数绘红旅 — 纯工具模块 (Utils)
   职责：字符串转义 / URL 白名单 / Storage / 路径 / 点赞数读取
   约束：零 import，不依赖 DOM 之外任何模块——所有模块可安全引用
   ============================================================ */

/* ---- 路径工具 ---- */
function getBasePath() {
  if (location.pathname.includes('/pages/')) return '../';
  return '';
}

function resolveAssetPath(imagePath, basePath) {
  const bp = basePath || getBasePath();
  if (!imagePath) return bp + 'assets/页面通用图片/暂无图片.png';
  if (/^https?:\/\//.test(imagePath)) return imagePath;
  if (imagePath.startsWith('/')) return imagePath;
  return bp + imagePath;
}

function fallbackSrc() {
  return getBasePath() + 'assets/页面通用图片/暂无图片.png';
}

/* ---- 转义 ---- */
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// escapeAttr 与 escapeHtml 实现逐字相同（& " ' < > 五条），别名复用，避免两处维护
const escapeAttr = escapeHtml;

function sanitizeUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^\/\//i.test(u)) return ''; // 协议相对 URL（//host）可被浏览器解析为任意外部主机，一律拒绝
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[/.]/.test(u) || /^(assets|images|uploads|data)\//i.test(u)) return u;
  return '';
}

/* 安全 Storage 工具：统一处理 JSON 解析异常、数据形态和写入失败 */
const safeStorage = {
  get(key, fallback = null, storage = localStorage) {
    try {
      const raw = storage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value, storage = localStorage) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },
  remove(key, storage = localStorage) {
    try {
      storage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/* 点赞数读取（统一 key 优先；旧方案残留时用旧 key 的计数） */
function getLikeCount(id, fallback) {
  try {
    const c = sessionStorage.getItem('redguide_likes_' + id);
    const legacy = sessionStorage.getItem('redguide_likecount_' + id);
    if (c != null && legacy != null) return parseInt(legacy);
    if (c != null) return parseInt(c);
    if (legacy != null) return parseInt(legacy);
  } catch (e) { }
  return fallback;
}

/* 触摸设备判定：供"长按保存"等触屏专属交互统一使用 */
function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

export {
  getBasePath,
  resolveAssetPath,
  fallbackSrc,
  escapeHtml,
  escapeAttr,
  sanitizeUrl,
  safeStorage,
  getLikeCount,
  isTouchDevice
};
