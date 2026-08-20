import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { expect, test } from 'playwright/test';
import { joinHebrewDisplayWords, normalizeHebrewLexiconWords } from '../src/utils/hebrewDisplay.js';

const countHebrewMarks = (value) => (String(value).match(/[\u0591-\u05C7]/gu) || []).length;
const countChar = (value, char) => [...String(value)].filter((item) => item === char).length;

async function dismissOnboarding(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('context-bible-onboarding-v1-dismissed', '1');
    window.localStorage.setItem('parallel-onboarding-v1-dismissed', '1');
  });
}

async function addPassage(page, { nt = false, book, chapter, start, end, reference }) {
  await page.goto('./');
  const sidebar = page.locator('.at-sidebar-panel');
  await expect(sidebar).toBeVisible();
  if (nt) await sidebar.getByRole('button', { name: '신약 (27)', exact: true }).click();
  await sidebar.getByRole('button', { name: book, exact: true }).click();
  await sidebar.getByRole('button', { name: String(chapter), exact: true }).click();
  const inputs = sidebar.locator('input[type="number"]');
  await inputs.nth(0).fill(String(start));
  await inputs.nth(1).fill(String(end));
  await sidebar.getByRole('button', { name: /본문 불러오기/ }).click();
  const add = sidebar.getByRole('button', { name: '+ 구절 추가', exact: true });
  await expect(add).toBeVisible({ timeout: 20_000 });
  await add.click();
  const node = page.locator('.react-flow__node').filter({ hasText: reference }).last();
  await expect(node).toBeVisible({ timeout: 15_000 });
  await node.click();
  await expect(node.locator('.at-canvas-node[data-selected="true"]')).toBeVisible({ timeout: 10_000 });
  await node.getByRole('tab', { name: '원어', exact: true }).click();
  const word = node.locator('span[title*="클릭: 어형 카드"]').first();
  await expect(word).toBeVisible({ timeout: 20_000 });
  return { node, word };
}

test('Task4 Hebrew display normalization keeps lookup data, marks, webfont and Greek flow', async ({ page }) => {
  execFileSync('npm', ['run', 'lint'], { stdio: 'inherit' });

  const hot = JSON.parse(fs.readFileSync('./public/data/lex/hot/Gen/1.json', 'utf8'));
  const rawWords = ['1', '2', '3'].flatMap((verse) => hot[verse] || []);
  const raw = rawWords.map((word) => word.w || '').join(' ');
  const normalizedWords = normalizeHebrewLexiconWords(rawWords);
  const normalized = joinHebrewDisplayWords(rawWords);
  const before = {
    slash: countChar(raw, '/'),
    backslash: countChar(raw, '\\'),
    marks: countHebrewMarks(raw),
  };
  const after = {
    slash: countChar(normalized, '/'),
    backslash: countChar(normalized, '\\'),
    marks: countHebrewMarks(normalized),
  };

  expect(rawWords).toHaveLength(27);
  expect(before).toEqual({ slash: 12, backslash: 6, marks: 110 });
  expect(after).toEqual({ slash: 0, backslash: 0, marks: 110 });
  expect(normalized).toContain('עַל־פְּנֵ֣י');
  expect(normalizedWords.map(({ s, m }) => ({ s, m }))).toEqual(rawWords.map(({ s, m }) => ({ s, m })));

  await dismissOnboarding(page);
  const hebrew = await addPassage(page, {
    book: '창세기', chapter: 1, start: 1, end: 3, reference: '창세기 1:1-3',
  });
  const hebrewBody = hebrew.node.locator('.at-canvas-node__body');
  const hebrewText = (await hebrewBody.textContent()) || '';
  expect(countChar(hebrewText, '/')).toBe(0);
  expect(countChar(hebrewText, '\\')).toBe(0);
  expect(countHebrewMarks(hebrewText)).toBe(110);
  expect(hebrewText).toContain('עַל־פְּנֵ֣י');

  const fontEvidence = await hebrew.word.evaluate(async (element) => {
    await document.fonts.load('16px "Noto Serif Hebrew"');
    await document.fonts.ready;
    const faces = [...document.fonts]
      .filter((face) => face.family.replace(/["']/g, '').includes('Noto Serif Hebrew'))
      .map((face) => ({ family: face.family, status: face.status }));
    return {
      computedFamily: getComputedStyle(element).fontFamily,
      faces,
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
    };
  });
  expect(fontEvidence.computedFamily).toContain('Noto Serif Hebrew');
  expect(fontEvidence.stylesheets.some((href) => href.includes('Noto+Serif+Hebrew'))).toBeTruthy();
  expect(fontEvidence.faces.some((face) => face.status === 'loaded')).toBeTruthy();

  const title = await hebrew.word.getAttribute('title');
  const strong = title?.match(/H\d+/)?.[0];
  expect(strong).toBeTruthy();
  await hebrew.word.click();
  const popup = page.getByRole('dialog', { name: /원어 사전/ }).last();
  await expect(popup).toBeVisible({ timeout: 10_000 });
  await expect(popup).toContainText(strong);

  await dismissOnboarding(page);
  const greek = await addPassage(page, {
    nt: true, book: '마가복음', chapter: 1, start: 14, end: 15, reference: '마가복음 1:14-15',
  });
  const greekText = ((await greek.node.locator('.at-canvas-node__body').textContent()) || '').normalize('NFC');
  expect(greekText).toContain('Καὶ μετὰ δὲ τὸ παραδοθῆναι');
  expect(greekText).toContain('Ἰησοῦς');
  expect(greekText).toContain('Γαλιλαίαν');
  expect(countChar(greekText, '/')).toBe(0);
  expect(countChar(greekText, '\\')).toBe(0);

  console.log(JSON.stringify({ before, after, strong, fontEvidence, greekOpening: greekText.slice(0, 180) }, null, 2));
});
