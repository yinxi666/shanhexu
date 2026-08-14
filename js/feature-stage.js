/* ============================================================
   feature-stage — 首页「探索红色文旅」功能卡滚动 3D 呈现（仿豆包 stage 手法）
   职责：创新功能卡（.feature-card）滚动进入视口时，
         在 3D 空间慢速翻出（rotateX/rotateY/位移/缩放/渐入）。
         不做 sticky 粘滞——板块正常排列、间距正常，无大空白。
         时间线已退出该 3D 舞台（ITEM_SELECTOR 仅 .feature-card）。
   依赖：无；被 app.js 首页 boot 调用
   约束：reduced-motion 跳过（内容正常）；JS 未跑时 CSS 默认正常；
         opacity 最低 0.5 不消失
   ============================================================ */

const ITEM_SELECTOR = '.feature-card';

/* 分段推进曲线：3D 分 3 段翻正（前段较快翻到 60% → 中段缓到 90% → 尾段极缓收尾），
   有"咯噔"节奏感、不丝滑，但分段间连续不卡顿 */
function chunkyEase(x) {
  if (x < 0.4) return (x / 0.4) * 0.6;
  if (x < 0.7) return 0.6 + ((x - 0.4) / 0.3) * 0.3;
  return 0.9 + ((x - 0.7) / 0.3) * 0.1;
}

export function initFeatureStage() {
  const stages = Array.from(document.querySelectorAll('.feature-stage'));
  if (!stages.length) return;
  // 减少动效 / JS 异常：不加 .js-active，板块保持 CSS 默认正常排列
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const vh = () => window.innerHeight || document.documentElement.clientHeight;

  stages.forEach(stage => {
    const items = Array.from(stage.querySelectorAll(ITEM_SELECTOR));
    if (!items.length) return;
    stage.classList.add('js-active');

    let raf = false;
    // 已归位的卡记录：归位后清空内联样式，把 hover 反馈还给 CSS
    //（否则内联 identity transform 永久压住 .feature-card:hover 的上浮）
    const settled = new Set();
    function update() {
      raf = false;
      items.forEach(el => {
        if (settled.has(el)) return;
        const r = el.getBoundingClientRect();
        // 进入进度：从元素顶部在视口下方约 0.4 屏时开始 3D 翻正，
        // 到元素顶部滑过视口上方 0.6 屏才完成——跨约 2 屏滚动，适中
        const entry = Math.max(0, Math.min(1, (vh() * 1.4 - r.top) / (vh() * 2.0)));
        if (entry >= 1) {
          settled.add(el);
          el.style.opacity = '';
          el.style.transform = '';
          return;
        }
        let opacity = 0.5;
        let transform = 'perspective(1000px) rotateX(34deg) rotateY(-16deg) translateY(90px) scale(0.85)';
        if (entry > 0) {
          const t = chunkyEase(entry); // 分段节奏，不丝滑
          opacity = 0.5 + 0.5 * t;
          transform = `perspective(1000px) rotateX(${(34 * (1 - t)).toFixed(2)}deg) rotateY(${(-16 * (1 - t)).toFixed(2)}deg) translateY(${(90 * (1 - t)).toFixed(1)}px) scale(${(1 - 0.15 * (1 - t)).toFixed(3)})`;
        }
        el.style.opacity = opacity;
        el.style.transform = transform;
      });
    }

    function onScroll() {
      if (!raf) { raf = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  });
}
