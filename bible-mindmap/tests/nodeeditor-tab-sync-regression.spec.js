import fs from 'node:fs';
import { expect, test } from 'playwright/test';

const ACTIVE_NODE_TAB_BG = 'rgb(0, 122, 255)';
const ACTIVE_EDITOR_TAB_BG = 'rgb(59, 130, 246)';
const KRV_14 = '요한이 잡힌 후 예수께서 갈릴리에 오셔서';
const KRV_15 = '하나님의 복음을 전파하시며 때가 찼고 하나님 나라가 가까이 왔으니';
const WEB_14 = 'Now after John was arrested, Jesus came into Galilee, preaching the Good News of God,';
const WEB_15 = 'and saying, The time is fulfilled, and the Kingdom of God is at hand.';

function languageOf(text) {
  if (/[\u0370-\u03ff\u1f00-\u1fff]/u.test(text)) return '헬라';
  if (/[가-힣]/u.test(text)) return '한글';
  if (/[A-Za-z]/u.test(text)) return '영어';
  return 'unknown';
}

function prefix40(text) {
  return [...text.replace(/^\s*14\s*/u, '').replace(/\s+/gu, ' ').trim()].slice(0, 40).join('');
}

async function installFixtures(page) {
  await page.route('https://bolls.life/get-text/KRV/41/1/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { verse: 14, text: KRV_14 },
        { verse: 15, text: KRV_15 },
      ]),
    });
  });
  await page.route('https://bolls.life/get-text/WEB/41/1/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { verse: 14, text: WEB_14 },
        { verse: 15, text: WEB_15 },
      ]),
    });
  });
  await page.route('**/data/lex/gnt/Mark/1.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        14: [
          { w: 'Μετὰ', s: 'G3326', m: 'P', l: 'μετά', tr: 'meta' },
          { w: 'δὲ', s: 'G1161', m: 'C', l: 'δέ', tr: 'de' },
          { w: 'τὸ', s: 'G3588', m: 'T-ASN', l: 'ὁ', tr: 'to' },
          { w: 'παραδοθῆναι', s: 'G3860', m: 'V-APN', l: 'παραδίδωμι', tr: 'paradothenai' },
          { w: 'τὸν', s: 'G3588', m: 'T-ASM', l: 'ὁ', tr: 'ton' },
          { w: 'Ἰωάννην', s: 'G2491', m: 'N-ASM', l: 'Ἰωάννης', tr: 'Ioannen' },
          { w: 'ἦλθεν', s: 'G2064', m: 'V-AAI-3S', l: 'ἔρχομαι', tr: 'elthen' },
          { w: 'ὁ', s: 'G3588', m: 'T-NSM', l: 'ὁ', tr: 'ho' },
          { w: 'Ἰησοῦς', s: 'G2424', m: 'N-NSM', l: 'Ἰησοῦς', tr: 'Iesous' },
          { w: 'εἰς', s: 'G1519', m: 'P', l: 'εἰς', tr: 'eis' },
          { w: 'τὴν', s: 'G3588', m: 'T-ASF', l: 'ὁ', tr: 'ten' },
          { w: 'Γαλιλαίαν', s: 'G1056', m: 'N-ASF', l: 'Γαλιλαία', tr: 'Galilaian' },
        ],
        15: [
          { w: 'καὶ', s: 'G2532', m: 'C', l: 'καί', tr: 'kai' },
          { w: 'λέγων', s: 'G3004', m: 'V-PAP-NSM', l: 'λέγω', tr: 'legon' },
        ],
      }),
    });
  });
}

async function addSelectedMarkPassage(page) {
  await page.goto('./');
  const sidebar = page.locator('.at-sidebar-panel');
  await expect(sidebar).toBeVisible();
  await sidebar.getByRole('button', { name: '신약 (27)', exact: true }).click();
  await sidebar.getByRole('button', { name: '마가복음', exact: true }).click();
  await sidebar.getByRole('button', { name: '1', exact: true }).click();
  const inputs = sidebar.locator('input[type="number"]');
  await inputs.nth(0).fill('14');
  await inputs.nth(1).fill('15');
  await sidebar.getByRole('button', { name: /본문 불러오기/ }).click();
  const add = sidebar.getByRole('button', { name: '+ 구절 추가', exact: true });
  await expect(add).toBeVisible({ timeout: 20_000 });
  await add.click();

  const node = page.locator('.react-flow__node').filter({ hasText: /마가복음 1:14[-–]15/ }).last();
  await expect(node).toBeVisible({ timeout: 15_000 });
  await node.locator('.at-canvas-node__title').click();
  await expect(node.locator('.at-canvas-node[data-selected="true"]')).toBeVisible();
  return node;
}

