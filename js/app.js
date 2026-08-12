/* ============================================================
   赓续血脉・数绘红旅 — 应用入口
   职责：统一初始化所有 ES Module 模块，按固定顺序编排引导流程
   ============================================================ */

import * as RedPages from './pages.js?v=2026081314';
import * as RedCardGen from './cardgen.js?v=2026081314';
import * as RedLongMarch from './longmarch.js?v=2026081314';
import { initChatWidget } from './chat.js?v=2026081314';
import { initQuiz } from './quiz.js?v=2026081314';
import { initDarkMode } from './darkmode.js?v=2026081314';
import { initMobileNav } from './mobile-nav.js?v=2026081314';
import { initHomepageInnovation } from './homepage.js?v=2026081314';
import { loadVenues } from './venue-store.js?v=2026081314';
import { initActionDelegate } from './action-delegate.js?v=2026081314';
import { initEntranceAnimation } from './entrance-animation.js?v=2026081314';
import { initHeroCarousel } from './hero-carousel.js?v=2026081314';
import { loadLayout } from './layout-loader.js?v=2026081314';

/* ---------- 国旗视频：仅桌面大屏自动播放，且尊重"减少动效" ---------- */
function initFlagVideo() {
  const v = document.querySelector('.flag-video');
  if (!v) return;
  const desktop = window.matchMedia('(min-width: 1024px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const maybePlay = () => {
    if (desktop.matches && !reduced.matches) {
      v.play().catch(() => { /* 自动播放被浏览器拦截时静默，用户仍可手动播放 */ });
    }
  };
  if (desktop.addEventListener) {
    desktop.addEventListener('change', maybePlay);
    reduced.addEventListener('change', maybePlay);
  }
  maybePlay();
}

/* ---------- 全局初始化 ---------- */
async function boot() {
  // 共享布局注入独立降级：header/footer 缺失时跳过注入，不让整站初始化中断
  await loadLayout().catch((err) => {
    console.warn('[Layout] 共享布局注入失败，页面降级运行', err);
  });

  // 每个初始化步骤独立降级：单步失败不拖垮其余子系统
  //（此前全部塞进一个 try/catch，autoInit 一旦 reject 会静默跳过 chat/quiz/dark/nav/cardgen/longmarch）
  const safe = async (fn) => {
    try { await fn(); } catch (err) { console.error('[App] 初始化步骤失败:', err); }
  };

  // 首页先启动入场动画（有 entrance-overlay 时才执行）
  if (!location.pathname.includes('/pages/')) {
    await safe(initEntranceAnimation);
  }
  // Hero 背景轮播：任何带双图 hero 的页面（首页/全国导览）生效，无则 no-op
  await safe(initHeroCarousel);

  // 先注册全局动作委托，替代 innerHTML + onclick
  await safe(initActionDelegate);

  // 1) 先渲染页面内容（产生 #modules 等容器）
  await safe(RedPages.autoInit);

  // 2) 加载场馆数据（AI 聊天与首页时间线共享，必须先于下方功能初始化）
  await safe(loadVenues);

  // 3) 长征沉浸页跳过 AI/问答/深色浮层；移动端导航与首页创新仍执行
  const isImmersive = location.pathname.includes('changzheng');
  if (!isImmersive) {
    await safe(initChatWidget);
    await safe(initDarkMode);
    await safe(initQuiz);
  }
  await safe(initMobileNav);
  await safe(initHomepageInnovation);
  await safe(initFlagVideo);

  // 4) 纪念卡弹窗（隐藏预建）
  await safe(RedCardGen.init);

  // 5) 长征页额外初始化手卷
  if (location.pathname.includes('changzheng')) {
    await safe(RedLongMarch.init);
  }
  // 初始化完成标志（供 smoke 冒烟测试 waitForFunction 等待，替代固定 sleep 赌时序）
  try { window.__shanhexuBooted = true; } catch (e) { }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
