import { expect, test } from 'playwright/test';

async function expectDialogInsideVisualViewport(dialog) {
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportLeft: left,
      viewportRight: left + width,
      viewportTop: top,
      viewportBottom: top + height,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });

  expect(geometry.left).toBeGreaterThanOrEqual(geometry.viewportLeft - 1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportRight + 1);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

// 공통 연구 흐름 계약: 상세 종료는 전체 도구 종료가 아니라 직전 검색 단계 복귀를 우선한다.
test('정경 추적 상세에서 검색 상태를 유지한 채 돌아간다', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: '정경 추적 핵심 개념 열기' }).last().click();
  const searchDialog = page.getByRole('dialog', { name: '정경 추적 · 정적 의미 검색' });
  await expect(searchDialog).toBeVisible();

  const input = searchDialog.getByRole('textbox', { name: '정경 개념 의미 검색' });
  await input.fill('언약');
  await searchDialog.getByRole('button', { name: '언약 정경 여정 상세 열기', exact: true }).click();

  await expect(page.getByRole('dialog', { name: '정경 추적 · 언약' })).toBeVisible();
  const back = page.getByRole('button', { name: '정경 추적 검색으로 돌아가기' });
  await expect(back).toBeVisible();
  await back.click();

  await expect(searchDialog).toBeVisible();
  await expect(input).toHaveValue('언약');
  await expect(searchDialog.getByRole('button', { name: '언약 정경 여정 상세 열기', exact: true })).toBeVisible();
});

test('상세 화면 닫기는 전체 기능을 종료하지 않고 검색으로 복귀한다', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: '정경 추적 핵심 개념 열기' }).last().click();
  const searchDialog = page.getByRole('dialog', { name: '정경 추적 · 정적 의미 검색' });
  await expect(searchDialog).toBeVisible();

  const input = searchDialog.getByRole('textbox', { name: '정경 개념 의미 검색' });
  await input.fill('언약');
  await searchDialog.getByRole('button', { name: '언약 정경 여정 상세 열기', exact: true }).click();

  const detailDialog = page.getByRole('dialog', { name: '정경 추적 · 언약' });
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole('button', { name: '닫기' }).click();

  await expect(searchDialog).toBeVisible();
  await expect(input).toHaveValue('언약');
});

test.describe('iPhone 정경 추적 visual viewport 계약', () => {
  test.use({
    viewport: { width: 390, height: 664 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  test('검색·상세가 가로로 잘리지 않고 내부 스크롤과 탭 전환을 유지한다', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-device', 'mobile');

    await page.getByRole('button', { name: '추가', exact: true }).click();
    const addSheet = page.locator('.mobile-add-sheet');
    await expect(addSheet).toBeVisible();
    await addSheet.getByRole('button', { name: '정경 추적 핵심 개념 열기' }).click();

    const searchDialog = page.getByRole('dialog', { name: '정경 추적 · 정적 의미 검색' });
    await expect(searchDialog).toBeVisible();
    await expectDialogInsideVisualViewport(searchDialog);

    const searchScroll = await searchDialog.evaluate((dialog) => {
      const candidate = [dialog, ...dialog.querySelectorAll('*')].find((element) => {
        const style = window.getComputedStyle(element);
        return /(auto|scroll)/.test(style.overflowY)
          && element.scrollHeight > element.clientHeight + 1;
      });
      if (!candidate) return { found: false, scrollTop: 0, maxScroll: 0 };
      candidate.scrollTop = candidate.scrollHeight;
      return {
        found: true,
        scrollTop: candidate.scrollTop,
        maxScroll: candidate.scrollHeight - candidate.clientHeight,
      };
    });
    expect(searchScroll.found).toBe(true);
    expect(searchScroll.maxScroll).toBeGreaterThan(0);
    expect(searchScroll.scrollTop).toBeGreaterThan(0);

    const input = searchDialog.getByRole('textbox', { name: '정경 개념 의미 검색' });
    await input.fill('언약');
    await searchDialog.getByRole('button', { name: '언약 정경 여정 상세 열기', exact: true }).click();

    const detailDialog = page.getByRole('dialog', { name: '정경 추적 · 언약' });
    await expect(detailDialog).toBeVisible();
    await expectDialogInsideVisualViewport(detailDialog);

    await detailDialog.getByRole('button', { name: /신학 해설/ }).click();
    await expect(detailDialog.getByRole('button', { name: /신학 해설/ })).toBeVisible();
    await expectDialogInsideVisualViewport(detailDialog);

    await detailDialog.getByRole('button', { name: /정경 흐름/ }).click();
    await expect(detailDialog.getByRole('button', { name: /정경 흐름/ })).toBeVisible();
    await expectDialogInsideVisualViewport(detailDialog);
  });
});
