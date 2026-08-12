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

test('원어 브릿지 Pilot 메뉴가 정경 추적 다음에 열리고 H5162 브릿지를 표시한다', async ({ page }) => {
  await dismissResearchOnboarding(page);
  await page.goto('./');

  const canonical = page.getByRole('button', { name: '정경 추적 핵심 개념 열기' });
  const bridge = page.getByRole('button', { name: '원어 브릿지 열기' });
  await expect(canonical).toBeVisible();
  await expect(bridge).toBeVisible();

  const order = await page.locator('[data-research-tool="canonical-concept-global"], [data-research-tool="lexical-bridge-global"]')
    .evaluateAll((nodes) => nodes.map((node) => node.dataset.researchTool));
  expect(order).toEqual(['canonical-concept-global', 'lexical-bridge-global']);

  await bridge.click();
  const dialog = page.getByRole('dialog', { name: '원어 브릿지' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: '원어 브릿지 검색' })).toHaveValue('H5162');
  await expect(dialog.getByText('נִחַמְתָּנִי')).toBeVisible();
  await expect(dialog.getByText('παρεκάλεσάς με')).toBeVisible();
  await expect(dialog.getByText('παράκλησις · παράκλητος')).toBeVisible();
  await expect(dialog.getByText(/룻기 2:13이 성령을 직접 예언하거나 예표한다고 확정하지 않는다/)).toBeVisible();
});

test.describe('모바일 연구 도구 회귀', () => {
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

    // 가이드 코스는 학습 스캐폴딩을 펼친 뒤 노출된다.
    await initialDialog.getByRole('button', { name: '학습 스캐폴딩 펼치기' }).click();
    await initialDialog.getByRole('button', { name: /요한계시록 4-5장 · 보좌와 어린양의 예배/ }).click();
    const revelationDialog = page.getByRole('dialog', { name: '문맥 성경 · 요한계시록' });
    await expect(revelationDialog).toBeVisible({ timeout: 15_000 });

    // 모바일 헤더의 장:절 표시가 1:1에 머물지 않고 코스의 첫 focus인 4:2로 이동해야 한다.
    const chapterPicker = revelationDialog.locator('.at-modal__titlebar button').first();
    await expect(chapterPicker).toContainText(/4:2/, { timeout: 15_000 });
  });

  test('원어 다언어 검색의 입력과 결과 모달은 16px 이상을 유지한다', async ({ page }) => {
    await dismissResearchOnboarding(page);
    await page.goto('./');

    await page.getByRole('button', { name: '추가', exact: true }).click();
    const sheet = page.locator('.mobile-add-sheet');
    const launcherInput = sheet.getByPlaceholder('원어·영어·한글 검색...');
    await expect(launcherInput).toBeVisible();

    const launcherFontSize = await launcherInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(launcherFontSize).toBeGreaterThanOrEqual(16);

    await launcherInput.fill('그리스도');
    await launcherInput.press('Enter');

    const dialog = page.getByRole('dialog', { name: '원어 성경 다언어 검색' });
    await expect(dialog).toBeVisible();
    const resultInput = dialog.locator('input').first();
    const resultFontSize = await resultInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(resultFontSize).toBeGreaterThanOrEqual(16);
  });

  test('원어 브릿지 Pilot 메뉴는 모바일 자료 추가 시트에서 44px 터치 영역으로 열리고 스크롤 가능하다', async ({ page }) => {
    await dismissResearchOnboarding(page);
    await page.goto('./');

    await page.getByRole('button', { name: '추가', exact: true }).click();
    const sheet = page.locator('.mobile-add-sheet');
    const bridge = sheet.getByRole('button', { name: '원어 브릿지 열기' });
    await expect(bridge).toBeVisible();
    const box = await bridge.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);

    await bridge.click();
    const dialog = page.getByRole('dialog', { name: '원어 브릿지' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-modal-scroll-region="true"]')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '원어 브릿지 닫기' })).toBeVisible();
  });
});

test('전수조사에서 추가한 fail-closed 가드가 소스 계약으로 유지된다', () => {
  const nodeEditor = readFileSync(new URL('../src/components/NodeEditor.jsx', import.meta.url), 'utf8');
  const contextBible = readFileSync(new URL('../src/components/ContextBibleModal.jsx', import.meta.url), 'utf8');
  const annotationPin = readFileSync(new URL('../src/components/PassageAnnotationPin.jsx', import.meta.url), 'utf8');
  const wordSearch = readFileSync(new URL('../src/components/WordSearchModal.jsx', import.meta.url), 'utf8');
  const sidebarCss = readFileSync(new URL('../src/theme/sidebarScrollFix.css', import.meta.url), 'utf8');

  expect(nodeEditor).not.toContain("import Underline from '@tiptap/extension-underline'");
  expect(nodeEditor).not.toContain('\n      Underline,\n');

  expect(contextBible).toContain('}, [chReady, chapters]);');
  // book 일치 가드 포함 버전 — 전환 직전 이전 책 chapters로 조기 소모되는 레이스 방지 계약
  expect(contextBible).toContain('pendingCourseScrollRef.current = { book: course.book, ch: firstCh, verse: firstVerse };');
  expect(contextBible).toContain('if (!pending || pending.book !== activeBookId || !chReady || !chapters[pending.ch]) return;');

  expect(annotationPin).toContain('if (!current) {');
  expect(annotationPin).toContain('annotation.anchor?.chapter');
  expect(annotationPin).toContain('annotation.anchor?.translationId');

  expect(wordSearch).toContain('}, [group.key]);');
  expect(sidebarCss).toContain('.mobile-add-sheet input');
  expect(sidebarCss).toContain('.at-modal--word-search input');
  expect(sidebarCss).toContain('font-size: max(16px, 1rem) !important;');
});
