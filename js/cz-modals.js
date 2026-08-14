/* ============================================================
   cz-modals — 长征手卷页弹窗：文物详情 + 终点成就（自包含）
   依赖：cz-stations(STATIONS) / cz-content(RELIC_MAP) / focus-trap / ui / cz-card-modal
   ============================================================ */

import { $, onOverlayClick } from './ui.js?v=2026081428';
import { trapFocus, lockBodyScroll, closeModal } from './focus-trap.js?v=2026081428';
import { STATIONS } from './cz-stations.js?v=2026081428';
import { RELIC_MAP } from './cz-content.js?v=2026081428';

/* ---------- 文物详情弹窗 ---------- */
const relicModal = $('#cz-relic-modal');
const relicSvgBox = $('#cz-relic-svg');
const relicNameEl = $('#cz-relic-name');
const relicStoryEl = $('#cz-relic-story');
const relicStationEl = $('#cz-relic-station');

export function openRelicDetail(stationId) {
  // 幂等：已打开时快速重入（连点/多站触发）不重复压 body 锁与 focus-trap
  if (relicModal && relicModal.classList.contains('show')) return;
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
  closeModal(relicModal, 'show');
}

/* ---------- 终点成就：走完全程 → 长征纪念卡 ---------- */
const completeOverlay = $('#cz-complete');

export function showComplete() {
  if (!completeOverlay || completeOverlay.classList.contains('show')) return;
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
  closeModal(completeOverlay, 'show');
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
