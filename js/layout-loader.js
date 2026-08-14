/* ============================================================
   赓续血脉・数绘红旅 — 共享布局加载器
   职责：从 templates/ 注入公共 header/footer
   注意：导航高亮由 setActiveNav() 在注入后统一处理（含 aria-current）
   ============================================================ */

import { ASSET_VERSION } from './version.js?v=2026081431';
import { getBasePath } from './utils.js?v=2026081431';

function resolveTemplate(name, base) {
  // 模板也带版本号缓存破击，避免修改 header/footer 后线上最长 10 分钟不生效
  return `${base}templates/${name}.html?v=${ASSET_VERSION}`;
}

async function loadTemplate(name, base) {
  const url = resolveTemplate(name, base);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[Layout] 加载模板失败 ${url}: ${res.status}`);
  return await res.text();
}

function applyBase(template, base) {
  return template.replace(/\{\{BASE\}\}/g, base);
}

function applyFooterExtra() {
  const extraTemplate = document.getElementById('footer-extra');
  if (!extraTemplate) return;
  const target = document.querySelector('footer.site-footer .footer-extra');
  if (target) {
    target.innerHTML = extraTemplate.innerHTML;
  }
  // 模板内容已拷入 footer，移除惰性 <template>，避免 6 页 body 残留隐藏模板
  extraTemplate.remove();
}

function setActiveNav() {
  const curPath = location.pathname.replace(/\/+$/, '');
  const curFile = curPath.split('/').pop() || '';
  const currentFile = /\.html$/i.test(curFile) ? curFile : 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript')) return;
    const target = '/' + href.replace(/^(\.\.\/|\.\/)+/, '');
    const targetFile = target.split('/').pop() || '';
    if (!targetFile) return;
    const isDetailPage = currentFile === 'detail.html';
    const targetIsGuide = targetFile === 'guide.html';
    if (targetFile === currentFile || (isDetailPage && targetIsGuide)) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

export async function loadLayout() {
  const base = getBasePath();
  // 各自独立降级：header 或 footer 任一失败不影响另一个注入
  const [headerRes, footerRes] = await Promise.allSettled([
    loadTemplate('site-header', base),
    loadTemplate('site-footer', base)
  ]);
  const headerHtml = headerRes.status === 'fulfilled' ? headerRes.value : '';
  const footerHtml = footerRes.status === 'fulfilled' ? footerRes.value : '';

  const headerPlaceholder = document.getElementById('site-header');
  const footerPlaceholder = document.getElementById('site-footer');

  if (headerPlaceholder) {
    headerPlaceholder.insertAdjacentHTML('beforebegin', applyBase(headerHtml, base));
    headerPlaceholder.remove();
    setActiveNav();
  }
  if (footerPlaceholder) {
    footerPlaceholder.insertAdjacentHTML('beforebegin', applyBase(footerHtml, base));
    footerPlaceholder.remove();
    applyFooterExtra();
  }
}
