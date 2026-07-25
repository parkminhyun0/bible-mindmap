import { useState, useEffect } from 'react';

/**
 * 모바일 감지 hook.
 * - 좁은 너비 (width < breakpoint) → mobile
 * - 터치 디바이스 + 짧은 세로 (landscape 스마트폰) → mobile
 *   (iPhone Pro Max landscape = 932x430pt 처럼 너비는 넓지만 실제 스마트폰인 경우)
 */
export default function useMobile(breakpoint = 768) {
  const check = () => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth < breakpoint) return true;
    // 터치 디바이스 + 짧은 뷰포트 (landscape 스마트폰)
    if (window.matchMedia) {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const isShort = window.innerHeight < 550;
      if (isTouch && isShort) return true;
    }
    return false;
  };
  const [isMobile, setIsMobile] = useState(check);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsMobile(check());
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, [breakpoint]);
  return isMobile;
}
