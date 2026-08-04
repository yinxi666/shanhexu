/* ============================================================
   赓续血脉・数绘红旅 — 共享 UI 原子 (UI Atoms)
   职责：导航折叠 / 返回顶部 / 帷幕 / 页头滚动 / 滚动动画 /
         右键拦截 / ViewTransitions / Toast / 图片回退 / 跳转
   约束：只依赖 utils.js，被 pages/music/modals/cardgen/longmarch/action-delegate 引用
   ============================================================ */

import { getBasePath } from './utils.js?v=2026080416';

const $ = (sel, ctx) => (ctx || document).querySelector(sel);

/* 统一绑定图片失败回退：避免在 HTML 字符串里写 onerror 内联处理器 */
function bindImageFallbacks(container) {
  if (!container) return;
  container.querySelectorAll('img[data-fallback]').forEach(img => {
    const fb = img.dataset.fallback;
    if (!fb) return;
    img.onerror = function () {
      img.onerror = null;
      img.src = fb;
    };
  });
}

// 跳转详情
function goToDetail(id) {
  location.href = getBasePath() + 'pages/detail.html?id=' + encodeURIComponent(id);
}

// Toast 提示
function showToast(message, duration = 2500) {
  let toast = $('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
}

// 移动端导航折叠
function initNavigation() {
  const navToggle = $('.nav-toggle');
  const navLinks = $('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-label', isOpen ? '收起导航' : '展开导航');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.textContent = isOpen ? '✕' : '☰';
    });
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') navLinks.classList.remove('open');
    });
  }
  // 当前页高亮（含 aria-current、详情页→导览）由 layout-loader.setActiveNav 注入共享页头时统一处理，
  // 本函数只负责移动端折叠交互，避免两份高亮逻辑漂移
}

// 返回顶部
function initBackToTop() {
  let btn = $('.back-to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', '返回顶部');
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        btn.classList.toggle('visible', window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ---------- 帷幕页面切换 ---------- */
function initCurtainTransition() {
  const curtain = document.getElementById('nav-curtain');
  if (!curtain) return;
  let locked = false;
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a');
    if (!a || curtain.classList.contains('go')) return;
    if (locked) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('blob:') || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.getAttribute('target') === '_blank') return;
    e.preventDefault();
    locked = true;
    curtain.classList.add('go');
    setTimeout(function () { location.href = href; }, 450);
  });
  window.addEventListener('pageshow', function () { locked = false; curtain.classList.remove('go'); });
}

/* ---------- View Transitions 方向追踪（纯增强，不拦截导航） ---------- */
function initViewTransitions() {
  function getPageDepth(path) {
    if (path.endsWith('/') || path.endsWith('index.html')) return 0;
    if (path.includes('detail.html')) return 2;
    return 1;
  }
  const currentDepth = getPageDepth(location.pathname);

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript')) return;

    try {
      const targetURL = new URL(href, location.href);
      if (targetURL.origin !== location.origin) return;
      const targetDepth = getPageDepth(targetURL.pathname);
      const html = document.documentElement;
      html.removeAttribute('data-vt-dir');
      if (targetDepth > currentDepth) html.setAttribute('data-vt-dir', 'forward');
      else if (targetDepth < currentDepth) html.setAttribute('data-vt-dir', 'back');
    } catch (_) { /* URL 解析失败，忽略 */ }
  });

  window.addEventListener('pageshow', () => {
    setTimeout(() => document.documentElement.removeAttribute('data-vt-dir'), 600);
  });
}

/* ---------- 导航栏滚动效果 ---------- */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ---------- Intersection Observer 滚动动画 ---------- */
let _scrollObserver = null;

function initScrollAnimations() {
  if (_scrollObserver) _scrollObserver.disconnect();
  _scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  document.querySelectorAll('.scroll-animate').forEach(el => {
    _scrollObserver.observe(el);
  });
}

/* 右键拦截（仅限 .no-context-menu 区域，防截图水印被下载） */
function initContextMenuBlock() {
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.no-context-menu')) e.preventDefault();
  });
}

/* 复制分享链接（非安全上下文优雅降级） */
function copyShareLink(text) {
  const url = location.href;
  // 非安全上下文（file:// / http）下 navigator.clipboard 可能不存在，直接访问会同步抛错
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    showToast('❌ 当前环境不支持复制，请手动复制地址栏');
    return;
  }
  navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
    showToast('✅ 链接已复制到剪贴板');
  }).catch(() => {
    showToast('❌ 复制失败，请手动复制地址栏');
  });
}

export {
  bindImageFallbacks,
  goToDetail,
  showToast,
  initNavigation,
  initBackToTop,
  initCurtainTransition,
  initViewTransitions,
  initHeaderScroll,
  initScrollAnimations,
  initContextMenuBlock,
  copyShareLink
};
