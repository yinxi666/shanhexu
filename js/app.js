/* ============================================================
   赓续血脉・数绘红旅 — 应用入口
   职责：统一初始化所有 ES Module 模块，按固定顺序编排引导流程
   ============================================================ */

import * as RedPages from './pages.js?v=2026081007';
import * as RedCardGen from './cardgen.js?v=2026081007';
import * as RedLongMarch from './longmarch.js?v=2026081007';
import { initChatWidget } from './chat.js?v=2026081007';
import { initQuiz } from './quiz.js?v=2026081007';
import { initDarkMode } from './darkmode.js?v=2026081007';
import { initMobileNav } from './mobile-nav.js?v=2026081007';
import { initHomepageInnovation } from './homepage.js?v=2026081007';
import { loadVenues } from './venue-store.js?v=2026081007';
import { initActionDelegate } from './action-delegate.js?v=2026081007';
import { initEntranceAnimation } from './entrance-animation.js?v=2026081007';
import { loadLayout } from './layout-loader.js?v=2026081007';

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

  try {
    // 首页先启动入场动画（有 entrance-overlay 时才执行）
    if (!location.pathname.includes('/pages/')) {
      initEntranceAnimation();
    }

    // 先注册全局动作委托，替代 innerHTML + onclick
    initActionDelegate();

    // 1) 先渲染页面内容（产生 #modules 等容器）
    await RedPages.autoInit();

    // 2) 加载场馆数据（AI 聊天与首页时间线共享，必须先于下方功能初始化）
    await loadVenues();

    // 3) 长征沉浸页跳过 AI/问答/深色浮层；移动端导航与首页创新仍执行
    const isImmersive = location.pathname.includes('changzheng');
    if (!isImmersive) {
      initChatWidget();
      initDarkMode();
      initQuiz();
    }
    initMobileNav();
    initHomepageInnovation();
    initFlagVideo();

    // 4) 纪念卡弹窗（隐藏预建）
    RedCardGen.init();

    // 5) 长征页额外初始化手卷
    if (location.pathname.includes('changzheng')) {
      RedLongMarch.init();
    }
  } catch (err) {
    console.error('[App] 初始化失败:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
