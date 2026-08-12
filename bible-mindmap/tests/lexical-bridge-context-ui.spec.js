import { expect, test } from 'playwright/test';

async function dismissResearchOnboarding(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('context-bible-onboarding-v1-dismissed', '1');
    window.localStorage.setItem('parallel-onboarding-v1-dismissed', '1');
  });
}

test('원어 브릿지는 문맥 성경과 같은 독립 데스크톱 창 계약을 사용한다', async ({ page }) => {
  await dismissResearchOnboarding(page);
  await page.goto('./');

  await page.getByRole('button', { name: '원어 브릿지 열기' }).click();
  const dialog = page.getByRole('dialog', { name: '원어 브릿지' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/at-modal--context/);
  await expect(dialog.locator('.at-modal__titlebar')).toBeVisible();
  await expect(dialog.getByText('PILOT 0.3')).toBeVisible();
  await expect(dialog.getByText('이 화면은 무엇을 보는가?')).toBeVisible();
  await expect(dialog.getByText('연구 흐름 · 1 → 2 → 3')).toBeVisible();
  await expect(dialog.getByText('MT 원문에서 시작')).toBeVisible();
  await expect(dialog.getByText('LXX가 이렇게 옮김')).toBeVisible();
  await expect(dialog.getByText('NT에서 관계를 추적')).toBeVisible();
  await expect(dialog.getByText('그래서 지금 무엇을 말할 수 있나?')).toBeVisible();

  const windowShell = page.locator('[data-lexical-bridge-window="true"]');
  await expect(windowShell).toBeVisible();
  await expect(page.locator('[data-lexical-bridge-backdrop="true"]')).toHaveCount(0);

  const resize = dialog.locator('[data-lexical-bridge-resize="true"]');
  await expect(resize).toBeVisible();
  const before = await dialog.boundingBox();
  const handle = await resize.boundingBox();
  expect(before).not.toBeNull();
  expect(handle).not.toBeNull();

  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 260, handle.y - 220, { steps: 8 });
  await page.mouse.up();

  const after = await dialog.boundingBox();
  expect(after).not.toBeNull();
  expect(after.width).toBeLessThan(before.width);
  expect(after.height).toBeLessThan(before.height);
  expect(after.width).toBeGreaterThanOrEqual(560);
  expect(after.height).toBeGreaterThanOrEqual(320);

  await expect(dialog.getByText('MT 원문에서 시작')).toBeVisible();
  await expect(dialog.getByText('NT에서 관계를 추적')).toBeVisible();
});

test.describe('모바일 원어 브릿지', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('문맥 성경 공통 프레임에서 실제 세로 스크롤이 동작한다', async ({ page }) => {
    await dismissResearchOnboarding(page);
    await page.goto('./');

    await page.getByRole('button', { name: '추가', exact: true }).click();
    const sheet = page.locator('.mobile-add-sheet');
    await sheet.getByRole('button', { name: '원어 브릿지 열기' }).click();

    const dialog = page.getByRole('dialog', { name: '원어 브릿지' });
    const backdrop = page.locator('.at-modal-backdrop[data-lexical-bridge-backdrop="true"]');
    const scrollRegion = dialog.locator('[data-lexical-bridge-scroll="true"]');

    await expect(dialog).toBeVisible();
    await expect(backdrop).toBeVisible();
    await expect(backdrop).toHaveAttribute('data-mobile-modal-frame', 'true');
    await expect(dialog).toHaveClass(/at-modal--context/);
    await expect(dialog.locator('.at-modal__titlebar')).toBeVisible();
    await expect(dialog.getByText('PILOT 0.3')).toBeVisible();
    await expect(dialog.getByText('MT 원문에서 시작')).toBeVisible();
    await expect(dialog.getByText('LXX가 이렇게 옮김')).toBeVisible();
    await expect(dialog.getByText('NT에서 관계를 추적')).toBeVisible();

    const scrollMetrics = await scrollRegion.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        overflowY: style.overflowY,
        touchAction: style.touchAction,
      };
    });
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
    expect(['auto', 'scroll']).toContain(scrollMetrics.overflowY);
    expect(scrollMetrics.touchAction).toContain('pan-y');

    const moved = await scrollRegion.evaluate((el) => {
      el.scrollTop = Math.min(320, Math.max(1, el.scrollHeight - el.clientHeight));
      return el.scrollTop;
    });
    expect(moved).toBeGreaterThan(0);

    await expect(dialog.getByText('정경·신학 해석 후보')).toBeVisible();

    const close = dialog.getByRole('button', { name: '원어 브릿지 닫기' });
    const box = await close.boundingBox();
    expect(box?.width || 0).toBeGreaterThanOrEqual(44);
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  });
});
