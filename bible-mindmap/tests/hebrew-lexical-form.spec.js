import { expect, test } from 'playwright/test';
import { normalizeHebrewLexicalForm, normalizeHebrewSurfaceForm } from '../src/utils/hebrewLexicalForm.js';
import { buildHebrewWordComposition, humanizeHebrewMorphCode } from '../src/utils/hebrewMorphologyDisplay.js';

test('Hebrew lexical form strips segmented article and punctuation', () => {
  expect(normalizeHebrewLexicalForm('הָ/אָֽרֶץ\\׃')).toBe('אָרֶץ');
});

test('Hebrew lexical form strips conjunction + article prefixes when segmented', () => {
  expect(normalizeHebrewLexicalForm('וְ/הָ/אָֽרֶץ')).toBe('אָרֶץ');
});

test('Hebrew surface form preserves segmented prefixes while removing accents and punctuation', () => {
  expect(normalizeHebrewSurfaceForm('הָ/אָֽרֶץ\\׃')).toBe('הָאָרֶץ');
  expect(normalizeHebrewSurfaceForm('וְ/הָ/אָֽרֶץ')).toBe('וְהָאָרֶץ');
});

test('Hebrew lexical form preserves consonants and niqqud but removes cantillation', () => {
  expect(normalizeHebrewLexicalForm('בָּרָ֣א')).toBe('בָּרָא'.normalize('NFC'));
  expect(normalizeHebrewLexicalForm('אֶרֶץ׃')).toBe('אֶרֶץ');
});

test('Hebrew morphology composition aligns source segments with their morphology', () => {
  expect(buildHebrewWordComposition('הָ/אָֽרֶץ\\׃', 'HTd/Ncfsa')).toEqual([
    { form: 'הָ', code: 'Td', human: '정관사' },
    { form: 'אָרֶץ', code: 'Ncfsa', human: '명사 · 여성 · 단수 · 독립형' },
  ]);
});

test('Hebrew verb morphology uses source stem and conjugation codes', () => {
  expect(humanizeHebrewMorphCode('HVqp3ms')).toBe('동사 · Qal · 완료 · 3인칭 · 남성 · 단수');
});
