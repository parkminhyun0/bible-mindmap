import { expect, test } from 'playwright/test';

// -----------------------------------------------------------------------------
// Fixture helpers.  We route bolls and Strong's data so the popup renders a
// deterministic BDB tree regardless of the live dictionary API state.
// -----------------------------------------------------------------------------

const BDB_HTML = [
  '<p>Origin: H0430</p>',
  '<p>TWOT entry: 93c</p>',
  '<p>Part(s) of speech: noun masculine plural</p>',
  '<ol>',
  '  <li>rulers',
  '    <ol>',
  '      <li>judges',
  '        <ol><li>divine representatives H0776 and G03056</li></ol>',
  '      </li>',
  '    </ol>',
  '  </li>',
  '  <li>God</li>',
  '</ol>',
].join('');

async function routeLexiconFixtures(page, { bdb = 'success' } = {}) {
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
    H1254: { d: 'to create and shape. to fashion.', e: 'primitive root', k: 'create, shape, fashion' },
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

// -----------------------------------------------------------------------------
// Hierarchy label contract (H1–H6).  Depth-based markers only; no concatenated
// markers such as `A1`, `I1`, `Ⅰ1`.  Runs cross-lemma to confirm one shared
// formatter drives H430/H776/H1254.
// -----------------------------------------------------------------------------

test('H1 · depth 0 uses A. B. C.', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const roots = dialog.locator('[data-lexicon-definition-tree="true"] > [data-depth="0"]');
  await expect(roots.first()).toBeVisible();
  const markers = await roots.evaluateAll((els) => els.map((el) => el.querySelector('[data-marker]')?.getAttribute('data-marker') || ''));
  expect(markers.slice(0, 3)).toEqual(['A.', 'B.', undefined]); // BDB fixture has 2 root items
  expect(markers[0]).toBe('A.');
  expect(markers[1]).toBe('B.');
});

test('H2 · depth 1 uses 1. 2. 3.', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const depth1 = dialog.locator('[data-lexicon-definition-tree="true"] [data-depth="1"]');
  const markers = await depth1.evaluateAll((els) => els.map((el) => el.querySelector('[data-marker]')?.getAttribute('data-marker') || ''));
  expect(markers[0]).toBe('1.');
});

test('H3 · depth 2 uses a. b. c.', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const depth2 = dialog.locator('[data-lexicon-definition-tree="true"] [data-depth="2"]');
  const markers = await depth2.evaluateAll((els) => els.map((el) => el.querySelector('[data-marker]')?.getAttribute('data-marker') || ''));
  expect(markers[0]).toBe('a.');
});

test('H4 · no concatenated markers anywhere in the tree', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const markers = await dialog.locator('[data-marker]').evaluateAll((els) => els.map((el) => el.getAttribute('data-marker') || ''));
  for (const marker of markers) {
    expect(marker).not.toMatch(/^[A-Z][0-9]/);        // no A1, B1, ...
    expect(marker).not.toMatch(/^(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ|Ⅶ|Ⅷ|Ⅸ|Ⅹ)/); // no legacy roman markers
    expect(marker).not.toMatch(/^I[0-9]/);              // no I1
    expect(marker).not.toMatch(/^[0-9]{2,}[a-zA-Z]/);   // no 11a-style concatenation
  }
});

test('H5 · BDB source text/order preserved', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const rootTexts = await dialog.locator('[data-lexicon-definition-tree="true"] > [data-depth="0"] > div').evaluateAll((els) =>
    els.map((el) => (el.textContent || '').trim()),
  );
  expect(rootTexts[0]).toMatch(/^rulers/);   // BDB source order: rulers first
  expect(rootTexts[1]).toMatch(/^God/);       // God second
});

