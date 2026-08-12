/* ============================================================
   cz-card-modal — 长征纪念卡专属弹窗（自包含，零共享状态）
   职责：背景/精神选择器构建、Canvas 纪念卡生成、下载/分享
   依赖：utils/ui/icons/cardgen/focus-trap/cz-content
   ============================================================ */

import { getBasePath, escapeAttr, isTouchDevice } from './utils.js?v=2026081027';
import { $, showToast, onOverlayClick } from './ui.js?v=2026081027';
import { icon } from './icons.js?v=2026081027';
import { SPIRITS as CZ_SPIRITS, renderCard as czRenderCard, downloadDataUrl, shareDataUrl } from './cardgen.js?v=2026081027';
import { trapFocus, releaseFocus, lockBodyScroll, unlockBodyScroll } from './focus-trap.js?v=2026081027';
import { CZ_CARD_BGS } from './cz-content.js?v=2026081027';

// 精神词列表复用 cardgen 的 SPIRITS（静态 import 恒为数组，无需兜底副本）
const CZ_CARD_SPIRITS = CZ_SPIRITS;
const czCardModal = $('#cz-card-modal');
const czCardBgs = $('#cz-card-bgs');
const czCardSpirits = $('#cz-card-spirits');
const czCardName = $('#cz-card-name');
const czCardPreview = $('#cz-card-preview');
const czCardPreviewImg = $('#cz-card-preview-img');
const czCardSavehint = $('#cz-card-savehint');
let _czCardBg = 0;
let _czCardSpirit = 0;
let _czCardDataUrl = null;
let _czCardGenTimer = null;  // 生成中的背景图超时句柄（弹窗关闭时清除，防残留回调）

function buildCardModal() {
  if (!czCardBgs || !czCardSpirits) return;
  if (czCardBgs.children.length > 0) {
    // 已构建过：保留用户已选的背景/精神高亮
    czCardBgs.querySelectorAll('.cz-card-bg').forEach(x => x.classList.toggle('selected', parseInt(x.dataset.i, 10) === _czCardBg));
    czCardSpirits.querySelectorAll('.cz-card-chip').forEach(x => x.classList.toggle('selected', parseInt(x.dataset.i, 10) === _czCardSpirit));
    return;
  }
  const bp = getBasePath();
  czCardBgs.innerHTML = CZ_CARD_BGS.map((b, i) =>
    `<div class="cz-card-bg${i === 0 ? ' selected' : ''}" data-i="${i}" data-src="${escapeAttr(bp + b.src)}"><span>${b.label}</span></div>`
  ).join('');
  czCardBgs.querySelectorAll('.cz-card-bg').forEach(el => {
    const src = el.dataset.src;
    if (src) el.style.backgroundImage = 'url(' + src + ')';
    el.addEventListener('click', () => {
      _czCardBg = parseInt(el.dataset.i, 10);
      czCardBgs.querySelectorAll('.cz-card-bg').forEach(x => x.classList.toggle('selected', x === el));
    });
  });
  czCardSpirits.innerHTML = CZ_CARD_SPIRITS.map((s, i) =>
    `<button type="button" class="cz-card-chip${i === 0 ? ' selected' : ''}" data-i="${i}">${s}</button>`
  ).join('');
  czCardSpirits.querySelectorAll('.cz-card-chip').forEach(el => {
    el.addEventListener('click', () => {
      _czCardSpirit = parseInt(el.dataset.i, 10);
      czCardSpirits.querySelectorAll('.cz-card-chip').forEach(x => x.classList.toggle('selected', x === el));
    });
  });
}

export function openCardModal() {
  if (!czCardModal) return;
  buildCardModal();
  czCardModal.classList.add('open');
  czCardModal.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  trapFocus(czCardModal, {
    initialFocus: czCardName,
    onClose: closeCardModal
  });
}

