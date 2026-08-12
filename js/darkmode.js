/* ============================================================
   赓续血脉・数绘红旅 — 深色模式 (Dark Mode)
   职责：深色切换按钮 + localStorage 持久化
   约束：依赖 icons（图标）；被 app.js（初始化）与 action-delegate.js（toggleDarkMode）引用
   ============================================================ */

import { icon } from './icons.js?v=2026081314';

/* 浏览器地址栏/任务栏颜色跟随主题 */
function applyThemeColor(isDark) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', isDark ? '#0f172a' : '#b91c1c');
}

function initDarkMode() {
  const toggle = document.createElement('button');
  toggle.className = 'dark-toggle';
  toggle.setAttribute('aria-label', '切换深色模式');
  toggle.innerHTML = icon('moon');
  toggle.title = '切换深色/浅色模式';
  document.body.appendChild(toggle);

  try {
    const saved = localStorage.getItem('redguide_dark');
    if (saved === '1') {
      document.documentElement.classList.add('dark');
      toggle.innerHTML = icon('sun');
    }
  } catch (e) { }

  applyThemeColor(document.documentElement.classList.contains('dark'));

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    toggle.innerHTML = isDark ? icon('sun') : icon('moon');
    try { localStorage.setItem('redguide_dark', isDark ? '1' : '0'); } catch (e) { }
    applyThemeColor(isDark);
  });
}

// 程序化切换：供 action-delegate 的 toggle-dark case 调用
function toggleDarkMode() {
  const t = document.querySelector('.dark-toggle');
  if (t) t.click();
}

export { initDarkMode, toggleDarkMode };