test('선택된 구절 노드의 번역 탭은 KRV 슬롯을 덮어쓰지 않고 직접 편집을 보존한다', async ({ page }) => {
  test.setTimeout(120_000);
  await installFixtures(page);
  const node = await addSelectedMarkPassage(page);
  const tablist = node.getByRole('tablist', { name: '성경 역본 선택' });
  const toolbar = page.locator('[data-node-editor-toolbar="true"]').filter({ hasText: '편집 역본:' });
  await expect(toolbar).toBeVisible();
  const snapshots = [];

  async function capture(label, tabName, expectedLanguage) {
    const nodeTab = tablist.getByRole('tab', { name: tabName, exact: true });
    const editorTab = toolbar.getByRole('button', { name: tabName, exact: true });
    await expect(nodeTab).toHaveAttribute('aria-selected', 'true');
    await expect(nodeTab).toHaveCSS('background-color', ACTIVE_NODE_TAB_BG);
    await expect(editorTab).toHaveCSS('background-color', ACTIVE_EDITOR_TAB_BG);
    const content = tablist.locator('xpath=following-sibling::*[1]');
    await expect.poll(async () => languageOf((await content.innerText()).trim())).toBe(expectedLanguage);
    const text = (await content.innerText()).replace(/\s+/gu, ' ').trim();
    snapshots.push({
      step: label,
      activeTab: tabName,
      bodyLanguage: languageOf(text),
      prefix40: prefix40(text),
    });
    return { content, text };
  }

  await capture('시작', '개역한글', '한글');

  await tablist.getByRole('tab', { name: '원어', exact: true }).click();
  await capture('원어', '원어', '헬라');

  await tablist.getByRole('tab', { name: 'WEB', exact: true }).click();
  await capture('WEB', 'WEB', '영어');

  await tablist.getByRole('tab', { name: '개역한글', exact: true }).click();
  const returned = await capture('개역한글 복귀', '개역한글', '한글');
  expect(prefix40(returned.text)).toMatch(/^요한이 잡힌 후/u);

  const editor = toolbar.locator('.node-editor-tiptap .ProseMirror');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' [편집보존]');
  await expect(editor).toContainText('[편집보존]');
  expect((await editor.innerText()).trim()).toMatch(/\[편집보존\]$/u);

  await page.keyboard.press('Control+A');
  await toolbar.getByTitle('굵게 (Ctrl+B)').click();
  await toolbar.locator('button[title="빨강"]').first().click();
  await expect(editor.locator('strong').first()).toBeVisible();
  await expect(editor.locator('span[style*="color"]').first()).toBeVisible();

  await tablist.getByRole('tab', { name: 'WEB', exact: true }).click();
  await capture('직접편집 후 WEB', 'WEB', '영어');
  await tablist.getByRole('tab', { name: '개역한글', exact: true }).click();
  await capture('직접편집 후 개역한글 복귀', '개역한글', '한글');
  await expect(editor).toContainText('[편집보존]');
  await expect(editor.locator('strong').first()).toBeVisible();
  await expect(editor.locator('span[style*="color"]').first()).toBeVisible();

  const trace = {
    snapshots,
    directEdit: {
      persisted: true,
      marker: '[편집보존]',
      boldPreserved: true,
      colorPreserved: true,
      editorPrefix40: prefix40(await editor.innerText()),
    },
  };
  console.log(`TASK5_TRACE_JSON=${JSON.stringify(trace)}`);
  if (process.env.TASK5_TRACE_PATH) {
    fs.writeFileSync(process.env.TASK5_TRACE_PATH, JSON.stringify(trace, null, 2));
  }
});