export function closeCardModal() {
  if (!czCardModal || !czCardModal.classList.contains('open')) return;
  releaseFocus();
  czCardModal.classList.remove('open');
  czCardModal.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
  _czCardDataUrl = null; // 复位，避免重开后直接导出上一张旧卡面
  if (_czCardGenTimer) { clearTimeout(_czCardGenTimer); _czCardGenTimer = null; } // 生成中途关闭：清除挂起的超时回调
  if (czCardPreview) czCardPreview.classList.add('is-hidden'); // 隐藏预览，重开不残留旧卡面
  if (czCardPreviewImg) czCardPreviewImg.removeAttribute('src');
}

export function generateLongMarchCard() {
  const genBtn = $('#cz-card-gen');
  if (genBtn && genBtn.disabled) return;
  if (genBtn) { genBtn.disabled = true; genBtn.innerHTML = '正在盖章…'; }
  const resetBtn = () => { if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = icon('sparkle') + ' 生成纪念卡'; } };
  const name = (czCardName && czCardName.value.trim()) || '同学';
  const spirit = CZ_CARD_SPIRITS[_czCardSpirit] || '长征';
  const bg = CZ_CARD_BGS[_czCardBg] || CZ_CARD_BGS[0];
  const img = new Image();
  // 背景图挂起时 8 秒超时复位按钮，避免长期禁用（句柄存模块级，弹窗关闭时可清除）
  _czCardGenTimer = setTimeout(() => {
    if (genBtn && genBtn.disabled) { resetBtn(); showToast('背景图加载超时，请重试'); }
  }, 8000);
  img.onload = () => {
    clearTimeout(_czCardGenTimer);
    _czCardGenTimer = null;
    try {
      _czCardDataUrl = czRenderCard(img, spirit, name, '二万五千里 · 走完全程');
    } catch (e) {
      _czCardDataUrl = null;
      resetBtn();
      showToast('生成失败，请重试');
      return;
    }
    // 弹窗已关闭：不再写入预览/提示，避免在隐藏弹窗上残留状态
    if (czCardModal && !czCardModal.classList.contains('open')) { resetBtn(); return; }
    if (czCardPreview && czCardPreviewImg) {
      czCardPreviewImg.src = _czCardDataUrl;
      czCardPreview.classList.remove('is-hidden');
    }
    if (czCardSavehint) {
      const showHint = isTouchDevice() && window.innerWidth < 900;
      czCardSavehint.classList.toggle('is-hidden', !showHint);
    }
    resetBtn();
  };
  img.onerror = () => { clearTimeout(_czCardGenTimer); _czCardGenTimer = null; _czCardDataUrl = null; resetBtn(); showToast('背景图加载失败'); };
  img.src = getBasePath() + bg.src;
}

export function downloadLongMarchCard() {
  downloadDataUrl(_czCardDataUrl, '长征纪念卡_' + Date.now() + '.png');
}

export function shareLongMarchCard() {
  shareDataUrl(_czCardDataUrl, '长征纪念卡.png', '长征纪念卡', '我走完了二万五千里长征');
}

export function isCardModalOpen() {
  return !!czCardModal && czCardModal.classList.contains('open');
}

/* 弹窗按钮/遮罩接线（幂等，供 longmarch 初始化时调用一次） */
let _uiBound = false;
export function initCardModalUI() {
  if (_uiBound) return;
  _uiBound = true;
  const czCardClose = $('#cz-card-close');
  if (czCardClose) czCardClose.addEventListener('click', closeCardModal);
  if (czCardModal) onOverlayClick(czCardModal, closeCardModal);
  const czCardGen = $('#cz-card-gen');
  if (czCardGen) czCardGen.addEventListener('click', generateLongMarchCard);
  const czCardDownload = $('#cz-card-download');
  if (czCardDownload) czCardDownload.addEventListener('click', downloadLongMarchCard);
  const czCardShare = $('#cz-card-share');
  if (czCardShare) czCardShare.addEventListener('click', shareLongMarchCard);
}
