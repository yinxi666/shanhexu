/* ============================================================
   赓续血脉・数绘红旅 — Service Worker (离线缓存)
   ============================================================ */

const CACHE_NAME = 'redguide-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/pages/guide.html',
  '/pages/detail.html',
  '/pages/policy.html',
  '/pages/practice.html',
  '/pages/message.html',
  '/css/styles.css',
  '/js/common.js',
  '/js/data.js',
  '/js/renderers.js',
  '/js/features.js',
  '/data/venues.json',
  '/data/province-candidates.json',
  '/data/policies.json',
  '/data/practices.json',
  '/data/reflections.json',
  '/manifest.json',
  '/assets/页面通用图片/暂无图片.png',
  '/assets/页面通用图片/时事政策模块封面.webp',
  '/assets/页面通用图片/学习留言墙模块封面.webp',
  '/assets/页面通用图片/社会实践成果横幅.webp',
  '/assets/页面通用图片/默认头像.png',
];

// 安装 — 预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] 部分资源缓存失败:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活 — 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截 — 缓存优先 + 网络回退
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // 跳过 chrome-extension 和非 HTTP 请求
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 缓存命中 — 返回缓存，后台更新
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
