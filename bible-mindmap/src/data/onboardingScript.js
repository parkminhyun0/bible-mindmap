// 병렬 연구 최초 실행 온보딩 데이터. targetSelector는 UI 통합 시 실제 DOM 마커와 검증한다.
export const PARALLEL_ONBOARDING = {
  version: 1,
  steps: [
    {
      id: 'step-anchor',
      targetSelector: '#parallel-anchor',
      title: '1️⃣ 기준 본문을 정하세요',
      body: '연구를 시작할 성경 구절 하나를 입력한다. 예: “마가복음 1:2-3”. 이 본문을 중심으로 공관 평행·인용·관주 관계가 추천된다.',
      cta: '다음',
    },
    {
      id: 'step-suggestions',
      targetSelector: '[data-parallel-suggestions]',
      title: '2️⃣ 비교 본문을 최대 4개까지 골라요',
      body: '공관복음 평행, 신약↔구약 인용, 관주 연관이 추천된다. 관계 종류를 확인한 뒤 나란히 놓을 본문을 선택한다.',
      cta: '다음',
    },
    {
      id: 'step-lens',
      targetSelector: '[data-research-lens-picker]',
      title: '3️⃣ 연구 렌즈를 선택해요',
      body: '무엇에 주목할지 렌즈가 잡아 준다. 편집·어휘·인용·유형론·반향·청중·구조·신학 강조 중 연구 목적에 맞는 렌즈를 고른다.',
      cta: '시작',
    },
  ],
  emptyStateHints: [
    '처음이면 상단의 “🎓 가이드 학습 코스”에서 25분 안팎의 입문 코스를 골라 시작하는 것이 좋다.',
    '용어가 낯설다면 밑줄 표시된 학술 용어의 툴팁을 먼저 읽고, 관찰과 해석을 구분해 기록한다.',
  ],
};
