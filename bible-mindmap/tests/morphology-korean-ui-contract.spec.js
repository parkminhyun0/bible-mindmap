import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const actionsSource = fs.readFileSync(path.join(root, 'src/components/OriginalLanguageResearchActions.jsx'), 'utf8');
const cardSource = fs.readFileSync(path.join(root, 'src/components/MorphologyKoreanCard.jsx'), 'utf8');

test('lexicon research surface exposes Korean morphology explanations', async () => {
  expect(actionsSource).toContain("import MorphologyKoreanCard from './MorphologyKoreanCard'");
  expect(actionsSource).toContain('<MorphologyKoreanCard code={entry.m} isHebrew={isHebrew} />');
  expect(cardSource).toContain("aria-label=\"형태론 한국어 해설\"");
  expect(cardSource).toContain('data-testid="morphology-korean-card"');
  expect(cardSource).toContain('detail.summary');
  expect(cardSource).toContain('detail.explanation');
  expect(cardSource).toContain('detail.caution');
});

test('morphology explanation remains visible without a resolved passage', async () => {
  expect(actionsSource).toContain('if (!entry) return null;');
  expect(actionsSource).not.toContain('if (!entry || !hasPassage) return null;');
  expect(actionsSource).toContain('{hasPassage && (');
});
