import { expect, test } from 'playwright/test';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

const SUBPIXEL_TOLERANCE = 0.5;

async function dismissResearchOnboarding(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('context-bible-onboarding-v1-dismissed', '1');
    window.localStorage.setItem('parallel-onboarding-v1-dismissed', '1');
  });
}

async function assertFocusCycle(page, dialog) {
  const focusableCount = await dialog.locator(FOCUSABLE).count();
  expect(focusableCount).toBeGreaterThan(1);

  await dialog.evaluate((element, selector) => {
    const visible = Array.from(element.querySelectorAll(selector)).filter((node) => {
      const style = window.getComputedStyle(node);
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && node.getClientRects().length > 0;
    });
    visible[0].focus();
  }, FOCUSABLE);
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => dialog.evaluate((element, selector) => {
    const visible = Array.from(element.querySelectorAll(selector)).filter((node) => {
      const style = window.getComputedStyle(node);
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && node.getClientRects().length > 0;
    });
    return document.activeElement === visible.at(-1);
  }, FOCUSABLE)).toBe(true);

  await page.keyboard.press('Tab');
  await expect.poll(() => dialog.evaluate((element, selector) => {
    const visible = Array.from(element.querySelectorAll(selector)).filter((node) => {
      const style = window.getComputedStyle(node);
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && node.getClientRects().length > 0;
    });
    return document.activeElement === visible[0];
  }, FOCUSABLE)).toBe(true);
}

test('문맥 성경은 포커스를 가두고 Escape 뒤 실행 버튼으로 복귀한다', async ({ page }) => {
  await dismissResearchOnboarding(page);
  await page.goto('./');

  const opener = page.getByRole('button', { name: /문맥 성경/ }).first();
  await opener.click();
  const dialog = page.getByRole('dialog', { name: /문맥 성경/ });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  await assertFocusCycle(page, dialog);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
});

test('사용자 매뉴얼은 데스크톱에서 포커스 순환·Escape·실행 버튼 복귀를 보장한다', async ({ page }) => {
  await page.goto('./');

  const opener = page.getByTitle('사용자 매뉴얼').first();
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '사용자 매뉴얼' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(dialog).toHaveAttribute('data-modal-bridge-attached', 'true');
  await assertFocusCycle(page, dialog);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('병렬 연구 포털은 공통 레이어와 동일한 포커스 생명주기를 사용한다', async ({ page }) => {
  await dismissResearchOnboarding(page);
  await page.goto('./');

  const opener = page.getByRole('button', { name: '병렬 본문 연구 열기' }).last();
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '병렬 본문 연구' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => dialog.evaluate((element) => (
    window.getComputedStyle(element.parentElement).zIndex
  ))).toBe('1250');
  await assertFocusCycle(page, dialog);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
});

test('다크 모드와 모션 감소에서도 병렬 연구 키보드 계약을 유지한다', async ({ page }) => {
  await dismissResearchOnboarding(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('bible-mindmap-theme', 'dark');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const opener = page.getByRole('button', { name: '병렬 본문 연구 열기' }).last();
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '병렬 본문 연구' });
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test.describe('모바일 모달 계약', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('문맥 성경이 자료 추가 시트를 보존하고 배경 스크롤 잠금을 복원한다', async ({ page }) => {
    await dismissResearchOnboarding(page);
    await page.goto('./');
    await page.getByRole('button', { name: '추가', exact: true }).click();

    const sheet = page.locator('.mobile-add-sheet');
    const opener = sheet.getByRole('button', { name: /문맥 성경/ });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: /문맥 성경/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(sheet).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => document.body.style.overscrollBehavior)).toBe('none');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(sheet).toBeVisible();
    await expect(opener).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overscrollBehavior)).toBe('');
  });

  test('사용자 매뉴얼이 모바일 시트를 보존하고 body·html 스크롤 상태를 복원한다', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: '추가', exact: true }).click();

    const sheet = page.locator('.mobile-add-sheet');
    const opener = sheet.getByTitle('사용자 매뉴얼');
    await opener.click();
    const dialog = page.getByRole('dialog', { name: '사용자 매뉴얼' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(sheet).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => ({
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscroll: document.documentElement.style.overscrollBehavior,
    }))).toEqual({
      bodyOverflow: 'hidden',
      bodyOverscroll: 'none',
      htmlOverflow: 'hidden',
      htmlOverscroll: 'none',
    });

    // The shell has a short translateY entrance animation. Assert the final
    // layout boundary rather than sampling an intermediate animation frame.
    await expect.poll(async () => {
      const bounds = await dialog.boundingBox();
      return Boolean(bounds
        && bounds.x >= -SUBPIXEL_TOLERANCE
        && bounds.y >= -SUBPIXEL_TOLERANCE
        && bounds.x + bounds.width <= 390 + SUBPIXEL_TOLERANCE
        && bounds.y + bounds.height <= 844 + SUBPIXEL_TOLERANCE);
    }).toBe(true);
    await assertFocusCycle(page, dialog);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(sheet).toBeVisible();
    await expect(opener).toBeFocused();
    await expect.poll(() => page.evaluate(() => ({
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscroll: document.documentElement.style.overscrollBehavior,
    }))).toEqual({
      bodyOverflow: '',
      bodyOverscroll: '',
      htmlOverflow: '',
      htmlOverscroll: '',
    });
  });
});

test.describe('태블릿 모달 계약', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
  });

  test('터치 태블릿 레이아웃에서도 병렬 연구 포커스를 유지한다', async ({ page }) => {
    await dismissResearchOnboarding(page);
    await page.goto('./');

    const opener = page.getByRole('button', { name: '병렬 본문 연구 열기' }).last();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: '병렬 본문 연구' });
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
  });
});
