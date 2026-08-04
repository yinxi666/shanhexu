/* ============================================================
   赓续血脉・数绘红旅 — 共享弹窗 (Modals)
   职责：视频播放 / 实践成果详情 / 图片灯箱
   约束：依赖 ui(showToast,bindImageFallbacks) / utils / focus-trap / data(loadJSON)；
         被 pages.js / action-delegate.js 引用
   ============================================================ */

import { showToast, bindImageFallbacks } from './ui.js?v=2026080416';
import {
  getBasePath,
  resolveAssetPath,
  fallbackSrc,
  sanitizeUrl,
  escapeHtml,
  escapeAttr,
  getLikeCount
} from './utils.js?v=2026080416';
import { trapFocus, releaseFocus } from './focus-trap.js?v=2026080416';
import { loadJSON } from './data.js?v=2026080416';

// 视频弹窗
function openVideo(src) {
  let overlay = document.querySelector('.video-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'video-modal-overlay';
    overlay.innerHTML = `
        <div class="video-modal" role="dialog" aria-modal="true" aria-label="视频播放">
          <button class="video-close" aria-label="关闭视频">✕</button>
          <video controls autoplay src=""></video>
        </div>
      `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('video-close')) {
        closeVideo();
      }
    });
  }
  const video = overlay.querySelector('video');
  const closeBtn = overlay.querySelector('.video-close');
  video.src = src;
  video.onerror = function () {
    closeVideo();
    showToast('视频加载失败');
  };
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  trapFocus(overlay.querySelector('.video-modal'), {
    initialFocus: closeBtn,
    onClose: closeVideo
  });

  function closeVideo() {
    // 仅当视频弹窗确实打开时才释放滚动锁，避免 Escape 误触清掉其他弹窗的锁
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    video.pause();
    video.src = '';
    video.onerror = null;
    document.body.style.overflow = '';
    releaseFocus();
  }
}

// 实践成果详情弹窗
async function openPracticeDetail(id) {
  let practices;
  try { practices = await loadJSON('data/practices.json'); } catch (e) { practices = []; }
  const p = practices.find(x => String(x.id) === String(id));
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

  const videoSrc = p.video ? sanitizeUrl(resolveAssetPath(p.video, bp)) : '';

  // 独立类名，避免与视频弹窗 .video-modal-overlay 混淆（此前 openVideo 会误命中本弹窗导致崩溃）
  let overlay = document.createElement('div');
  overlay.className = 'practice-modal-overlay';
  overlay.id = 'practice-detail-overlay';
  overlay.innerHTML = `
      <div class="quiz-modal practice-detail-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(p.title)}">
        <button class="quiz-close practice-detail-close" data-action="close-practice-detail">✕</button>
        <img src="${escapeAttr(imgSrc)}" alt="${escapeHtml(p.title)}" class="practice-detail-hero" loading="lazy" decoding="async" data-fallback="${escapeAttr(fb)}">
        <div class="practice-detail-body">
          <h2 class="practice-detail-title">${escapeHtml(p.title)}</h2>
          <p class="practice-detail-team">👥 ${escapeHtml(p.team || '实践团队')}</p>
          <p class="practice-detail-summary">${escapeHtml(p.summary || '')}</p>
          ${galleryHtml}
          ${videoSrc ? `
          <div class="practice-detail-section">
            <button class="btn primary small" data-action="play-video" data-src="${escapeAttr(videoSrc)}">▶ 播放视频</button>
          </div>` : ''}
          <div class="practice-detail-actions">
            <span>📅 ${escapeHtml(p.createdAt || '')}</span>
            <span class="practice-detail-likes" data-action="like-practice" data-id="${p.id}">❤️ <span class="like-count">${getLikeCount(p.id, p.likes || 0)}</span> 赞</span>
          </div>
        </div>
      </div>
    `;
  document.body.appendChild(overlay);
  bindImageFallbacks(overlay);
  document.body.style.overflow = 'hidden';
  overlay.classList.add('open');
  const modal = overlay.querySelector('.quiz-modal');
  const closeBtn = overlay.querySelector('.quiz-close');
  trapFocus(modal, { initialFocus: closeBtn, onClose: closePracticeDetail });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      closePracticeDetail();
    }
  });

  function closePracticeDetail() {
    if (!overlay.parentNode) return;
    overlay.remove();
    document.body.style.overflow = '';
    releaseFocus();
  }
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
  lb.dataset.action = 'close-lightbox';
  document.body.appendChild(lb);
  const closeBtn = lb.querySelector('.lightbox-close');
  trapFocus(lb, { initialFocus: closeBtn, onClose: closeLightbox });

  function closeLightbox() {
    if (!lb.parentNode) return;
    lb.remove();
    releaseFocus();
  }
}

export { openVideo, openPracticeDetail, openLightbox };