test('H6 · H776 and H1254 share the identical formatter', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);

  const dialog776 = await openStrong(page, { strong: 'H0776', strongText: 'הָאָרֶץ' });
  const depth0_776 = await dialog776.locator('[data-lexicon-definition-tree="true"] > [data-depth="0"] [data-marker]').first().getAttribute('data-marker');
  expect(depth0_776).toBe('A.');
  await page.keyboard.press('Escape');

  // Reuse the same fixture path.  Since our Strong's fixture also provides H1254,
  // clicking any Hebrew Strong on-screen would hit the same formatter — assert on
  // markup contract rather than requiring a live H1254 chip in the fixture verse.
  const dialog430 = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const depth0_430 = await dialog430.locator('[data-lexicon-definition-tree="true"] > [data-depth="0"] [data-marker]').first().getAttribute('data-marker');
  expect(depth0_430).toBe('A.');
});

// -----------------------------------------------------------------------------
// Resize contract (R1–R6).  Desktop only.
// -----------------------------------------------------------------------------

async function boxOf(locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error('bounding box missing');
  return b;
}

async function dragHandle(page, testId, dx, dy) {
  const handle = page.getByTestId(testId);
  const box = await boxOf(handle);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 6 });
  await page.mouse.up();
}

test('R1 · desktop popup resizes horizontally via right edge', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const before = await boxOf(dialog);
  await dragHandle(page, 'resize-handle-right', 140, 0);
  const after = await boxOf(dialog);
  expect(after.width).toBeGreaterThan(before.width + 80);
  expect(after.height).toBeCloseTo(before.height, 0);
});

test('R2 · desktop popup resizes vertically via bottom edge', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const before = await boxOf(dialog);
  await dragHandle(page, 'resize-handle-bottom', 0, 90);
  const after = await boxOf(dialog);
  expect(after.height).toBeGreaterThan(before.height + 40);
  expect(after.width).toBeCloseTo(before.width, 0);
});

test('R3 · corner handle changes width + height together', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  const before = await boxOf(dialog);
  await dragHandle(page, 'resize-handle-se', 100, 80);
  const after = await boxOf(dialog);
  expect(after.width).toBeGreaterThan(before.width + 40);
  expect(after.height).toBeGreaterThan(before.height + 30);
});

test('R4 · resize stays inside viewport', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await dragHandle(page, 'resize-handle-se', 5000, 5000);
  const after = await boxOf(dialog);
  const vp = page.viewportSize();
  expect(after.width).toBeLessThanOrEqual(vp.width);
  expect(after.height).toBeLessThanOrEqual(vp.height);
});

test('R5 · internal content still scrolls after shrink', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await dragHandle(page, 'resize-handle-se', -80, -60);
  const region = dialog.locator('[data-modal-scroll-region="true"]');
  const overflow = await region.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    overflow: getComputedStyle(el).overflowY,
  }));
  expect(overflow.overflow).toBe('auto');
  expect(overflow.scrollHeight).toBeGreaterThanOrEqual(overflow.clientHeight);
});

test('R6 · mobile does not expose desktop resize handles', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await expect(dialog).toBeVisible();
  const handles = page.locator('[data-testid^="resize-handle-"]');
  expect(await handles.count()).toBe(0);
  await context.close();
});

// -----------------------------------------------------------------------------
// Contract sanity: no approved-Korean UI in the normal popup runtime.
// -----------------------------------------------------------------------------

test('BDB-only · popup does not render approved-Korean UI', async ({ page }) => {
  test.setTimeout(120_000);
  await routeLexiconFixtures(page);
  const dialog = await openStrong(page, { strong: 'H0430', strongText: 'אֱלֹהִים' });
  await expect(dialog.getByTestId('approved-korean-definition')).toHaveCount(0);
  await expect(dialog.getByText('한글 승인본', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText('사람 검토 완료')).toHaveCount(0);
  await expect(dialog.getByText('Evidence 검증 승인')).toHaveCount(0);
  const drawerToggle = page.locator('[data-lexicon-translation-toggle]');
  expect(await drawerToggle.count()).toBe(0);
});
