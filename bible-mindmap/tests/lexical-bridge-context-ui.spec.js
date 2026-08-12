import { expect, test } from 'playwright/test';

async function dismissResearchOnboarding(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('context-bible-onboarding-v1-dismissed', '1');
    window.localStorage.setItem('parallel-onboarding-v1-dismissed', '1');
  });
}

test('원어 브릿지는 문맥 성경 스타일 창과 3단 연구 흐름을 사용한다', async ({ page }) => {
  await dismissResearchOnboarding(page);
  await page.goto('./');

  await page.getByRole('button', { name: '원어 브릿지 열기' }).click();
  const dialog = page.getByRole('dialog', { name: '원어 브릿지' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/at-modal--context/);
  await expect(dialog.locator('.at-modal__titlebar')).toBeVisible();
  await expect(dialog.getByText('PILOT 0.2')).toBeVisible();
  await expect(dialog.getByText('현재 연구 질문')).toBeVisible();
  await expect(dialog.getByText('한눈에 읽는 브릿지')).toBeVisible();
  await expect(dialog.getByText('1').first()).toBeVisible();
  await expect(dialog.getByText('MT 원문에서 시작')).toBeVisible();
  await expect(dialog.getByText('A').first()).toBeVisible();
  await expect(dialog.getByText('LXX 실제 번역')).toBeVisible();
  await expect(dialog.getByText('LXX가 이렇게 옮김')).toBeVisible();
  await expect(dialog.getByText('B · C')).toBeVisible();
  await expect(dialog.getByText('NT 어휘 연결')).toBeVisible();
  await expect(dialog.getByText('NT에서 관계를 추적')).toBeVisible();
  await expect(dialog.getByText('그래서 지금 무엇을 말할 수 있나?')).toBeVisible();
  await expect(dialog.getByText('확인된 어휘 사실')).toBeVisible();
  await expect(dialog.getByText('아직 확정하지 않음')).toBeVisible();
  await expect(dialog.getByText('정경·신학 해석 후보')).toBeVisible();
  await expect(dialog.locator('[data-lexical-bridge-resize="true"]')).toBeVisible();
});

test.describe('모바일 원어 브릿지', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('문맥 성경과 같은 모바일 풀스크린 셸에서 세로 흐름을 읽을 수 있다', async ({ page }) => {
    await dismissResearchOnboarding(page);
    await page.goto('./');

    await page.getByRole('button', { name: '추가', exact: true }).click();
    const sheet = page.locator('.mobile-add-sheet');
    await sheet.getByRole('button', { name: '원어 브릿지 열기' }).click();

    const dialog = page.getByRole('dialog', { name: '원어 브릿지' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(/at-modal--context/);
    await expect(dialog.locator('.at-modal__titlebar')).toBeVisible();
    await expect(dialog.getByText('MT 원문에서 시작')).toBeVisible();
    await expect(dialog.getByText('LXX가 이렇게 옮김')).toBeVisible();
    await expect(dialog.getByText('NT에서 관계를 추적')).toBeVisible();
    await expect(dialog.getByText('↓').first()).toBeVisible();

    const close = dialog.getByRole('button', { name: '원어 브릿지 닫기' });
    const box = await close.boundingBox();
    expect(box?.width || 0).toBeGreaterThanOrEqual(44);
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  });
});
