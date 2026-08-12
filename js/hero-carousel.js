/* ============================================================
   赓续血脉・数绘红旅 — Hero 背景轮播（ES Module，通用）
   职责：双图 Hero 交叉淡入轮播 + Ken Burns 错峰启动
   说明：页面容器须提供 [data-hero-images]（JSON 数组，含 basePath 路径，
         首项对应 .hero-bg-active、次项对应 .hero-bg-next）才轮播；
         无双图或无配置自动 no-op。
   ============================================================ */

export function initHeroCarousel() {
  let current = 0;
  let active = null;
  let next = null;
  let timer = null;
  let started = false;

  // 图片来源：唯一来源为页面容器 [data-hero-images]（JSON 数组）
  let images = null;
  const heroSection = document.querySelector('[data-hero-images]');
  if (heroSection && heroSection.dataset.heroImages) {
    try {
      const parsed = JSON.parse(heroSection.dataset.heroImages);
      if (Array.isArray(parsed) && parsed.length > 1) images = parsed;
    } catch (e) { images = null; }
  }

  function startCarousel() {
    if (timer) return; // 已经启动
    active = document.querySelector('.hero-bg-active');
    next = document.querySelector('.hero-bg-next');
    if (!active || !next || !images) return;  // 无双图 Hero 或无图片配置（详情/政策等页）直接 no-op
    // 尊重"减少动效"：只展示首图，不做自动轮播
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  // pageshow(persisted) 负责重启轮播，否则恢复后首屏背景永久静止。
  // 注意 pageshow 在初始加载（persisted=false）也会触发——此时不得抢跑入场 gating
  //（首页入场遮罩还在时就开始轮播，会先切到第二张）；只有已启动过的轮播才在此重启
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', stopCarousel);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && started) startCarousel();
  });

  // 如果开场动画已结束或不存在，立即启动；否则等 entranceFinished 事件
  const overlay = document.getElementById('entrance-overlay');
  if (!overlay || overlay.classList.contains('fade-out')) {
    startCarousel();
  } else {
    window.addEventListener('entranceFinished', startCarousel);
  }
}
