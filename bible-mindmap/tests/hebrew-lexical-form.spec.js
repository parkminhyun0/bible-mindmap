import { expect, test } from 'playwright/test';
import { normalizeHebrewLexicalForm } from '../src/utils/hebrewLexicalForm.js';

test('Hebrew lexical form strips segmented article and punctuation', () => {
  expect(normalizeHebrewLexicalForm('הָ/אָֽרֶץ\\׃')).toBe('אָרֶץ');
});

test('Hebrew lexical form strips conjunction + article prefixes when segmented', () => {
  expect(normalizeHebrewLexicalForm('וְ/הָ/אָֽרֶץ')).toBe('אָרֶץ');
});

test('Hebrew lexical form preserves consonants and niqqud but removes cantillation', () => {
  expect(normalizeHebrewLexicalForm('בָּרָ֣א')).toBe('בָּרָא'.normalize('NFC'));
  expect(normalizeHebrewLexicalForm('אֶרֶץ׃')).toBe('אֶרֶץ');
});
