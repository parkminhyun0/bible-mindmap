import { expect, test } from 'playwright/test';

test('원어 사전에서 전체 용례·구문·병렬 연구를 열고 사전으로 돌아온다', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./');

  // 창세기 1:1을 캔버스에 추가한다.
  await page.getByRole('button', { name: '창세기', exact: true }).first().click();
  await page.getByRole('button', { name: '1', exact: true }).first().click();
  await page.getByRole('button', { name: '📖 본문 불러오기' }).click();
  await page.getByRole('button', { name: '+ 구절 추가' }).click();

  const verseNode = page.locator('.react-flow__node').filter({ hasText: '창세기 1:1' }).first();
  await expect(verseNode).toBeVisible();
  await verseNode.getByRole('tab', { name: '원어', exact: true }).click();

  const elohim = verseNode.getByText('אֱלֹהִים', { exact: true });
  await expect(elohim).toBeVisible({ timeout: 30_000 });
  await elohim.click();

  const lexicon = page.getByRole('dialog', { name: /원어 사전 · אֱלֹהִים/ });
  await expect(lexicon).toBeVisible();

  const concordanceButton = lexicon.getByRole('button', { name: /전체 성경 용례/ });
  const syntaxButton = lexicon.getByRole('button', { name: /이 절 구문/ });
  const parallelButton = lexicon.getByRole('button', { name: /병렬 본문/ });
  await expect(concordanceButton).toBeVisible();
  await expect(syntaxButton).toBeVisible();
  await expect(parallelButton).toBeVisible();

  // 전체 용례를 닫으면 원래 사전과 실행 버튼으로 복귀한다.
  await concordanceButton.click();
  const wordSearch = page.getByRole('dialog', { name: '원어 성경 다언어 검색' });
  await expect(wordSearch).toBeVisible();
  await expect(wordSearch.locator('input').first()).toHaveValue(/אֱלֹהִים|H0?430/);
  await wordSearch.getByRole('button', { name: '✕' }).click();
  await expect(lexicon).toBeVisible();
  await expect(concordanceButton).toBeFocused();

  // Escape는 구문 단계만 닫고 사전은 유지한다.
  await syntaxButton.click();
  await expect(page.getByRole('dialog', { name: /원어 구문 분석/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lexicon).toBeVisible();
  await expect(syntaxButton).toBeFocused();

  // 병렬 연구도 종료 후 같은 사전으로 복귀한다.
  await parallelButton.click();
  const parallel = page.getByRole('dialog', { name: '병렬 본문 연구' });
  await expect(parallel).toBeVisible();
  await parallel.getByRole('button', { name: '병렬 본문 연구 닫기' }).click();
  await expect(lexicon).toBeVisible();
  await expect(parallelButton).toBeFocused();
});
