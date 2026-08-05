import { useEffect, useRef } from 'react';

const DIALOG_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

const dialogStack = [];
let scrollLockCount = 0;
let scrollSnapshot = null;

function isVisible(element) {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden'
    && style.display !== 'none'
    && element.getClientRects().length > 0;
}

function focusableElements(dialog) {
  return Array.from(dialog.querySelectorAll(DIALOG_FOCUSABLE)).filter(isVisible);
}

function lockDocumentScroll(dialog) {
  const body = document.body;
  const html = document.documentElement;
  if (scrollLockCount === 0) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const ancestors = [];
    let current = dialog?.parentElement || null;

    while (current && current !== body && current !== html) {
      const style = window.getComputedStyle(current);
      const scrollable = /(auto|scroll|overlay)/.test(`${style.overflow} ${style.overflowY} ${style.overflowX}`)
        || current.scrollHeight > current.clientHeight
        || current.scrollWidth > current.clientWidth;
      if (scrollable) {
        ancestors.push({
          element: current,
          overflow: current.style.overflow,
          overflowX: current.style.overflowX,
          overflowY: current.style.overflowY,
          overscrollBehavior: current.style.overscrollBehavior,
          scrollTop: current.scrollTop,
          scrollLeft: current.scrollLeft,
        });
        current.style.overflow = 'hidden';
        current.style.overflowX = 'hidden';
        current.style.overflowY = 'hidden';
        current.style.overscrollBehavior = 'none';
      }
      current = current.parentElement;
    }

    let touchStartY = 0;
    const onTouchStart = (event) => {
      touchStartY = event.touches?.[0]?.clientY ?? 0;
    };
    const onTouchMove = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const scrollArea = target?.closest('.at-modal__content, [data-modal-scroll-region="true"]');
      if (!scrollArea || !dialog?.contains(scrollArea)) {
        event.preventDefault();
        return;
      }

      const currentY = event.touches?.[0]?.clientY ?? touchStartY;
      const deltaY = currentY - touchStartY;
      const atTop = scrollArea.scrollTop <= 0;
      const atBottom = Math.ceil(scrollArea.scrollTop + scrollArea.clientHeight) >= scrollArea.scrollHeight;
      const pullingDownPastTop = deltaY > 0 && atTop;
      const pushingUpPastBottom = deltaY < 0 && atBottom;
      if (pullingDownPastTop || pushingUpPastBottom) event.preventDefault();
    };

    scrollSnapshot = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      scrollX,
      scrollY,
      ancestors,
      onTouchStart,
      onTouchMove,
    };

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.right = '0';
    body.style.width = '100%';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  }
  scrollLockCount += 1;

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount !== 0 || !scrollSnapshot) return;

    document.removeEventListener('touchstart', scrollSnapshot.onTouchStart, true);
    document.removeEventListener('touchmove', scrollSnapshot.onTouchMove, true);

    for (const snapshot of scrollSnapshot.ancestors) {
      const { element } = snapshot;
      element.style.overflow = snapshot.overflow;
      element.style.overflowX = snapshot.overflowX;
      element.style.overflowY = snapshot.overflowY;
      element.style.overscrollBehavior = snapshot.overscrollBehavior;
      element.scrollTop = snapshot.scrollTop;
      element.scrollLeft = snapshot.scrollLeft;
    }

    body.style.overflow = scrollSnapshot.bodyOverflow;
    body.style.overscrollBehavior = scrollSnapshot.bodyOverscroll;
    body.style.position = scrollSnapshot.bodyPosition;
    body.style.top = scrollSnapshot.bodyTop;
    body.style.left = scrollSnapshot.bodyLeft;
    body.style.right = scrollSnapshot.bodyRight;
    body.style.width = scrollSnapshot.bodyWidth;
    html.style.overflow = scrollSnapshot.htmlOverflow;
    html.style.overscrollBehavior = scrollSnapshot.htmlOverscroll;
    window.scrollTo(scrollSnapshot.scrollX, scrollSnapshot.scrollY);
    scrollSnapshot = null;
  };
}

function resolveDialog(dialogRef, dialogSelector) {
  if (dialogRef?.current) return dialogRef.current;
  if (!dialogSelector) return null;
  const matches = Array.from(document.querySelectorAll(dialogSelector));
  return matches.at(-1) || null;
}

/**
 * Shared accessibility lifecycle for the app's modal research windows.
 * Keeps rendering/portal ownership in each feature while centralizing focus,
 * Escape, focus restoration and nested-safe mobile scroll locking.
 *
 * `dialogSelector` is a migration bridge for legacy portal dialogs that cannot
 * safely accept a ref yet. New dialogs should continue to prefer `dialogRef`.
 * `manageEscape=false` preserves a legacy dialog's own nested Escape policy
 * while still applying focus, Tab, restoration and scroll-lock behavior.
 */
export default function useModalDialog({
  dialogRef,
  dialogSelector,
  onClose,
  lockScroll = false,
  active = true,
  manageEscape = true,
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return undefined;

    let cleanupLifecycle = () => {};
    let resolveFrame = 0;

    const attach = () => {
      const dialog = resolveDialog(dialogRef, dialogSelector);
      if (!dialog) {
        resolveFrame = window.requestAnimationFrame(attach);
        return;
      }

      const opener = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      const token = Symbol('modal-dialog');
      const previousTabIndex = dialog.getAttribute('tabindex');
      if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');

      dialogStack.push(token);
      const releaseScroll = lockScroll ? lockDocumentScroll(dialog) : () => {};

      const focusFrame = window.requestAnimationFrame(() => {
        if (dialogStack.at(-1) === token && dialog.isConnected) {
          dialog.focus({ preventScroll: true });
        }
      });

      const onKeyDown = (event) => {
        if (dialogStack.at(-1) !== token || event.defaultPrevented) return;

        const activeElement = document.activeElement;
        const activeDialog = activeElement instanceof Element
          ? activeElement.closest('[role="dialog"]')
          : null;
        if (activeDialog && activeDialog !== dialog && !dialog.contains(activeDialog)) return;

        if (event.key === 'Escape') {
          if (!manageEscape) return;
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current?.();
          return;
        }

        if (event.key !== 'Tab') return;
        const focusable = focusableElements(dialog);
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus({ preventScroll: true });
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!dialog.contains(activeElement) || activeElement === dialog) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener('keydown', onKeyDown, true);
      cleanupLifecycle = () => {
        const wasTopmost = dialogStack.at(-1) === token;
        const index = dialogStack.lastIndexOf(token);
        if (index >= 0) dialogStack.splice(index, 1);
        document.removeEventListener('keydown', onKeyDown, true);
        window.cancelAnimationFrame(focusFrame);
        releaseScroll();
        if (previousTabIndex === null) dialog.removeAttribute('tabindex');
        else dialog.setAttribute('tabindex', previousTabIndex);
        if (wasTopmost && opener?.isConnected) {
          window.requestAnimationFrame(() => opener.focus({ preventScroll: true }));
        }
      };
    };

    attach();

    return () => {
      window.cancelAnimationFrame(resolveFrame);
      cleanupLifecycle();
    };
  }, [active, dialogRef, dialogSelector, lockScroll, manageEscape]);
}
