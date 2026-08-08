// 앱 전역 레이아웃 판정의 단일 기준.
//
// [왜 필요한가]
// React 쪽은 useMobile(768px + 기기·포인터 판정)으로 'mobile' 레이아웃을 정하고
// html[data-layout] 에 그 결과를 기록한다(useDeviceProfile 이펙트).
// 반면 vanilla 브릿지(markResearchLayerBridge / ThreeColumnRepair)와 CSS는
// 지금까지 별도의 900px matchMedia 를 썼다.
// → iPad(768~1024px, React=mobile)나 iPhone Pro Max 가로(932px)에서
//   React는 모바일 시트 UI를 그리는데 브릿지는 데스크톱 3열 DOM 재편을 실행해
//   시트가 360px 고정 컬럼으로 강제 전환되고 가로 넘침이 발생했다.
//
// [해결]
// 브릿지·repair 는 반드시 이 함수를 통해 React 와 동일한 판정을 공유한다.
export function isMobileLayout() {
  if (typeof document === 'undefined') return false;
  const layout = document.documentElement.dataset.layout;
  if (layout === 'mobile') return true;
  if (layout === 'desktop') return false;
  // 부팅 직후 data-layout 미기록 구간의 보수적 폴백 —
  // useMobile 의 classifyDevice 와 같은 방향(터치 대화면 포함)으로 판정한다.
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(
    '(max-width: 767px), ((pointer: coarse) and (max-width: 1024px))',
  ).matches;
}
