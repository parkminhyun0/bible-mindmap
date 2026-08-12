import { expect, test } from 'playwright/test';

test('iPhone landscape에서도 원어 브릿지 finger-scroll viewport를 유지한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-iphone', 'WebKit iPhone landscape regression only');

  await page.addInitScript(() => {
    window.localStorage.setItem('context-bible-onboarding-v1-dismissed', '1');
    window.localStorage.setItem('parallel-onboarding-v1-dismissed', '1');
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('./');

  await page.getByRole('button', { name: '추가', exact: true }).click();
  const sheet = page.locator('.mobile-add-sheet');
  await sheet.getByRole('button', { name: '원어 브릿지 열기' }).click();

  const dialog = page.getByRole('dialog', { name: '원어 브릿지' });
  const backdrop = page.locator('.at-modal-backdrop[data-lexical-bridge-backdrop="true"]');
  const scrollRegion = dialog.locator('[data-lexical-bridge-scroll="true"]');

  await expect(dialog).toBeVisible();
  await expect(backdrop).toHaveAttribute('data-mobile-modal-frame', 'true');

  const metrics = await scrollRegion.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: style.overflowY,
      touchAction: style.touchAction,
    };
  });

  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(['auto', 'scroll']).toContain(metrics.overflowY);
  expect(metrics.touchAction).toContain('pan-y');

  const upwardPrevented = await scrollRegion.evaluate((el) => {
    const dispatch = (type, y) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', {
        configurable: true,
        value: [{ clientX: 420, clientY: y }],
      });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    };

    el.scrollTop = 0;
    dispatch('touchstart', 300);
    return dispatch('touchmove', 220);
  });

  expect(upwardPrevented).toBe(false);
});
