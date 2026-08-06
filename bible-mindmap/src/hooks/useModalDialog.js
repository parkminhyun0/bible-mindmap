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

function findHorizontalScroller(target, dialog) {
  let node = target;
  while (node && node !== dialog) {
    if (node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(style.overflowX)) return node;
    }
    node = node.parentElement;
  }
  return null;
}

function setStyleIfChanged(element, property, value) {
  if (element.style[property] !== value) element.style[property] = value;
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
      const verticalScrollable = /(auto|scroll|overlay)/.test(`${style.overflow} ${style.overflowY}`)
        || current.scrollHeight > current.clientHeight;

      if (verticalScrollable) {
        ancestors.push({
          element: current,
          overflow: current.style.overflow,
          overflowY: current.style.overflowY,
          overscrollBehaviorY: current.style.overscrollBehaviorY,
          scrollTop: current.scrollTop,
        });
        current.style.overflowY = 'hidden';
        current.style.overscrollBehaviorY = 'none';
      }
      current = current.parentElement;
    }

    const backdrop = dialog?.closest('.at-modal-backdrop');
    const backdropSnapshot = backdrop ? {
      element: backdrop,
      position: backdrop.style.position,
      inset: backdrop.style.inset,
      top: backdrop.style.top,
      left: backdrop.style.left,
      right: backdrop.style.right,
      bottom: backdrop.style.bottom,
      width: backdrop.style.width,
      height: backdrop.style.height,
      minHeight: backdrop.style.minHeight,
      maxHeight: backdrop.style.maxHeight,
      overflow: backdrop.style.overflow,
      transform: backdrop.style.transform,
    } : null;

    let viewportFrame = 0;
    const applyViewport = () => {
      viewportFrame = 0;
      if (!backdrop) return;
      const viewport = window.visualViewport;
      const width = `${viewport?.width || window.innerWidth}px`;
      const height = `${viewport?.height || window.innerHeight}px`;
      setStyleIfChanged(backdrop, 'position', 'fixed');
      setStyleIfChanged(backdrop, 'inset', 'auto');
      setStyleIfChanged(backdrop, 'left', `${viewport?.offsetLeft || 0}px`);
      setStyleIfChanged(backdrop, 'top', `${viewport?.offsetTop || 0}px`);
      setStyleIfChanged(backdrop, 'right', 'auto');
      setStyleIfChanged(backdrop, 'bottom', 'auto');
      setStyleIfChanged(backdrop, 'width', width);
      setStyleIfChanged(backdrop, 'height', height);
      setStyleIfChanged(backdrop, 'minHeight', height);
      setStyleIfChanged(backdrop, 'maxHeight', height);
      setStyleIfChanged(backdrop, 'overflow', 'hidden');
      setStyleIfChanged(backdrop, 'transform', 'none');
    };
    const scheduleViewportSync = () => {
      if (viewportFrame) return;
      viewportFrame = window.requestAnimationFrame(applyViewport);
    };
    const cancelViewportSync = () => {
      if (viewportFrame) window.cancelAnimationFrame(viewportFrame);
      viewportFrame = 0;
    };
    applyViewport();

    let touchStartX = 0;
    let touchStartY = 0;
    let activeTouchTarget = null;
    let activeHorizontalScroller = null;
    let activeScrollArea = null;

    const cacheTouchTargets = (target) => {
      activeTouchTarget = target;
      activeHorizontalScroller = target ? findHorizontalScroller(target, dialog) : null;
      activeScrollArea = target?.closest('.at-modal__content, [data-modal-scroll-region="true"]') || null;
    };

    const onTouchStart = (event) => {
      touchStartX = event.touches?.[0]?.clientX ?? 0;
      touchStartY = event.touches?.[0]?.clientY ?? 0;
      const target = event.target instanceof Element ? event.target : null;
      cacheTouchTargets(target);
    };

    const onTouchMove = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !dialog?.contains(target)) {
        event.preventDefault();
        return;
      }
      if (target !== activeTouchTarget) cacheTouchTargets(target);

      const currentX = event.touches?.[0]?.clientX ?? touchStartX;
      const currentY = event.touches?.[0]?.clientY ?? touchStartY;
      const deltaX = currentX - touchStartX;
      const deltaY = currentY - touchStartY;

      // 성경 권 칩처럼 가로 스크롤 가능한 영역은 좌우 제스처를 그대로 허용한다.
      if (activeHorizontalScroller && Math.abs(deltaX) > Math.abs(deltaY)) return;

      const scrollArea = activeScrollArea;
      if (!scrollArea || !dialog.contains(scrollArea)) {
        event.preventDefault();
        return;
      }

      // 세로 본문 스크롤은 허용하되, 맨 위·맨 아래에서 배경으로 전달되는 것만 차단한다.
      if (Math.abs(deltaY) <= Math.abs(deltaX)) return;
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
      backdropSnapshot,
      scheduleViewportSync,
      cancelViewportSync,
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
    window.visualViewport?.addEventListener('resize', scheduleViewportSync, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleViewportSync, { passive: true });
  }

  scrollLockCount += 1;

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount !== 0 || !scrollSnapshot) return;

    document.removeEventListener('touchstart', scrollSnapshot.onTouchStart, true);
    document.removeEventListener('touchmove', scrollSnapshot.onTouchMove, true);
    window.visualViewport?.removeEventListener('resize', scrollSnapshot.scheduleViewportSync);
    window.visualViewport?.removeEventListener('scroll', scrollSnapshot.scheduleViewportSync);
    scrollSnapshot.cancelViewportSync();

    for (const snapshot of scrollSnapshot.ancestors) {
      const { element } = snapshot;
      element.style.overflow = snapshot.overflow;
      element.style.overflowY = snapshot.overflowY;
      element.style.overscrollBehaviorY = snapshot.overscrollBehaviorY;
      element.scrollTop = snapshot.scrollTop;
    }

    if (scrollSnapshot.backdropSnapshot) {
      const snapshot = scrollSnapshot.backdropSnapshot;
      const { element } = snapshot;
      element.style.position = snapshot.position;
      element.style.inset = snapshot.inset;
      element.style.top = snapshot.top;
      element.style.left = snapshot.left;
      element.style.right = snapshot.right;
      element.style.bottom = snapshot.bottom;
      element.style.width = snapshot.width;
      element.style.height = snapshot.height;
      element.style.minHeight = snapshot.minHeight;
      element.style.maxHeight = snapshot.maxHeight;
      element.style.overflow = snapshot.overflow;
      element.style.transform = snapshot.transform;
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
