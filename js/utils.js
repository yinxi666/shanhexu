/* ============================================================
   赓续血脉・数绘红旅 — 纯工具模块 (Utils)
   职责：字符串转义 / URL 白名单 / Storage / 路径 / 点赞数读取
   约束：零 import，不依赖 DOM 之外任何模块——所有模块可安全引用
   ============================================================ */

/* ---- 路径工具 ---- */
// 回退占位图单源常量（此前在 utils.js 双处 + data.js 三处硬编码，改动需同步多处）
const FALLBACK_IMAGE = 'assets/页面通用图片/暂无图片.png';

function getBasePath() {
  if (location.pathname.includes('/pages/')) return '../';
  return '';
}

function resolveAssetPath(imagePath, basePath) {
  const bp = basePath || getBasePath();
  if (!imagePath) return bp + FALLBACK_IMAGE;
  if (/^https?:\/\//.test(imagePath)) return imagePath;
  if (imagePath.startsWith('/')) return imagePath;
  return bp + imagePath;
}

function fallbackSrc() {
  return getBasePath() + FALLBACK_IMAGE;
}

// 安全资源 URL 单步组合：resolveAssetPath（路径基准）+ sanitizeUrl（协议白名单）。
// 供渲染器/弹窗统一使用，消除"sanitize+resolve+fallback"三处各自拼装的重复
function safeAssetSrc(imagePath, basePath) {
  return sanitizeUrl(resolveAssetPath(imagePath, basePath));
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

/* 首页路由判定：与 pages.js autoInit 共用，避免双份谓词漂移 */
function isHomePage() {
  const p = location.pathname;
  return p.endsWith('/') || p.endsWith('index.html');
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

/* 省份去后缀（省/市/自治区/壮族/回族/维吾尔 → 短名），供提示语/合并去重统一使用 */
function stripProvinceSuffix(province) {
  return String(province || '').replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
}

/* 点赞增量存储键单源（utils.js 读写 + pages.js 写入三处共用，防改键名漏同步） */
const LIKES_DELTA_PREFIX = 'redguide_likes_delta_';
function likeDeltaKey(id) {
  return LIKES_DELTA_PREFIX + id;
}

/* 点赞数读取：编造基数（practices.json likes）仅作展示基线 fallback，
   真实用户增量存 redguide_likes_delta_<id>，二者相加；旧绝对值/旧 key 按"基线+增量"迁移 */
function getLikeCount(id, fallback) {
  try {
    const base = Number(fallback) || 0;
    const delta = sessionStorage.getItem(likeDeltaKey(id));
    if (delta != null) return base + (parseInt(delta, 10) || 0);
    const legacy = sessionStorage.getItem('redguide_likecount_' + id);
    if (legacy != null) return base + Math.max(0, (parseInt(legacy, 10) || 0) - base);
    const oldAbs = sessionStorage.getItem('redguide_likes_' + id);
    if (oldAbs != null) return base + Math.max(0, (parseInt(oldAbs, 10) || 0) - base);
  } catch (e) { }
  return fallback;
}

/* 触摸设备判定：供"长按保存"等触屏专属交互统一使用 */
function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

/* 是否已点赞：与 getLikeCount 同一套存储键，供渲染时保持已赞高亮 */
function isPracticeLiked(id) {
  try {
    return sessionStorage.getItem(likeDeltaKey(id)) != null
      || sessionStorage.getItem('redguide_likes_' + id) != null
      || sessionStorage.getItem('redguide_likecount_' + id) != null;
  } catch (e) { return false; }
}

export {
  getBasePath,
  resolveAssetPath,
  fallbackSrc,
  safeAssetSrc,
  FALLBACK_IMAGE,
  escapeHtml,
  escapeAttr,
  sanitizeUrl,
  safeStorage,
  getLikeCount,
  likeDeltaKey,
  isPracticeLiked,
  isHomePage,
  isTouchDevice,
  stripProvinceSuffix
};
