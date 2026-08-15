import { expect, test } from 'playwright/test';
import { analyzeHebrewMorphologyMeaning, hebrewStemGuidance, hebrewStemGuidanceList } from '../src/utils/hebrewMeaningAnalysis.js';

test('Piel morphology explains the stem without reducing it to emphasis and prefers matching BDB branch', () => {
  const nodes = [
    { id: 'q', depth: 0, text: 'Qal — to write', children: [] },
    { id: 'p', depth: 0, text: 'Piel — to inscribe, record', children: [
      { id: 'p1', depth: 1, text: 'to record carefully', children: [] },
    ] },
  ];
  const analysis = analyzeHebrewMorphologyMeaning('HVpp3ms', nodes);

  expect(analysis.kind).toBe('verb');
  expect(analysis.stem).toBe('Piel');
  expect(analysis.title).toContain('피엘');
  expect(analysis.explanation).toContain('강조형');
  expect(analysis.branches).toHaveLength(1);
  expect(analysis.branches[0].text).toContain('Piel');
});

test('H430-like plural nominal morphology does not apply Binyan and surfaces plural-related BDB sense branch', () => {
  const nodes = [
    { id: 'n1', depth: 0, text: 'rulers, judges', children: [] },
    { id: 'n2', depth: 0, text: 'plural intensive — God', children: [
      { id: 'n2a', depth: 1, text: 'the true God', children: [] },
    ] },
  ];
  const analysis = analyzeHebrewMorphologyMeaning('HNcmpa', nodes);

  expect(analysis.kind).toBe('nominal');
  expect(analysis.grammarSummary).toContain('복수');
  expect(analysis.explanation).toContain('Binyan');
  expect(analysis.branches.some((branch) => branch.text.includes('plural intensive'))).toBeTruthy();
  expect(analysis.caution).toContain('여러 개체');
});

test('when no exact BDB morphology label is found, analysis falls back to source top-level branches instead of inventing a sense', () => {
  const nodes = [
    { id: 'a', depth: 0, text: 'first source sense', children: [] },
    { id: 'b', depth: 0, text: 'second source sense', children: [] },
  ];
  const analysis = analyzeHebrewMorphologyMeaning('HVhp3ms', nodes);

  expect(analysis.kind).toBe('verb');
  expect(analysis.stem).toBe('Hiphil');
  expect(analysis.sourceLabel).toBe('BDB · 주요 의미 분기');
  expect(analysis.branches.map((branch) => branch.text)).toEqual(['first source sense', 'second source sense']);
});

test('stem guidance includes passive derived stems too', () => {
  expect(hebrewStemGuidance('Pual')?.ko).toBe('푸알');
  expect(hebrewStemGuidance('Hophal')?.ko).toBe('호팔');
});

test('seven-Binyan guide exposes Korean interpretation and semantic-shift explanations in canonical order', () => {
  const guides = hebrewStemGuidanceList();
  expect(guides.map((guide) => guide.stem)).toEqual([
    'Qal', 'Niphal', 'Piel', 'Pual', 'Hiphil', 'Hophal', 'Hithpael',
  ]);
  expect(guides).toHaveLength(7);
  for (const guide of guides) {
    expect(guide.ko).toBeTruthy();
    expect(guide.interpretation.length).toBeGreaterThan(20);
    expect(guide.semanticShift.length).toBeGreaterThan(20);
  }
  expect(hebrewStemGuidance('Piel')?.interpretation).toContain('강조형');
  expect(hebrewStemGuidance('Hiphil')?.semanticShift).toContain('하게 하다');
  expect(hebrewStemGuidance('Hithpael')?.semanticShift).toContain('서로');
});
