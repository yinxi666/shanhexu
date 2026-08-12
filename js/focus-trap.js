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

// 焦点陷阱栈：嵌套弹窗（如实践详情内打开灯箱、长征完成弹窗内打开纪念卡）时，
// 新 trap 压栈、旧 trap 保留；关闭时弹栈并恢复下层 trap 的 Tab 圈禁与 aria-modal。
// 此前单 trap 模型 trapFocus 先 releaseFocus，下层弹窗关闭时焦点陷阱永久丢失、Tab 漫游整页
let _traps = [];

function _topTrap() {
  return _traps[_traps.length - 1] || null;
}

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

/* 弹窗关闭公共序列：释放焦点陷阱 + 移除展示类 + 复位 aria-hidden + 释放滚动锁。
   activeClass 做幂等守卫（仅当确实打开才执行），供多个弹窗 close 复用 */
function closeModal(el, activeClass) {
  if (!el || !el.classList.contains(activeClass)) return;
  releaseFocus();
  el.classList.remove(activeClass);
  el.setAttribute('aria-hidden', 'true');
  unlockBodyScroll();
}

function _handleKeyDown(e) {
  const trap = _topTrap();
  if (!trap) return;
  const { modal, onClose } = trap;

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

  // 新弹窗接管 aria-modal 语义（仅最上层保持 modal），下层 trap 留在栈中待恢复
  const prev = _topTrap();
  if (prev) prev.modal.removeAttribute('aria-modal');
  _traps.push({
    modal,
    returnFocus: options.returnFocus || document.activeElement,
    onClose: options.onClose
  });
  modal.setAttribute('aria-modal', 'true');
  // 栈从空到非空时才挂全局监听，避免多次 trapFocus 叠加多个监听器
  if (_traps.length === 1) document.addEventListener('keydown', _handleKeyDown);

  // 延迟一帧，确保弹窗已渲染再聚焦
  requestAnimationFrame(() => {
    const focusable = _getFocusable(modal);
    const target = options.initialFocus || focusable[0] || modal;
    if (target && typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }
  });
}

/** 弹出顶层焦点陷阱，并把焦点还给其触发元素；若下层还有弹窗，恢复其 Tab 圈禁与 aria-modal */
function releaseFocus() {
  const trap = _traps.pop();
  if (!trap) return;

  const { modal, returnFocus } = trap;
  if (modal) modal.removeAttribute('aria-modal');

  const next = _topTrap();
  if (next) {
    next.modal.setAttribute('aria-modal', 'true');
  } else {
    document.removeEventListener('keydown', _handleKeyDown);
  }

  if (returnFocus && document.contains(returnFocus) && typeof returnFocus.focus === 'function') {
    returnFocus.focus({ preventScroll: true });
  }
}

export { trapFocus, releaseFocus, lockBodyScroll, unlockBodyScroll, closeModal };
