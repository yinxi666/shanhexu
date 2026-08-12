/* ============================================================
   cz-modals — 长征手卷页弹窗：文物详情 + 终点成就（自包含）
   依赖：cz-stations(STATIONS) / cz-content(RELIC_MAP) / focus-trap / ui / cz-card-modal
   ============================================================ */

import { $, onOverlayClick } from './ui.js?v=2026081027';
import { trapFocus, releaseFocus, lockBodyScroll, unlockBodyScroll } from './focus-trap.js?v=2026081027';
import { STATIONS } from './cz-stations.js?v=2026081027';
import { RELIC_MAP } from './cz-content.js?v=2026081027';

/* ---------- 文物详情弹窗 ---------- */
const relicModal = $('#cz-relic-modal');
const relicSvgBox = $('#cz-relic-svg');
const relicNameEl = $('#cz-relic-name');
const relicStoryEl = $('#cz-relic-story');
const relicStationEl = $('#cz-relic-station');

export function openRelicDetail(stationId) {
  const s = STATIONS[stationId - 1];
  const relic = RELIC_MAP[s && s.id];
  if (!s || !relic || !relicModal) return;
  if (relicSvgBox) relicSvgBox.innerHTML = relic.svg;
  if (relicNameEl) relicNameEl.textContent = relic.name;
  if (relicStoryEl) relicStoryEl.textContent = relic.story;
  if (relicStationEl) relicStationEl.textContent = `${s.name} · ${s.date} · 已走 ${s.miles} 里`;
  relicModal.classList.add('show');
  relicModal.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  const closeBtn = $('#cz-relic-close');
  trapFocus(relicModal, {
    initialFocus: closeBtn,
    onClose: closeRelic
  });
}

export function closeRelic() {
  // 仅当文物弹窗确实打开时才解锁，避免 Escape 误触发把滚动锁计数减穿
  if (!relicModal || !relicModal.classList.contains('show')) return;
  releaseFocus();
  relicModal.classList.remove('show');
  relicModal.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
}

/* ---------- 终点成就：走完全程 → 长征纪念卡 ---------- */
const completeOverlay = $('#cz-complete');
let _completeShown = false;

export function showComplete() {
  if (!completeOverlay) return;
  _completeShown = true;
  completeOverlay.classList.add('show');
  completeOverlay.setAttribute('aria-hidden', 'false');
  lockBodyScroll();
  const completeBtn = $('#cz-complete-btn');
  trapFocus(completeOverlay, {
    initialFocus: completeBtn,
    onClose: closeComplete
  });
}

export function closeComplete() {
  if (!completeOverlay || !completeOverlay.classList.contains('show')) return;
  releaseFocus();
  completeOverlay.classList.remove('show');
  completeOverlay.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
  _completeShown = false;
}

/* 是否已触发终点成就（longmarch setActive 的守卫用，替代原 _completeShown） */
export function isCompleteShown() {
  return _completeShown;
}

/* 弹窗当前是否打开（longmarch 的 Escape/键盘守卫用） */
export function isRelicOpen() {
  return !!relicModal && relicModal.classList.contains('show');
}
export function isCompleteOpen() {
  return !!completeOverlay && completeOverlay.classList.contains('show');
}

/* 弹窗遮罩接线（幂等，供 longmarch 初始化时调用一次） */
let _uiBound = false;
export function initModalsUI() {
  if (_uiBound) return;
  _uiBound = true;
  if (relicModal) onOverlayClick(relicModal, closeRelic);
  if (completeOverlay) onOverlayClick(completeOverlay, closeComplete);
}
