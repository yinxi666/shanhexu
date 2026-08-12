/* ============================================================
   carousel — 通用图片轮播（详情页使用）
   职责：平移轨道 + 圆点/计数器 + 自动播放 + 悬停暂停，返回 destroy 清理
   依赖：ui($ / $$)
   ============================================================ */

import { $, $$ } from './ui.js?v=2026081016';

export function initCarousel(total) {
  const carouselEl = $('.detail-carousel');
  const track = $('.carousel-track', carouselEl);
  const prevBtn = $('.carousel-prev', carouselEl);
  const nextBtn = $('.carousel-next', carouselEl);
  // 限定在当前轮播内部，避免将来页面新增轮播时串扰
  const dots = $$('.carousel-dot', carouselEl);
  const counter = $('.carousel-counter', carouselEl);
  if (!track || !prevBtn || !nextBtn) return;

  let current = 0;
  let autoplayTimer = null;

  function showSlide(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    if (counter) counter.textContent = `${current + 1} / ${total}`;
  }

  function next() { showSlide(current + 1); }
  function prev() { showSlide(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  const dotHandlers = dots.map(dot => {
    const handler = () => showSlide(parseInt(dot.dataset.index));
    dot.addEventListener('click', handler);
    return { dot, handler };
  });

  function startAutoplay() {
    autoplayTimer = setInterval(next, 5000);
  }
  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  track.addEventListener('mouseenter', stopAutoplay);
  track.addEventListener('mouseleave', startAutoplay);
  prevBtn.addEventListener('mouseenter', stopAutoplay);
  nextBtn.addEventListener('mouseenter', stopAutoplay);

  startAutoplay();

  // 返回清理函数，供页面卸载时调用
  return function destroy() {
    stopAutoplay();
    prevBtn.removeEventListener('click', prev);
    nextBtn.removeEventListener('click', next);
    dotHandlers.forEach(({ dot, handler }) => dot.removeEventListener('click', handler));
    track.removeEventListener('mouseenter', stopAutoplay);
    track.removeEventListener('mouseleave', startAutoplay);
    prevBtn.removeEventListener('mouseenter', stopAutoplay);
    nextBtn.removeEventListener('mouseenter', stopAutoplay);
  };
}
