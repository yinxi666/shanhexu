/* ============================================================
   赓续血脉・数绘红旅 — 移动端底部导航 (Mobile Nav)
   职责：底部常驻导航栏（移动端显示）
   约束：依赖 utils(getBasePath)；被 app.js 初始化（所有页面）
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081320';
import { $ } from './ui.js?v=2026081320';
import { icon } from './icons.js?v=2026081320';

function initMobileNav() {
  if ($('.mobile-nav')) return;

  const bp = getBasePath();
  const current = location.pathname.replace(/\/$/, '');

  function isActive(page) {
    // 根路径 pathname 去掉末尾 / 后是 ''，需单独判空
    if (page === 'index' && (current === '' || current.endsWith('index.html'))) return 'active';
    if (current.includes(page + '.html')) return 'active';
    if (page === 'guide' && current.includes('detail.html')) return 'active';
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
