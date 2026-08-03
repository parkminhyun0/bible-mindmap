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

function lockDocumentScroll() {
  const body = document.body;
  const html = document.documentElement;
  if (scrollLockCount === 0) {
    scrollSnapshot = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
  }
  scrollLockCount += 1;

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount !== 0 || !scrollSnapshot) return;
    body.style.overflow = scrollSnapshot.bodyOverflow;
    body.style.overscrollBehavior = scrollSnapshot.bodyOverscroll;
    html.style.overflow = scrollSnapshot.htmlOverflow;
    html.style.overscrollBehavior = scrollSnapshot.htmlOverscroll;
    scrollSnapshot = null;
  };
}

/**
 * Shared accessibility lifecycle for the app's modal research windows.
 * Keeps rendering/portal ownership in each feature while centralizing focus,
 * Escape, focus restoration and nested-safe mobile scroll locking.
 */
export default function useModalDialog({ dialogRef, onClose, lockScroll = false }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const opener = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const token = Symbol('modal-dialog');
    dialogStack.push(token);
    const releaseScroll = lockScroll ? lockDocumentScroll() : () => {};

    const focusFrame = window.requestAnimationFrame(() => {
      if (dialogStack.at(-1) === token && dialog.isConnected) {
        dialog.focus({ preventScroll: true });
      }
    });

    const onKeyDown = (event) => {
      if (dialogStack.at(-1) !== token || event.defaultPrevented) return;

      const active = document.activeElement;
      const activeDialog = active instanceof Element
        ? active.closest('[role="dialog"]')
        : null;
      // A nested dialog owns its own keyboard lifecycle while focus is inside it.
      if (activeDialog && activeDialog !== dialog && !dialog.contains(activeDialog)) return;

      if (event.key === 'Escape') {
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
      if (!dialog.contains(active) || active === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      const wasTopmost = dialogStack.at(-1) === token;
      const index = dialogStack.lastIndexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);
      document.removeEventListener('keydown', onKeyDown, true);
      window.cancelAnimationFrame(focusFrame);
      releaseScroll();
      if (wasTopmost && opener?.isConnected) {
        window.requestAnimationFrame(() => opener.focus({ preventScroll: true }));
      }
    };
  }, [dialogRef, lockScroll]);
}
