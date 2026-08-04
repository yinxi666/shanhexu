/* ============================================================
   赓续血脉・数绘红旅 — 深色模式 (Dark Mode)
   职责：深色切换按钮 + localStorage 持久化
   约束：零依赖；被 app.js（初始化）与 action-delegate.js（toggleDarkMode）引用
   ============================================================ */

function initDarkMode() {
  const toggle = document.createElement('button');
  toggle.className = 'dark-toggle';
  toggle.setAttribute('aria-label', '切换深色模式');
  toggle.innerHTML = '🌙';
  toggle.title = '切换深色/浅色模式';
  document.body.appendChild(toggle);

  try {
    const saved = localStorage.getItem('redguide_dark');
    if (saved === '1') {
      document.documentElement.classList.add('dark');
      toggle.innerHTML = '☀️';
    }
  } catch (e) { }

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    toggle.innerHTML = isDark ? '☀️' : '🌙';
    try { localStorage.setItem('redguide_dark', isDark ? '1' : '0'); } catch (e) { }
  });
}

// 程序化切换：供 action-delegate 的 toggle-dark case 调用
function toggleDarkMode() {
  const t = document.querySelector('.dark-toggle');
  if (t) t.click();
}

export { initDarkMode, toggleDarkMode };
