/* ============================================================
   赓续血脉・数绘红旅 — 共享弹窗 (Modals)
   职责：视频播放 / 实践成果详情 / 图片灯箱
   约束：依赖 ui(showToast,bindImageFallbacks) / utils / focus-trap / data(loadJSON)；
         被 action-delegate.js 引用
   ============================================================ */

import { showToast, bindImageFallbacks, onOverlayClick } from './ui.js?v=2026081016';
import { icon } from './icons.js?v=2026081016';
import {
  getBasePath,
  resolveAssetPath,
  fallbackSrc,
  sanitizeUrl,
  escapeHtml,
  escapeAttr,
  getLikeCount,
  isPracticeLiked
} from './utils.js?v=2026081016';
import { trapFocus, releaseFocus, lockBodyScroll, unlockBodyScroll } from './focus-trap.js?v=2026081016';
import { getPractice } from './data.js?v=2026081016';

// 实践成果详情弹窗
async function openPracticeDetail(id) {
  // 已打开则直接返回，避免异步窗口内重复触发生成双弹窗、锁计数失衡
  if (document.getElementById('practice-detail-overlay')) return;
  // 数据访问统一走 data.js，弹窗层不再自取 JSON
  const p = await getPractice(id);
  if (!p) { showToast('未找到该实践成果'); return; }

  const bp = getBasePath();
  const imgSrc = sanitizeUrl(resolveAssetPath(p.image, bp));
  const fb = fallbackSrc();

  // Build gallery HTML
  let galleryHtml = '';
  if (p.gallery && p.gallery.length > 0) {
    galleryHtml = '<div class="gallery-thumb-list">' +
      p.gallery.map(g => {
        const src = sanitizeUrl(resolveAssetPath(g, bp));
        return `<img src="${escapeAttr(src)}" class="gallery-thumb" data-action="open-lightbox" data-src="${escapeAttr(src)}" data-fallback="${escapeAttr(fb)}" loading="lazy" decoding="async">`;
      }).join('') +
      '</div>';
  }

  // 独立类名，避免与其他弹窗 .video-modal-overlay 混淆
  let overlay = document.createElement('div');
  overlay.className = 'practice-modal-overlay';
  overlay.id = 'practice-detail-overlay';
  overlay.innerHTML = `
      <div class="quiz-modal practice-detail-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(p.title)}">
        <button class="quiz-close practice-detail-close" data-action="close-practice-detail">✕</button>
        <img src="${escapeAttr(imgSrc)}" alt="${escapeHtml(p.title)}" class="practice-detail-hero" loading="lazy" decoding="async" data-fallback="${escapeAttr(fb)}">
        <div class="practice-detail-body">
          <h2 class="practice-detail-title">${escapeHtml(p.title)}</h2>
          <p class="practice-detail-team">${icon('users')} ${escapeHtml(p.team || '实践团队')}</p>
          <p class="practice-detail-summary">${escapeHtml(p.summary || '')}</p>
          ${galleryHtml}
          <div class="practice-detail-actions">
            <span>${icon('calendar')} ${escapeHtml(p.createdAt || '')}</span>
            <span class="practice-detail-likes${isPracticeLiked(p.id) ? ' active' : ''}" data-action="like-practice" data-id="${p.id}">${icon('heart')} <span class="like-count">${getLikeCount(p.id, p.likes || 0)}</span> 赞</span>
          </div>
        </div>
      </div>
    `;
  document.body.appendChild(overlay);
  bindImageFallbacks(overlay);
  lockBodyScroll();
  overlay.classList.add('open');
  const modal = overlay.querySelector('.quiz-modal');
  const closeBtn = overlay.querySelector('.quiz-close');
  trapFocus(modal, { initialFocus: closeBtn, onClose: closePracticeDetail });
  onOverlayClick(overlay, closePracticeDetail);
}

// 实践详情关闭（模块级独立函数：供弹窗内部与 action-delegate 的 close-practice-detail 共用，消除重复逻辑）
function closePracticeDetail() {
  const overlay = document.getElementById('practice-detail-overlay');
  if (!overlay || !overlay.parentNode) return;
  overlay.remove();
  unlockBodyScroll();
  releaseFocus();
}

// 图片灯箱
function openLightbox(src) {
  const safeSrc = sanitizeUrl(src);
  if (!safeSrc) { showToast('图片地址无效'); return; }
  let lb = document.createElement('div');
  lb.className = 'lightbox-overlay';
  lb.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;cursor:pointer;';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', '图片预览');
  lb.innerHTML = `<img src="${escapeAttr(safeSrc)}" class="lightbox-content" alt="" loading="lazy" decoding="async"><button class="lightbox-close" data-action="close-lightbox">✕</button>`;
  document.body.appendChild(lb);
  const closeBtn = lb.querySelector('.lightbox-close');
  // 点遮罩关闭走统一 onOverlayClick（e.target===overlay），点图片/内容不关闭，与其余 7 个遮罩语义一致；
  // ✕ 按钮仍经 data-action=close-lightbox 由 action-delegate 处理
  onOverlayClick(lb, closeLightbox);
  trapFocus(lb, { initialFocus: closeBtn, onClose: closeLightbox });
}

// 图片灯箱关闭（模块级独立函数：供 trapFocus onClose 与 action-delegate 的 close-lightbox 共用，消除关闭路径重复）
function closeLightbox() {
  const lb = document.querySelector('.lightbox-overlay');
  if (!lb || !lb.parentNode) return;
  lb.remove();
  releaseFocus();
}

export { openPracticeDetail, openLightbox, closePracticeDetail, closeLightbox };
