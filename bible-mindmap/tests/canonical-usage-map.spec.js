import { expect, test } from 'playwright/test';
import { CANONICAL_CONCEPTS } from '../src/data/canonicalConcepts.js';
import { CANONICAL_USAGE_MAP } from '../src/data/canonicalUsageMap.js';

const TIERS = {
  Pilot: ['seed', 'temple', 'covenant', 'blood', 'rest', 'glory'],
  Tier1: ['kingdom', 'exodus', 'priest', 'lamb', 'king', 'shepherd'],
  Tier2: ['image', 'land', 'word', 'light', 'serpent', 'judgment'],
  Tier3: ['bride', 'mountain', 'wisdom', 'name', 'tree_of_life', 'wilderness'],
  Tier4: ['lion', 'vine', 'breath', 'cup', 'babylon', 'sea'],
  Tier5: ['fire', 'scroll', 'garment', 'bread', 'rock', 'dust'],
  Tier6: ['throne', 'mercy_seat', 'harvest', 'darkness', 'star', 'firstfruits'],
  Tier7: ['anointing', 'horn', 'firstborn', 'rain', 'incense', 'witness'],
  Tier8: ['cloud', 'trumpet', 'salt', 'redeemer', 'yoke', 'crown'],
  Tier9: ['river', 'dawn', 'honey', 'wings', 'lampstand', 'thorns'],
  Tier10: ['root', 'scepter', 'seal', 'dream', 'peace', 'sword'],
  Tier11: ['fountain', 'luminary', 'veil', 'adoption', 'gate', 'leaven'],
};

const MOBILE_REPRESENTATIVES = [
  'seed',
  'kingdom',
  'image',
  'bride',
  'lion',
  'fire',
  'throne',
  'anointing',
  'cloud',
  'river',
  'peace',
  'adoption',
];

function conceptCase(key) {
  const concept = CANONICAL_CONCEPTS[key];
  const usages = CANONICAL_USAGE_MAP[key];
  if (!concept || !Array.isArray(usages) || usages.length === 0) {
    throw new Error(`정경 개념 테스트 데이터 누락: ${key}`);
  }
  return {
    key,
    label: concept.labelKo,
    query: concept.labelKo.split(/[/(]/)[0].trim(),
    firstNote: usages[0].note,
    lastNote: usages.at(-1).note,
    usageCount: usages.length,
  };
}

async function openCanonicalSearch(page, scope = page) {
  const opener = scope.getByRole('button', { name: '정경 추적 핵심 개념 열기' }).last();
  await opener.click();
  const searchDialog = page.getByRole('dialog', { name: '정경 추적 · 정적 의미 검색' });
  await expect(searchDialog).toBeVisible();
  return searchDialog;
}

async function openConcept(page, searchDialog, { query, label }) {
  const input = searchDialog.getByRole('textbox', { name: '정경 개념 의미 검색' });
  await input.fill(query);
  const result = searchDialog.getByRole('button', {
    name: `${label} 정경 여정 상세 열기`,
    exact: true,
  });
  await expect(result).toBeVisible();
  await result.click();
  const dialog = page.getByRole('dialog', { name: `정경 추적 · ${label}` });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function assertUsageMap(page, dialog, testCase) {
  await dialog.getByRole('button', { name: /용례 지도/ }).click();
  await expect(dialog.locator('span').filter({ hasText: /^정경 전체 용례$/ })).toBeVisible();
  await expect(dialog.getByText(testCase.firstNote, { exact: true })).toBeVisible();
  await expect(dialog.getByText(testCase.lastNote, { exact: true })).toBeVisible();
  await expect(dialog.getByText(/용례는 점진적으로 계속 확장됩니다/)).toBeVisible();
  await expect(page.locator('[role="dialog"][aria-label^="정경 추적 ·"]')).toHaveCount(1);
  expect(testCase.usageCount).toBeGreaterThanOrEqual(6);
  expect(testCase.usageCount).toBeLessThanOrEqual(10);
}

for (const [tier, keys] of Object.entries(TIERS)) {
  test(`${tier} 6개념은 데스크톱 검색·상세·정경 전체 용례를 모두 표시한다`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('./');

    for (const key of keys) {
      const testCase = conceptCase(key);
      const searchDialog = await openCanonicalSearch(page);
      const dialog = await openConcept(page, searchDialog, testCase);
      await assertUsageMap(page, dialog, testCase);
      await dialog.getByRole('button', { name: '닫기' }).click();
      await expect(dialog).toHaveCount(0);
    }
  });
}

test.describe('모바일 정경 용례지도', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('Pilot~Tier11 대표 개념은 자료 추가 시트와 세로 스크롤 흐름을 보존한다', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('./');
    await page.getByRole('button', { name: '추가', exact: true }).click();

    const sheet = page.locator('.mobile-add-sheet');
    await expect(sheet).toBeVisible();
    const searchDialog = await openCanonicalSearch(page, sheet);

    for (const key of MOBILE_REPRESENTATIVES) {
      const testCase = conceptCase(key);
      const dialog = await openConcept(page, searchDialog, testCase);

      await assertUsageMap(page, dialog, testCase);
      await expect(sheet).toHaveCount(1);
      await expect(dialog).toHaveCSS('overflow', 'hidden');
      await expect(dialog.locator('div[style*="overflow-y: auto"]').first()).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(searchDialog).toBeVisible();
    }

    await searchDialog.getByRole('button', { name: '닫기' }).click();
    await expect(searchDialog).toHaveCount(0);
    await expect(sheet).toBeVisible();
  });
});