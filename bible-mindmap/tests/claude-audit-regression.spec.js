import { readFileSync } from 'node:fs';
import { expect, test } from 'playwright/test';

async function dismissResearchOnboarding(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('context-bible-onboarding-v1-dismissed', '1');
    window.localStorage.setItem('parallel-onboarding-v1-dismissed', '1');
  });
}

test('병렬 연구 가이드 코스의 비교 본문이 비동기 추천으로 덮이지 않는다', async ({ page }) => {
  await dismissResearchOnboarding(page);
  await page.goto('./');

  await page.getByRole('button', { name: '병렬 본문 연구 열기' }).last().click();
  const dialog = page.getByRole('dialog', { name: '병렬 본문 연구' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: /세례 요한을 통해 배우는 공관대조 입문/ }).click();
  await expect(dialog.locator('#parallel-anchor')).toHaveValue('마가복음 1:1-8');

  const selectedLabels = dialog.locator('strong');
  await expect(selectedLabels.filter({ hasText: /^마가복음 1:1-8$/ })).toBeVisible();
  await expect(selectedLabels.filter({ hasText: /^마태복음 3:1-12$/ })).toBeVisible();
  await expect(selectedLabels.filter({ hasText: /^누가복음 3:1-18$/ })).toBeVisible();

  // buildParallelSuggestions()가 완료된 뒤에도 코스가 지정한 selection이 유지되어야 한다.
  await page.waitForTimeout(800);
  await expect(selectedLabels.filter({ hasText: /^마가복음 1:1-8$/ })).toBeVisible();
  await expect(selectedLabels.filter({ hasText: /^마태복음 3:1-12$/ })).toBeVisible();
  await expect(selectedLabels.filter({ hasText: /^누가복음 3:1-18$/ })).toBeVisible();
});

test.describe('모바일 문맥 성경 코스 이동', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('다른 책 코스 선택 후 새 책 로드가 끝나면 첫 focus 절로 이동한다', async ({ page }) => {
    await dismissResearchOnboarding(page);
    await page.goto('./');

    // 모바일에서는 기존 P0 계약대로 자료 추가 시트를 통해 문맥 성경에 진입한다.
    await page.getByRole('button', { name: '추가', exact: true }).click();
    const sheet = page.locator('.mobile-add-sheet');
    await sheet.getByRole('button', { name: /문맥 성경/ }).click();
    const initialDialog = page.getByRole('dialog', { name: /문맥 성경/ });
    await expect(initialDialog).toBeVisible();

    await initialDialog.getByRole('button', { name: /요한계시록 4-5장 · 보좌와 어린양의 예배/ }).click();
    const revelationDialog = page.getByRole('dialog', { name: '문맥 성경 · 요한계시록' });
    await expect(revelationDialog).toBeVisible({ timeout: 15_000 });

    // 모바일 헤더의 장:절 표시가 1:1에 머물지 않고 코스의 첫 focus인 4:2로 이동해야 한다.
    const chapterPicker = revelationDialog.locator('.at-modal__titlebar button').first();
    await expect(chapterPicker).toContainText(/4:2/, { timeout: 15_000 });
  });
});

test('전수조사에서 추가한 fail-closed 가드가 소스 계약으로 유지된다', () => {
  const nodeEditor = readFileSync(new URL('../src/components/NodeEditor.jsx', import.meta.url), 'utf8');
  const contextBible = readFileSync(new URL('../src/components/ContextBibleModal.jsx', import.meta.url), 'utf8');
  const annotationPin = readFileSync(new URL('../src/components/PassageAnnotationPin.jsx', import.meta.url), 'utf8');
  const wordSearch = readFileSync(new URL('../src/components/WordSearchModal.jsx', import.meta.url), 'utf8');

  expect(nodeEditor).not.toContain("import Underline from '@tiptap/extension-underline'");
  expect(nodeEditor).not.toContain('\n      Underline,\n');

  expect(contextBible).toContain('}, [chReady, chapters]);');
  expect(contextBible).toContain('pendingCourseScrollRef.current = { ch: firstCh, verse: firstVerse };');
  expect(contextBible).toContain('if (!pending || !chReady || !chapters[pending.ch]) return;');

  expect(annotationPin).toContain('if (!current) {');
  expect(annotationPin).toContain('annotation.anchor?.chapter');
  expect(annotationPin).toContain('annotation.anchor?.translationId');

  expect(wordSearch).toContain('}, [group.key]);');
});