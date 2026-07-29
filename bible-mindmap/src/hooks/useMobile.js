import { useState, useEffect } from 'react';

/**
 * 화면 너비만 보지 않고 브라우저 힌트, 입력 장치, 실제 화면 크기를 함께 사용한다.
 * `device`는 물리 장치 성격, `layout`은 현재 앱이 사용할 UI를 뜻한다.
 * 데스크톱 창을 아주 좁게 줄인 경우에도 조작 불가능한 PC UI 대신 compact UI를 쓴다.
 */
export function classifyDevice({
  viewportWidth,
  viewportHeight,
  screenWidth,
  screenHeight,
  coarsePointer = false,
  finePointer = false,
  canHover = false,
  uaMobile = false,
  ipadLike = false,
  maxTouchPoints = 0,
}, breakpoint = 768) {
  const width = Number(viewportWidth) || 1280;
  const height = Number(viewportHeight) || 800;
  const shortestScreenSide = Math.min(
    Number(screenWidth) || width,
    Number(screenHeight) || height,
  );
  const touchPrimary = coarsePointer && !canHover;
  const phoneSizedScreen = shortestScreenSide <= 600;
  const mobileDevice = uaMobile || (!finePointer && touchPrimary && phoneSizedScreen);
  const tabletDevice = !mobileDevice && (
    ipadLike
    || (maxTouchPoints > 1 && touchPrimary && shortestScreenSide <= 1024)
  );
  const compactViewport = width < breakpoint;
  const phoneLandscape = mobileDevice && height < 600;
  const layout = mobileDevice || tabletDevice || compactViewport || phoneLandscape
    ? 'mobile'
    : 'desktop';

  return {
    device: mobileDevice ? 'mobile' : tabletDevice ? 'tablet' : 'desktop',
    layout,
    orientation: width > height ? 'landscape' : 'portrait',
    touch: maxTouchPoints > 0 || coarsePointer,
    viewportWidth: width,
    viewportHeight: height,
  };
}

function readDeviceProfile(breakpoint) {
  if (typeof window === 'undefined') {
    return {
      device: 'desktop',
      layout: 'desktop',
      orientation: 'landscape',
      touch: false,
      viewportWidth: 1280,
      viewportHeight: 800,
    };
  }

  try {
    const nav = window.navigator || {};
    const ua = nav.userAgent || '';
    const platform = nav.platform || '';
    const maxTouchPoints = Number(nav.maxTouchPoints) || 0;
    const uaMobile = nav.userAgentData?.mobile === true
      || /Android.*Mobile|iPhone|iPod|Windows Phone|Mobile Safari/i.test(ua);
    const ipadLike = /iPad/i.test(ua)
      || (platform === 'MacIntel' && maxTouchPoints > 1);
    const match = (query) => window.matchMedia?.(query)?.matches === true;

    return classifyDevice({
      viewportWidth: window.visualViewport?.width || window.innerWidth,
      viewportHeight: window.visualViewport?.height || window.innerHeight,
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
      coarsePointer: match('(pointer: coarse)'),
      finePointer: match('(pointer: fine)'),
      canHover: match('(hover: hover)'),
      uaMobile,
      ipadLike,
      maxTouchPoints,
    }, breakpoint);
  } catch {
    return classifyDevice({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
    }, breakpoint);
  }
}

export function useDeviceProfile(breakpoint = 768) {
  const [profile, setProfile] = useState(() => readDeviceProfile(breakpoint));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let frame = 0;
    const handler = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = readDeviceProfile(breakpoint);
        setProfile((current) => (
          current.device === next.device
          && current.layout === next.layout
          && current.orientation === next.orientation
          && current.touch === next.touch
          && current.viewportWidth === next.viewportWidth
          && current.viewportHeight === next.viewportHeight
            ? current
            : next
        ));
      });
    };
    handler();
    window.addEventListener('resize', handler, { passive: true });
    window.addEventListener('orientationchange', handler, { passive: true });
    window.visualViewport?.addEventListener('resize', handler, { passive: true });
    window.screen?.orientation?.addEventListener?.('change', handler);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
      window.visualViewport?.removeEventListener('resize', handler);
      window.screen?.orientation?.removeEventListener?.('change', handler);
    };
  }, [breakpoint]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.device = profile.device;
    root.dataset.layout = profile.layout;
    root.dataset.orientation = profile.orientation;
    root.classList.toggle('is-touch-device', profile.touch);
  }, [profile]);

  return profile;
}

export default function useMobile(breakpoint = 768) {
  return useDeviceProfile(breakpoint).layout === 'mobile';
}
