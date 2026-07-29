// 문맥 성경 최초 실행 온보딩 데이터.
export const CONTEXT_ONBOARDING = {
  version: 1,
  steps: [
    {
      id: 'ctx-step-index',
      targetSelector: '[data-context-book-index]',
      title: '1️⃣ 66권 인덱스에서 책을 고르세요',
      body: '문맥 성경은 한 권 안의 담화·구조·핵심어를 따라가는 리더이다. 66권 인덱스에서 책을 고른 뒤 장 의제와 현재 위치부터 확인한다.',
      cta: '다음',
    },
    {
      id: 'ctx-step-course',
      targetSelector: '[data-context-courses]',
      title: '2️⃣ 가이드 학습 코스로 시작해요',
      body: '처음부터 모든 표식을 해석할 필요는 없다. 25~60분 코스를 고르면 읽을 장·집중 절·관찰 질문이 순서대로 제시된다.',
      cta: '다음',
    },
    {
      id: 'ctx-step-lens',
      targetSelector: '[data-context-lens-picker]',
      title: '3️⃣ 연구 렌즈로 관찰 초점을 잡아요',
      body: '담화 마커·Arc·핵심어·원어·관주 중 무엇을 먼저 볼지 렌즈가 정해 준다. 한 번에 1~2개 렌즈만 선택해 관찰과 해석을 구분한다.',
      cta: '시작',
    },
  ],
  emptyStateHints: [
    '처음이면 “창세기 1장 · 창조 담화 리듬”이나 “마가복음 1장 · 복음의 시작과 속도” 입문 코스로 시작한다.',
    '표시가 많아 복잡하면 담화 흐름 또는 거시구조 렌즈 하나만 켜고, 좌측 마커 → 우측 카드 → Arc 순서로 읽는다.',
  ],
};
