/* ============================================================
   赓续血脉・数绘红旅 — 移动端底部导航 (Mobile Nav)
   职责：底部常驻导航栏（移动端显示）
   约束：依赖 utils(getBasePath)；被 app.js 初始化（所有页面）
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081516';
import { $ } from './ui.js?v=2026081516';
import { icon } from './icons.js?v=2026081516';

function initMobileNav() {
  if ($('.mobile-nav')) return;

  const bp = getBasePath();

  function isActive(page) {
    // 站点根(/)与部署子路径根(/shanhexu/)都是首页；子页取 pathname 末段文件名比对
    const pathname = location.pathname;
    const file = pathname.split('/').pop() || '';
    if (page === 'index' && (pathname === '/' || pathname.endsWith('/') || file === 'index.html')) return 'active';
    if (file === page + '.html') return 'active';
    if (page === 'guide' && file === 'detail.html') return 'active';
    return '';
  }

  const nav = document.createElement('nav');
  nav.className = 'mobile-nav';
  nav.setAttribute('aria-label', '移动端导航');
  nav.innerHTML = `
      <a href="${bp}index.html" class="${isActive('index')}">${icon('home')}<span>首页</span></a>
      <a href="${bp}pages/guide.html" class="${isActive('guide')}">${icon('pin')}<span>导览</span></a>
      <a href="${bp}pages/changzheng.html" class="${isActive('changzheng')}">${icon('flag')}<span>长征</span></a>
      <a href="${bp}pages/practice.html" class="${isActive('practice')}">${icon('trophy')}<span>实践</span></a>
      <a href="${bp}pages/message.html" class="${isActive('message')}">${icon('chat')}<span>留言</span></a>
      <a href="${bp}pages/policy.html" class="${isActive('policy')}">${icon('news')}<span>政策</span></a>
    `;
  document.body.appendChild(nav);
}

export { initMobileNav };
