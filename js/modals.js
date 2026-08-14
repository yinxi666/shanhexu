/* ============================================================
   赓续血脉・数绘红旅 — 共享弹窗 (Modals)
   职责：视频播放 / 实践成果详情 / 图片灯箱
   约束：依赖 ui(showToast,bindImageFallbacks) / utils / focus-trap / data(loadJSON)；
         被 action-delegate.js 引用
   ============================================================ */

import { showToast, bindImageFallbacks, onOverlayClick } from './ui.js?v=2026081428';
import { icon } from './icons.js?v=2026081428';
import {
  getBasePath,
  safeAssetSrc,
  fallbackSrc,
  sanitizeUrl,
  escapeHtml,
  escapeAttr,
  getLikeCount,
  isPracticeLiked
} from './utils.js?v=2026081428';
import { trapFocus, releaseFocus, lockBodyScroll, unlockBodyScroll } from './focus-trap.js?v=2026081428';
import { getPractice } from './data.js?v=2026081428';

// 实践中途请求进行中的标记：仅在 await 窗口内占用，防止双开守卫（DOM 守卫在 await 前无效）
let _openingPracticeId = null;

// 实践成果详情弹窗
async function openPracticeDetail(id) {
  // 已打开或正在打开中则返回：守卫必须在 await 前同步执行，
  // 否则异步窗口内两个 open 都过 DOM 守卫，append 同 id overlay 且 lockBodyScroll 计数翻倍
  if (document.getElementById('practice-detail-overlay') || _openingPracticeId) return;
  _openingPracticeId = id;
  try {
    // 数据访问统一走 data.js，弹窗层不再自取 JSON
    const p = await getPractice(id);
    if (!p) { showToast('未找到该实践成果'); return; }
    // await 之后复查一次：防御 getPractice 未缓存时真异步窗口里的第二次打开
    if (document.getElementById('practice-detail-overlay')) return;

    const bp = getBasePath();
    const imgSrc = safeAssetSrc(p.image, bp);
    const fb = fallbackSrc();

    // Build gallery HTML
    let galleryHtml = '';
    if (p.gallery && p.gallery.length > 0) {
      galleryHtml = '<div class="gallery-thumb-list">' +
        p.gallery.map(g => {
          const src = safeAssetSrc(g, bp);
          return `<img src="${escapeAttr(src)}" class="gallery-thumb" data-action="open-lightbox" data-src="${escapeAttr(src)}" data-fallback="${escapeAttr(fb)}" loading="lazy" decoding="async" tabindex="0" role="button" aria-label="查看大图">`;
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
          ${p.video ? `
          <div class="practice-detail-video">
            <button class="btn primary small" data-action="open-practice-video" data-video-src="${escapeAttr(safeAssetSrc(p.video, bp))}">${icon('play')} 播放视频</button>
          </div>` : ''}
          <div class="practice-detail-actions">
            <span>${icon('calendar')} ${escapeHtml(p.createdAt || '')}</span>
            <span class="practice-detail-likes${isPracticeLiked(p.id) ? ' active' : ''}" data-action="like-practice" data-id="${escapeAttr(p.id)}" tabindex="0" role="button" aria-label="点赞" aria-pressed="${isPracticeLiked(p.id)}">${icon('heart')} <span class="like-count">${getLikeCount(p.id, p.likes || 0)}</span> 赞</span>
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
  } finally {
    _openingPracticeId = null;
  }
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
  // 单实例守卫：与其他两个弹窗对齐，防叠加弹窗 + 锁计数失衡
  if (document.querySelector('.lightbox-overlay')) return;
  let lb = document.createElement('div');
  lb.className = 'lightbox-overlay';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', '图片预览');
  lb.innerHTML = `<img src="${escapeAttr(safeSrc)}" class="lightbox-content" alt="" loading="lazy" decoding="async"><button class="lightbox-close" data-action="close-lightbox">✕</button>`;
  document.body.appendChild(lb);
  lockBodyScroll();
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
  unlockBodyScroll();
  releaseFocus();
}

// 实践视频弹窗（复用 pages.css 的 .video-modal-overlay 样式）
function openPracticeVideo(src) {
  const safeSrc = sanitizeUrl(src);
  if (!safeSrc) { showToast('视频地址无效'); return; }
  // 已打开则直接返回，避免重复触发叠加弹窗与锁计数失衡
  if (document.querySelector('.video-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-overlay';
  overlay.innerHTML = `
      <div class="video-modal" role="dialog" aria-modal="true" aria-label="实践视频">
        <button class="video-close" data-action="close-practice-video" aria-label="关闭视频">✕</button>
        <video controls autoplay playsinline></video>
      </div>
    `;
  document.body.appendChild(overlay);
  const video = overlay.querySelector('video');
  video.src = safeSrc;
  video.onerror = () => {
    closePracticeVideo();
    showToast('视频加载失败');
  };
  lockBodyScroll();
  overlay.classList.add('open');
  const modal = overlay.querySelector('.video-modal');
  const closeBtn = overlay.querySelector('.video-close');
  trapFocus(modal, { initialFocus: closeBtn, onClose: closePracticeVideo });
  onOverlayClick(overlay, closePracticeVideo);
}

// 实践视频关闭（模块级独立函数：供 trapFocus onClose 与 action-delegate 的 close-practice-video 共用）
function closePracticeVideo() {
  const overlay = document.querySelector('.video-modal-overlay');
  if (!overlay || !overlay.parentNode) return;
  const video = overlay.querySelector('video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.onerror = null;
  }
  overlay.remove();
  unlockBodyScroll();
  releaseFocus();
}

export { openPracticeDetail, openLightbox, closePracticeDetail, closeLightbox, openPracticeVideo, closePracticeVideo };
