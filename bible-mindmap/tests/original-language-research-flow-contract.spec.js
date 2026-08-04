import { readFile } from 'node:fs/promises';
import { expect, test } from 'playwright/test';

const readComponent = (name) => readFile(
  new URL(`../src/components/${name}`, import.meta.url),
  'utf8',
);

test('원어 사전은 전체 용례·구문·병렬 연구와 단계 복귀 계약을 제공한다', async () => {
  const actions = await readComponent('OriginalLanguageResearchActions.jsx');
  const lexicon = await readComponent('LexiconPopup.jsx');

  expect(actions).toContain('data-original-research-action="concordance"');
  expect(actions).toContain('data-original-research-action="syntax"');
  expect(actions).toContain('data-original-research-action="parallel"');
  expect(actions).toContain("lazy(() => import('./WordSearchModal'))");
  expect(actions).toContain("lazy(() => import('./SyntaxPanel'))");
  expect(actions).toContain("lazy(() => import('./ParallelStudyModal'))");
  expect(actions).toContain('requestAnimationFrame(() => returnFocusRef.current?.focus())');
  expect(actions).toContain('minHeight: isMobile ? 44 : 36');

  expect(lexicon).toContain("import OriginalLanguageResearchActions from './OriginalLanguageResearchActions'");
  expect(lexicon).toContain("e.key === 'Escape' && !researchActive");
  expect(lexicon).toContain('Math.min(zIndex ?? 2501, 1200)');
  expect(lexicon).toContain('<OriginalLanguageResearchActions');
});

test('원어 연구 시작 지점은 원래 구절을 복원한다', async () => {
  const actions = await readComponent('OriginalLanguageResearchActions.jsx');

  expect(actions).toContain('document.elementsFromPoint');
  expect(actions).toContain("'[data-annotation-root]'");
  expect(actions).toContain('parseReference(headerText)');
  expect(actions).toContain('data-origin-passage');
  expect(actions).toContain('entry?.l || entry?.w || entry?.s');
});
