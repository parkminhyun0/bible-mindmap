import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

const MANUAL_DIALOG_SELECTOR = '[role="dialog"][aria-label="사용자 매뉴얼"]';

function visibleFocusable(dialog) {
  return Array.from(dialog.querySelectorAll(FOCUSABLE)).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && element.getClientRects().length > 0;
  });
}

export default function LegacyModalAccessibilityBridge() {
  useEffect(() => {
    let activeDialog = null;
    let cleanupActiveDialog = () => {};

    const deactivate = () => {
      const cleanup = cleanupActiveDialog;
      cleanupActiveDialog = () => {};
      activeDialog = null;
      cleanup();
    };

    const attachManual = () => {
      const dialog = document.querySelector(MANUAL_DIALOG_SELECTOR);
      if (!(dialog instanceof HTMLElement) || dialog === activeDialog) return;

      deactivate();
      activeDialog = dialog;

      const opener = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      const previousTabIndex = dialog.getAttribute('tabindex');
      if (previousTabIndex === null) dialog.setAttribute('tabindex', '-1');
      dialog.dataset.modalBridgeAttached = 'true';

      const isMobile = dialog.classList.contains('at-modal--mobile');
      const body = document.body;
      const html = document.documentElement;
      const scrollSnapshot = isMobile
        ? {
            bodyOverflow: body.style.overflow,
            bodyOverscroll: body.style.overscrollBehavior,
            htmlOverflow: html.style.overflow,
            htmlOverscroll: html.style.overscrollBehavior,
          }
        : null;

      if (scrollSnapshot) {
        body.style.overflow = 'hidden';
        body.style.overscrollBehavior = 'none';
        html.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
      }

      const focusFrame = window.requestAnimationFrame(() => {
        if (dialog.isConnected) dialog.focus({ preventScroll: true });
      });

      const onKeyDown = (event) => {
        if (!dialog.isConnected || event.defaultPrevented) return;

        if (event.key === 'Escape') {
          const closeButton = dialog.querySelector('button[title="닫기"]');
          if (closeButton instanceof HTMLButtonElement) {
            event.preventDefault();
            event.stopPropagation();
            closeButton.click();
          }
          return;
        }

        if (event.key !== 'Tab') return;
        const focusable = visibleFocusable(dialog);
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus({ preventScroll: true });
          return;
        }

        const active = document.activeElement;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!dialog.contains(active) || active === dialog) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      };

      document.addEventListener('keydown', onKeyDown, true);

      cleanupActiveDialog = () => {
        document.removeEventListener('keydown', onKeyDown, true);
        window.cancelAnimationFrame(focusFrame);
        delete dialog.dataset.modalBridgeAttached;
        if (previousTabIndex === null) dialog.removeAttribute('tabindex');
        else dialog.setAttribute('tabindex', previousTabIndex);

        if (scrollSnapshot) {
          body.style.overflow = scrollSnapshot.bodyOverflow;
          body.style.overscrollBehavior = scrollSnapshot.bodyOverscroll;
          html.style.overflow = scrollSnapshot.htmlOverflow;
          html.style.overscrollBehavior = scrollSnapshot.htmlOverscroll;
        }

        if (opener?.isConnected) {
          window.requestAnimationFrame(() => {
            if (opener.isConnected) opener.focus({ preventScroll: true });
          });
        }
      };
    };

    const observer = new MutationObserver(() => {
      const dialog = document.querySelector(MANUAL_DIALOG_SELECTOR);
      if (dialog) attachManual();
      else if (activeDialog) deactivate();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    attachManual();

    return () => {
      observer.disconnect();
      deactivate();
    };
  }, []);

  return null;
}
