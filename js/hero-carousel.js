/* ============================================================
   赓续血脉・数绘红旅 — 首页 Hero 背景轮播
   原 index.html 内联脚本提取
   错峰策略：等开场动画结束后再启动轮播，避免 GPU/CPU 竞争
   ============================================================ */

(function () {
  const images = [
    'assets/全国红色场馆图片/场馆02_北京_中国共产党历史展览馆.webp',
    'assets/全国红色场馆图片/场馆01_上海_中共一大会址.webp',
    'assets/全国红色场馆图片/场馆04_江西_井冈山革命博物馆.webp',
    'assets/全国红色场馆图片/场馆06_陕西_延安革命纪念馆.webp',
    'assets/全国红色场馆图片/场馆05_河北_西柏坡纪念馆.webp',
    'assets/全国红色场馆图片/场馆07_贵州_遵义会议会址.webp',
  ];
  let current = 0;
  let active = null;
  let next = null;
  let timer = null;
  let started = false;

  function startCarousel() {
    // 尊重系统"减少动效"：不启动背景轮播，仅保留首张静态背景
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (timer) return; // 已经启动
    active = document.querySelector('.hero-bg-active');
    next = document.querySelector('.hero-bg-next');
    if (!active || !next) return;
    started = true;

    timer = setInterval(function () {
      current = (current + 1) % images.length;
      next.src = images[current];
      next.style.opacity = '1';
      active.style.opacity = '0';
      // swap roles（用 classList 增删，保留 no-context-menu 等既有类，避免 className 整体覆盖丢失）
      const tmp = active; active = next; next = tmp;
      active.classList.add('hero-bg-active');
      active.classList.remove('hero-bg-next');
      next.classList.add('hero-bg-next');
      next.classList.remove('hero-bg-active');
      next.style.opacity = '0';
    }, 5000);
  }

  function stopCarousel() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stopCarousel();
    } else if (started) {
      // 页面重新可见时恢复轮播
      startCarousel();
    }
  }

  // bfcache 修复：pagehide 只停定时器、不拆监听；后退导航从 bfcache 恢复时
  // pageshow(persisted) 负责重启轮播，否则恢复后首屏背景永久静止
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', stopCarousel);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted || document.visibilityState !== 'hidden') startCarousel();
  });

  // 如果开场动画已结束或不存在，立即启动；否则等 entranceFinished 事件
  const overlay = document.getElementById('entrance-overlay');
  if (!overlay || overlay.classList.contains('fade-out')) {
    startCarousel();
  } else {
    window.addEventListener('entranceFinished', startCarousel);
  }
})();
