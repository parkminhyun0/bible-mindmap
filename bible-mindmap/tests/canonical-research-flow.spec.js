import { expect, test } from 'playwright/test';

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
