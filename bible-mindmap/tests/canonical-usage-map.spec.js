import { expect, test } from 'playwright/test';

const REPRESENTATIVES = [
  { query: '보좌', label: '보좌', note: '하나님과 어린양의 보좌에서 생명수가 흐름' },
  { query: '기름부음', label: '기름부음', note: '성령의 기름부음이 진리 안에 머물게 함' },
  { query: '구름', label: '구름', note: '그리스도의 공개적 구름 재림을 선포함' },
  { query: '강', label: '강', note: '보좌에서 생명수의 강이 흘러나옴' },
  { query: '평화', label: '평화/샬롬', note: '십자가의 피로 만물을 하나님과 화목하게 함' },
  { query: '양자', label: '양자됨', note: '그리스도가 속량하여 아들의 명분을 얻게 함' },
];

async function openCanonicalSearch(page, scope = page) {
  const opener = scope.getByRole('button', { name: '정경 추적 핵심 개념 열기' }).last();
  await opener.click();
  const searchDialog = page.getByRole('dialog', { name: '정경 추적 · 정적 의미 검색' });
  await expect(searchDialog).toBeVisible();
  return { opener, searchDialog };
}

async function openConcept(page, searchDialog, { query, label }) {
  const input = searchDialog.getByRole('textbox', { name: '정경 개념 의미 검색' });
  await input.fill(query);
  const result = searchDialog.getByRole('button', { name: new RegExp(label) }).first();
  await expect(result).toBeVisible();
  await result.click();
  const dialog = page.getByRole('dialog', { name: `정경 추적 · ${label}` });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function assertUsageMap(page, dialog, note) {
  await dialog.getByRole('button', { name: /용례 지도/ }).click();
  await expect(dialog.getByText('정경 전체 용례', { exact: true })).toBeVisible();
  await expect(dialog.getByText(note, { exact: true })).toBeVisible();
  await expect(dialog.getByText(/용례는 점진적으로 계속 확장됩니다/)).toBeVisible();
  await expect(page.locator('[role="dialog"][aria-label^="정경 추적 ·"]')).toHaveCount(1);
}

test('Tier6~Tier11 대표 개념은 데스크톱 용례지도에 실제 데이터를 표시한다', async ({ page }) => {
  await page.goto('./');

  for (const representative of REPRESENTATIVES) {
    const { searchDialog } = await openCanonicalSearch(page);
    const dialog = await openConcept(page, searchDialog, representative);
    await assertUsageMap(page, dialog, representative.note);
    await dialog.getByRole('button', { name: '닫기' }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test.describe('모바일 정경 용례지도', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('Tier11 용례지도는 자료 추가 시트를 보존하고 세로 스크롤 안에서 표시된다', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: '추가', exact: true }).click();

    const sheet = page.locator('.mobile-add-sheet');
    await expect(sheet).toBeVisible();
    const { searchDialog } = await openCanonicalSearch(page, sheet);
    const representative = REPRESENTATIVES.at(-1);
    const dialog = await openConcept(page, searchDialog, representative);

    await assertUsageMap(page, dialog, representative.note);
    await expect(sheet).toHaveCount(1);
    await expect(dialog).toHaveCSS('overflow', 'hidden');
    const scrollRegion = dialog.locator('.momentum-scroll').or(dialog.locator('div[style*="overflow-y: auto"]')).first();
    await expect(scrollRegion).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(sheet).toBeVisible();
  });
});
