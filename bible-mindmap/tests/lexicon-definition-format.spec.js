import { expect, test } from 'playwright/test';

const HASH = `sha256:${'a'.repeat(64)}`;
const BDB_HTML = '<p>Origin: H0430</p><p>TWOT entry: 93c</p><p>Part(s) of speech: noun masculine plural</p><ol><li>rulers<ol><li>judges<ol><li>divine representatives H0776 and G03056</li></ol></li></ol></li><li>God</li></ol>';

function approvedEntry(strong, text) {
  return {
    identity: { canonicalStrong: strong, language: 'hebrew', lemma: 'fixture', transliteration: { scientific: 'fixture', korean: '픽스처' }, sourceRefs: [] },
    approvedSenseTree: [{ id: '1', parentId: null, order: 1, translationKo: text, evidenceSupport: 'direct' }],
    reviewer: { reviewerType: 'human', reviewerId: 'fixture-reviewer' },
    approvedAt: '2026-08-14T00:00:00.000Z',
    evidencePacketFingerprint: HASH,
  };
}

async function routeApprovalFixtures(page, entries = []) {
  const registryEntries = entries.map(({ strong }) => ({ strong, language: 'hebrew', shardPath: 'shards/test.json', entryFingerprint: HASH }));
  await page.route('**/lexicon/ko/registry.json', (route) => route.fulfill({ json: { schemaVersion: 1, count: registryEntries.length, manifestFingerprint: HASH, entries: registryEntries } }));
  await page.route('**/lexicon/ko/manifests/hebrew.json', (route) => route.fulfill({ json: { schemaVersion: 1, count: registryEntries.length, manifestFingerprint: HASH, entries: registryEntries } }));
  await page.route('**/lexicon/ko/shards/test.json', (route) => route.fulfill({ json: { schemaVersion: 1, count: entries.length, shardFingerprint: HASH, entries: entries.map(({ strong, text }) => approvedEntry(strong, text)) } }));
}

async function routeLexiconFixtures(page, { bdb = 'success', approved = [] } = {}) {
  await routeApprovalFixtures(page, approved);
  await page.route('**/data/lex/hot/Gen/1.json', (route) => route.fulfill({ json: {
    '1': [
      { w: 'אֱלֹהִים', l: 'אֱלֹהִים', g: 'God', s: 'H0430', m: 'HNcmpa' },
      { w: 'הָאָרֶץ', l: 'אֶרֶץ', g: 'earth', s: 'H0776', m: 'HNcfsa' },
    ],
  } }));
  await page.route('**/data/lex/gnt/John/1.json', (route) => route.fulfill({ json: {
    '1': [{ w: 'λόγος', l: 'λόγος', g: 'word', s: 'G3056', m: 'N-NSM' }],
  } }));
  await page.route('**/data/strongs-def/hot/0.json', (route) => route.fulfill({ json: {
    H430: { d: 'rulers and judges. the true God H0776.', e: 'plural of H433', k: 'God, gods' },
    H776: { d: 'land and earth. country.', e: 'from an unused root', k: 'earth, land' },
  } }));
  await page.route('**/data/strongs-def/gnt/3.json', (route) => route.fulfill({ json: {
    G3056: { d: 'a word H0430. a statement G3056.', e: 'from G3004', k: 'account, saying, word' },
  } }));
  await page.route('https://bolls.life/dictionary-definition/BDBT/**', (route) => {
    if (bdb === 'success') return route.fulfill({ json: [{ topic: 'H430', definition: BDB_HTML }] });
    return route.fulfill({ status: 503, body: 'fixture unavailable' });
  });
}

async function openStrong(page, { book = '창세기', strong, strongText }) {
  await page.goto('./');
  if (book === '요한복음') {
    await page.getByRole('button', { name: '신약 (27)', exact: true }).click();
  }
  await page.getByRole('button', { name: book, exact: true }).first().click();
  await page.getByRole('button', { name: '1', exact: true }).first().click();
  await page.getByRole('button', { name: '📖 본문 불러오기' }).click();
  await page.getByRole('button', { name: '+ 구절 추가' }).click();
  const node = page.locator('.react-flow__node').filter({ hasText: `${book} 1:1` }).first();
  await expect(node).toBeVisible();
  await node.click({ position: { x: 220, y: 24 } });
  await expect(node).toHaveClass(/selected/);
  const originalTab = node.getByRole('tab', { name: '원어', exact: true });
  const editorTranslation = page.getByText('편집 역본:', { exact: true }).locator('..');
  await editorTranslation.getByRole('button', { name: '원어', exact: true }).click();
  await expect(originalTab).toHaveAttribute('aria-selected', 'true');
  const strongWord = node.locator(`span[title*="${strong}"]`).filter({ hasText: strongText }).first();
  await expect(strongWord).toBeVisible({ timeout: 30_000 });
  await strongWord.click();
  const dialog = page.getByRole('dialog', { name: new RegExp(`원어 사전 · ${strongText}`) });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('T1 · 히브리어 BDB 정상은 중첩 구조 트리와 BDB 배지를 표시한다', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await expect(dialog.getByText('BDB', { exact: true })).toBeVisible();
  await expect(dialog.locator('[data-lexicon-definition-tree="true"] [data-depth="2"]')).toContainText('divine representatives');
});

