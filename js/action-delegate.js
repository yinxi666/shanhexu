/* ============================================================
   赓续血脉・数绘红旅 — 全局动作委托模块
   职责：把 innerHTML + onclick 改为 data-action + 事件委托
   约束：只做"派发"，动作实现来自各单职责模块
   ============================================================ */

import { goToDetail, showToast } from './ui.js?v=2026081314';
import { openPracticeDetail, openLightbox, closePracticeDetail, closeLightbox, openPracticeVideo, closePracticeVideo } from './modals.js?v=2026081314';
import { likePractice, copyShareLinkFromDetail, resetMessageForm } from './pages.js?v=2026081314';
import { toggleFavorite } from './favorites.js?v=2026081314';

import { openChat } from './chat.js?v=2026081314';
import { openQuiz } from './quiz.js?v=2026081314';
import { toggleDarkMode } from './darkmode.js?v=2026081314';
import { icon } from './icons.js?v=2026081314';
import * as RedCardGen from './cardgen.js?v=2026081314';

export function initActionDelegate() {
  document.addEventListener('click', handleAction);
  // 键盘可达：对 div 类 data-action 交互区(场馆卡/实践卡/时间线节点等)在 Enter/Space 时触发同一动作
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.repeat) return; // 长按不重复触发，避免非幂等动作被执行多次
    const t = e.target;
    // 焦点在原生交互元素上时交给浏览器默认行为（不劫持内嵌按钮/链接）
    if (t && /^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const el = t && t.closest ? t.closest('[data-action]') : null;
    if (!el) return;
    e.preventDefault();
    handleAction(e);
  });
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

    case 'like-practice':
      likePractice(actionEl, actionEl.dataset.id);
      break;

    case 'open-lightbox':
      openLightbox(actionEl.dataset.src);
      break;

    case 'close-practice-detail':
      closePracticeDetail();
      break;

    case 'close-lightbox':
      closeLightbox();
      break;

    case 'open-practice-video':
      openPracticeVideo(actionEl.dataset.videoSrc);
      break;

    case 'close-practice-video':
      closePracticeVideo();
      break;

    case 'open-cardgen':
      RedCardGen.open(actionEl.dataset.name, actionEl.dataset.image);
      break;

    case 'copy-share-link':
      copyShareLinkFromDetail();  // 读 #detail-name 的实现在 pages.js（页面归属方）
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
      resetMessageForm();  // 读 #message-form-card/#msg-form 的实现在 pages.js（页面归属方）
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
  if (nx === null) { showToast('收藏保存失败，请检查浏览器存储'); return; } // 写失败：不改 UI，避免界面与存储发散
  btn.innerHTML = icon('heart'); // 收藏态由 .active 的 CSS fill 区分
  btn.classList.toggle('active', nx);
  btn.setAttribute('aria-pressed', String(nx));
}
