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
      const releaseScroll = lockScroll ? lockDocumentScroll() : () => {};

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
        // A nested dialog owns its own keyboard lifecycle while focus is inside it.
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