test('T2 · BDB 실패는 Strong 구조 트리와 명시적 실패 상태로 폴백한다', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page, { bdb: 'failure' });
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await expect(dialog.getByText("Strong's", { exact: true })).toBeVisible();
  await expect(dialog.getByTestId('bdb-fallback-status')).toHaveText("BDB 조회 실패 · Strong's 표시");
  await expect(dialog.locator('[data-lexicon-definition-tree="true"] > li')).toHaveCount(2);
  await expect(dialog.locator('p.lex-kjv')).toHaveCount(0);
});

test('T3 · 헬라어도 공통 트리를 쓰고 KJV 용례는 meta에 둔다', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { book: '요한복음', strong: 'G3056', strongText: 'λόγος' });
  await expect(dialog.locator('[data-lexicon-definition-tree="true"] > li')).toHaveCount(2);
  await expect(dialog.getByTestId('lexicon-definition-meta')).toContainText('KJV 용례:');
  await expect(dialog.locator('p.lex-kjv')).toHaveCount(0);
});

test('T4 · H776 한글 승인본은 텍스트를 바꾸지 않고 정의 탭 상단에 표시한다', async ({ page }) => {
  test.setTimeout(120_000);
  const approvedText = '땅, 나라, 영토 — 승인본 바이트 계약';
  await routeLexiconFixtures(page, { approved: [{ strong: 'H776', text: approvedText }] });
  const dialog = await openStrong(page, { strong: 'H0776', strongText: 'הָאָרֶץ' });
  await expect(dialog.getByText('한글 승인본', { exact: true })).toBeVisible();
  const tree = dialog.getByTestId('approved-korean-definition');
  await expect(tree).toContainText(approvedText);
  expect(await tree.locator(':scope > [data-lexicon-definition-tree="true"] > [data-depth="0"] > div').innerText()).toBe(approvedText);
  await expect(tree.getByText('영문 BDB 원문')).toBeVisible();
});

test('T5 · 정의와 헤더의 BibleHub 및 TWOT 링크 정책을 보존한다', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await expect(dialog.locator('a[href="https://biblehub.com/hebrew/776.htm"]')).toBeVisible();
  await expect(dialog.locator('a[href="https://biblehub.com/greek/3056.htm"]')).toBeVisible();
  await expect(dialog.locator('a[href="https://biblehub.com/twot/93.htm"]')).toBeVisible();
  await expect(dialog.getByRole('link', { name: /📖 BibleHub 전체 사전 \(H0430\)/ })).toHaveAttribute('href', 'https://biblehub.com/hebrew/430.htm');
});

test('T6 · 승인 Strong의 한글 사전 브리지 DOM과 드로어를 보존한다', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page, { approved: [{ strong: 'H776', text: '승인된 땅' }] });
  const dialog = await openStrong(page, { strong: 'H0776', strongText: 'הָאָרֶץ' });
  await expect(dialog.locator('span', { hasText: 'HEBREW LEXICON' })).toBeVisible();
  await expect(dialog.locator('a').first()).toHaveAttribute('href', 'https://biblehub.com/hebrew/776.htm');
  const toggle = dialog.locator('[data-lexicon-translation-toggle="H776"]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('dialog', { name: 'H776 승인 한글 사전' })).toBeVisible();
});

test('T7 · 레지스트리에 임의 Strong을 추가하면 코드 변경 없이 승인본으로 자동 전환한다', async ({ page }) => {
  test.setTimeout(120_000);
  const text = '임의 승인 항목 자동 전환';
  await routeLexiconFixtures(page, { approved: [{ strong: 'H430', text }] });
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await expect(dialog.getByText('한글 승인본', { exact: true })).toBeVisible();
  await expect(dialog.getByTestId('approved-korean-definition')).toContainText(text);
});
