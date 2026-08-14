/* ============================================================
   Service Worker — 离线可用 + 静态资源缓存（PWA 补全）
   策略：
   - 带 ?v= 的构建资源（js/css）：缓存优先（版本化 URL 天然隔离新旧版本，部署后 ?v= 变化自动取新）
   - 页面导航：网络优先，离线回退缓存首页
   - 图片 / data JSON / 模板：stale-while-revalidate（缓存优先 + 后台更新）
   - 跨源请求（CDN 字体 / 地图瓦片）不缓存，交浏览器默认
   注意：版本由资源 URL 的 ?v= 驱动，无需每次部署改本文件；activate 清理旧缓存。
   ============================================================ */
const CACHE = 'shanhexu-v1';
const PRECACHE = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 仅同源缓存；CDN 字体 / 高德瓦片等跨源走浏览器默认（避免跨源 Cache API 异常）
  if (url.origin !== self.location.origin) return;

  // 带 ?v= 的 js/css：缓存优先（版本化 URL，部署新版本自动新建缓存条目）
  if (url.search.includes('v=') && /\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // 页面导航：网络优先，离线回退缓存首页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 其余（图片 / data JSON / 模板）：stale-while-revalidate（缓存优先 + 后台更新）
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});
