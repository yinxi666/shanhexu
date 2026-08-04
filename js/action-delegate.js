/* ============================================================
   赓续血脉・数绘红旅 — 全局动作委托模块
   职责：把 innerHTML + onclick 改为 data-action + 事件委托
   约束：只做"派发"，动作实现来自各单职责模块
   ============================================================ */

import { goToDetail, copyShareLink } from './ui.js?v=2026080416';
import { openVideo, openPracticeDetail, openLightbox } from './modals.js?v=2026080416';
import { likePractice } from './pages.js?v=2026080416';
import { toggleFavorite } from './favorites.js?v=2026080416';
import { openChat } from './chat.js?v=2026080416';
import { openQuiz } from './quiz.js?v=2026080416';
import { toggleDarkMode } from './darkmode.js?v=2026080416';
import * as RedCardGen from './cardgen.js?v=2026080416';
import { releaseFocus } from './focus-trap.js?v=2026080416';

const $ = (sel, ctx) => (ctx || document).querySelector(sel);

export function initActionDelegate() {
  document.addEventListener('click', handleAction);
}

function handleAction(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  // 阻止冒泡，保持与原 onclick 行为一致
  e.stopPropagation();

  const action = actionEl.dataset.action;

  switch (action) {
    case 'go-detail':
      goToDetail(actionEl.dataset.id);
      break;

    case 'toggle-favorite':
      handleToggleFavorite(actionEl);
      break;

    case 'open-practice':
      openPracticeDetail(actionEl.dataset.id);
      break;

    case 'play-video':
      openVideo(actionEl.dataset.src);
      break;

    case 'like-practice':
      likePractice(actionEl, actionEl.dataset.id);
      break;

    case 'open-lightbox':
      openLightbox(actionEl.dataset.src);
      break;

    case 'close-practice-detail':
      document.getElementById('practice-detail-overlay')?.remove();
      document.body.style.overflow = '';
      releaseFocus();
      break;

    case 'close-lightbox':
      actionEl.closest('.lightbox-overlay')?.remove();
      releaseFocus();
      break;

    case 'open-card-gen':
    case 'open-cardgen':
      RedCardGen.open(actionEl.dataset.name, actionEl.dataset.image);
      break;

    case 'copy-share-link':
      copyShareLink($('#detail-name')?.textContent || '');
      break;

    case 'print-page':
      window.print();
      break;

    case 'open-chat':
      openChat();
      break;

    case 'open-quiz':
      openQuiz();
      break;

    case 'toggle-dark':
      toggleDarkMode();
      break;

    case 'reset-message-form':
      handleResetMessageForm();
      break;

    default:
      // 未知动作不拦截，让默认行为继续
      break;
  }
}

function handleToggleFavorite(btn) {
  const id = btn.dataset.id;
  if (!id) return;
  const nx = toggleFavorite(id);
  btn.innerHTML = nx ? '❤️' : '🤍';
  btn.classList.toggle('active', nx);
  btn.setAttribute('aria-pressed', String(nx));
}

function handleResetMessageForm() {
  const fc = document.getElementById('message-form-card');
  if (!fc) return;
  const body = fc.querySelector('.form-body');
  const success = fc.querySelector('.form-success');
  const form = document.getElementById('msg-form');
  if (body) body.classList.remove('is-hidden');
  if (success) success.classList.remove('show');
  if (form) form.reset();
}
