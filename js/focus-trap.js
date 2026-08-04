/* ============================================================
   赓续血脉・数绘红旅 — 弹窗焦点管理工具
   职责：打开弹窗时转移焦点、困住 Tab、关闭时归还焦点
   ============================================================ */

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

let _activeTrap = null;

function _getFocusable(modal) {
  // 用 getClientRects 判断可见性：offsetParent 为 null 会把 position:fixed 元素（如吸底操作条）误排除
  return [...modal.querySelectorAll(FOCUSABLE_SELECTORS)]
    .filter(el => el.getClientRects().length > 0 && !el.hasAttribute('disabled'));
}

/* ---- 全站 body 滚动锁（计数式）：多弹窗叠加时，仅当计数归零才恢复滚动 ----
   避免某个弹窗 close() 无条件清空 overflow，破坏其它弹窗持有的滚动锁 */
let _bodyLockCount = 0;

function lockBodyScroll() {
  _bodyLockCount++;
  document.body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
  _bodyLockCount = Math.max(0, _bodyLockCount - 1);
  if (_bodyLockCount === 0) document.body.style.overflow = '';
}

function _handleKeyDown(e) {
  if (!_activeTrap) return;
  const { modal, onClose } = _activeTrap;

  if (e.key === 'Escape') {
    e.preventDefault();
    if (onClose) onClose();
    return;
  }

  if (e.key !== 'Tab') return;

  const focusable = _getFocusable(modal);
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const inside = modal.contains(active);

  if (e.shiftKey) {
    if (!inside || active === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (!inside || active === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/**
 * 激活焦点陷阱
 * @param {HTMLElement} modal - 弹窗根元素
 * @param {Object} options
 * @param {HTMLElement} [options.initialFocus] - 打开时优先聚焦的元素
 * @param {HTMLElement} [options.returnFocus] - 关闭时归还焦点的元素
 * @param {Function} [options.onClose] - Escape 触发的回调
 */
function trapFocus(modal, options = {}) {
  if (!modal) return;
  releaseFocus();

  _activeTrap = {
    modal,
    returnFocus: options.returnFocus || document.activeElement,
    onClose: options.onClose
  };

  modal.setAttribute('aria-modal', 'true');
  document.addEventListener('keydown', _handleKeyDown);

  // 延迟一帧，确保弹窗已渲染再聚焦
  requestAnimationFrame(() => {
    const focusable = _getFocusable(modal);
    const target = options.initialFocus || focusable[0] || modal;
    if (target && typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }
  });
}

/** 释放焦点陷阱，并把焦点还给触发元素 */
function releaseFocus() {
  if (!_activeTrap) return;

  const { modal, returnFocus } = _activeTrap;
  document.removeEventListener('keydown', _handleKeyDown);
  if (modal) modal.removeAttribute('aria-modal');

  _activeTrap = null;

  if (returnFocus && document.contains(returnFocus) && typeof returnFocus.focus === 'function') {
    returnFocus.focus({ preventScroll: true });
  }
}

export { trapFocus, releaseFocus, lockBodyScroll, unlockBodyScroll };
