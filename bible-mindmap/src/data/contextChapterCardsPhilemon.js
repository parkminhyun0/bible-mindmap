import { CONTEXT_CHAPTER_CARDS_JAS } from './contextChapterCardsJames.js';

const C = (coverEmoji, genre, observeThis, discourseMarkers, theologicalImplications, nextChapterPreview) => ({
  coverEmoji,
  genre,
  observeThis,
  discourseMarkers,
  theologicalImplications,
  nextChapterPreview,
});

export const CONTEXT_CHAPTER_CARDS_PHLM = {
  ...CONTEXT_CHAPTER_CARDS_JAS,
  'Phlm:1': C('🤝', '서신 · 복음 안의 형제됨과 자발적 화해', [
    '1-7절에서 바울의 인사·빌레몬의 사랑과 믿음·성도들의 마음을 평안하게 함·복음의 교제가 선을 알게 한다는 기도를 살펴보세요.',
    '8-16절에서 명령할 권리보다 사랑으로 간구함·오네시모의 이전과 현재·바울의 심복·자발성·종을 넘어 사랑받는 형제로의 관계 변화가 어떻게 전개되는지 보세요.',
    '17-25절에서 오네시모를 바울처럼 영접함·빚을 바울에게 돌림·주 안에서 마음을 평안하게 함·순종의 확신·은혜의 축복이 화해를 구체화하는지 확인하세요.',
  ], [
    { marker: 'διό (디오)', role: '빌레몬의 사랑에 대한 감사에서 사랑의 간구로 결론 전환', example: '8절' },
    { marker: 'ἀλλά (알라)', role: '명령과 사랑의 간구, 요구와 자발성의 대조', example: '9·14·16절' },
    { marker: 'οὖν (운)', role: '복음의 동역 관계에서 오네시모 영접 요청을 도출', example: '17절' },
  ], [
    '복음은 사회적 관계를 단순히 외적으로 유지하는 데 머물지 않고 그리스도 안에서 종과 주인을 사랑받는 형제로 재구성합니다.',
    '바울은 사도적 권위를 포기하지 않으면서도 사랑과 자발적 선행을 통해 화해가 복음의 열매로 나타나게 합니다.',
    '오네시모의 빚을 대신 담당하겠다는 바울의 요청은 그리스도의 대속과 동일시되지는 않지만, 받은 은혜가 타인의 짐을 담당하는 화해의 삶으로 이어짐을 보여 줍니다.',
  ], '히 1장 · 아들을 통한 최종 계시와 천사보다 뛰어나신 그리스도'),
};
