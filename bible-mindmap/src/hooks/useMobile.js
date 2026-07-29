import { useState, useEffect } from 'react';

/**
 * 모바일 감지 hook.
 * - 좁은 너비 (width < breakpoint) → mobile
 * - 터치 디바이스 + 짧은 세로 (landscape 스마트폰) → mobile
 *   (iPhone Pro Max landscape = 932x430pt 처럼 너비는 넓지만 실제 스마트폰)
 */
function checkMobile(breakpoint) {
  if (typeof window === 'undefined') return false;
  try {
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    if (viewportWidth < breakpoint) return true;
    const mq = window.matchMedia && window.matchMedia('(pointer: coarse)');
    if (mq && mq.matches && viewportHeight < 550) return true;
  } catch { /* iOS Safari 초기 mount 시 방어 */ }
  return false;
}

export default function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => checkMobile(breakpoint));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsMobile(checkMobile(breakpoint));
    handler();
    window.addEventListener('resize', handler, { passive: true });
    window.addEventListener('orientationchange', handler, { passive: true });
    window.visualViewport?.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
      window.visualViewport?.removeEventListener('resize', handler);
    };
  }, [breakpoint]);
  return isMobile;
}
