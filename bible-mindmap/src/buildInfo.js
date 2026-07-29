/* global __BM_BUILD_COMMIT__, __BM_BUILD_TIME__ */
// 빌드 provenance — vite define 으로 주입 (vite.config.js). 배포 반영 확인 장치.
export const BUILD_COMMIT = typeof __BM_BUILD_COMMIT__ !== 'undefined' ? __BM_BUILD_COMMIT__ : 'dev';
export const BUILD_TIME = typeof __BM_BUILD_TIME__ !== 'undefined' ? __BM_BUILD_TIME__ : '';

// KST 사람이 읽는 빌드 시각
export function buildTimeLabel() {
  if (!BUILD_TIME) return '개발 모드';
  try {
    return new Date(BUILD_TIME).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  } catch {
    return BUILD_TIME;
  }
}
