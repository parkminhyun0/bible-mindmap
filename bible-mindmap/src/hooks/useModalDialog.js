import { useEffect, useRef } from 'react';
import { syncMobileModalFrameGeometry } from '../components/MobileModalFrame.jsx';

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

// 터치 지점에서 가장 가까운 '실제 세로 스크롤 가능한' 조상을 동적으로 찾는다.
// [근본 수정 · 관찰카드 하단시트 스크롤 먹통]
// 기존에는 .at-modal__content / [data-modal-scroll-region] 표식이 붙은 영역만
// 세로 스크롤을 허용하고 나머지는 전부 preventDefault 했다.
// 문맥성경의 모바일 하단시트(관찰카드)·학습 스캐폴딩 확장 영역·원어 사전 팝업·
// 관주/비평/ARC 해설 팝업은 표식이 없어 iOS에서 원핑거 스크롤이 전면 차단됐다
// (PR#204~#206 이 높이만 바꿔서 실패한 이유).
// 표식 유무와 무관하게 computed style 로 스크롤러를 판정해 허용하고,
// 스크롤러가 전혀 없을 때만 배경 스크롤 누수를 차단한다.
function findVerticalScroller(target, boundary) {
  let node = target;
  while (node && node !== boundary?.parentElement) {
    if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 1) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(`${style.overflow} ${style.overflowY}`)) return node;
    }
    if (node === boundary) break;
    node = node.parentElement;
  }
  return null;
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
      maxWidth: backdrop.style.maxWidth,
      height: backdrop.style.height,
      minHeight: backdrop.style.minHeight,
      maxHeight: backdrop.style.maxHeight,
      overflow: backdrop.style.overflow,
      transform: backdrop.style.transform,
      mobileModalFrame: backdrop.dataset.mobileModalFrame,
    } : null;

    let viewportFrame = 0;
    const applyViewport = () => {
      viewportFrame = 0;
      if (!backdrop) return;
      // Shared frame keeps width percentage-based and ignores visualViewport
      // geometry while pinch zoom is active. Only scale=1 keyboard/browser UI
      // height and offsets are synchronized.
      syncMobileModalFrameGeometry(backdrop, window.visualViewport);
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
      // 1순위: 명시 표식 영역(의도 문서화 + 조기 판정) · 2순위: 동적 스크롤러 탐지.
      // 동적 탐지의 경계는 '현재 열린 dialog'가 아니라 터치 지점의 dialog 로 잡아
      // 중첩 팝업(사전·관주·ARC 해설 등 role=dialog 중첩)에서도 정확히 동작한다.
      const touchDialog = target?.closest('[role="dialog"]') || dialog;
      const marked = target?.closest('.at-modal__content, [data-modal-scroll-region="true"]') || null;
      activeScrollArea = (marked && marked.scrollHeight > marked.clientHeight + 1 ? marked : null)
        || findVerticalScroller(target, touchDialog)
        || marked;
    };

    const onTouchStart = (event) => {
      touchStartX = event.touches?.[0]?.clientX ?? 0;
      touchStartY = event.touches?.[0]?.clientY ?? 0;
      const target = event.target instanceof Element ? event.target : null;
      cacheTouchTargets(target);
    };

    const onTouchMove = (event) => {
      // 핀치줌 등 멀티터치 제스처는 preventDefault하지 않고 브라우저에 위임한다.
      // (이 가드가 없으면 모달 오버스크롤 차단 로직이 두 손가락 확대까지 취소함)
      if (event.touches && event.touches.length > 1) return;
      const target = event.target instanceof Element ? event.target : null;
      // 검색↔상세 전환 등으로 dialog 요소가 바뀌어도 견고하도록, 캡처된(stale) dialog 대신
      // '열린 모달(role=dialog) 안인지'로 판정한다. 모달 밖 터치만 배경 스크롤 누수를 차단.
      if (!target || !target.closest('[role="dialog"]')) {
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

      // 표식된 스크롤 영역(.at-modal__content / [data-modal-scroll-region]) 안이면 세로 스크롤 허용.
      // 표식은 target.closest로 동적 판정되므로 dialog 요소가 바뀌어도 정확하다.
      const scrollArea = activeScrollArea;
      if (!scrollArea) {
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
      element.style.maxWidth = snapshot.maxWidth;
      element.style.height = snapshot.height;
      element.style.minHeight = snapshot.minHeight;
      element.style.maxHeight = snapshot.maxHeight;
      element.style.overflow = snapshot.overflow;
      element.style.transform = snapshot.transform;
      if (snapshot.mobileModalFrame === undefined) delete element.dataset.mobileModalFrame;
      else element.dataset.mobileModalFrame = snapshot.mobileModalFrame;
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
