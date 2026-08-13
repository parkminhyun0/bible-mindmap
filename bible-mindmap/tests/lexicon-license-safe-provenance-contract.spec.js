import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const drawerSource = fs.readFileSync(path.join(root, 'src/components/LexiconTranslationDrawer.jsx'), 'utf8');
const indexHtmlSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verifyDeploySource = fs.readFileSync(path.join(root, 'scripts/verify-deploy.mjs'), 'utf8');

const REQUIRED_PROVENANCE_ROWS = [
  ['원 저작물', 'Brown–Driver–Briggs Hebrew and English Lexicon (1906) · Public Domain'],
  ['디지털 데이터', 'Open Scriptures Hebrew Lexicon · BrownDriverBriggs.xml'],
  ['Dataset', 'commit 21c9add13bc727d3a951361778e97e3ff7afd1ce'],
  ['라이선스', 'CC BY 4.0 · 출처표기 및 변경 고지 적용'],
  ['Attribution', 'Open Scriptures Hebrew Bible Project'],
  ['한국어판', '성경 마인드맵이 원 lexical data를 한국어로 번역·구조화한 파생 데이터'],
  ['사용 원칙', 'BibleHub 등 제3자 웹페이지는 canonical scraping source로 사용하지 않음'],
];

test('LexiconTranslationDrawer exposes a native React License-Safe provenance card', () => {
  expect(drawerSource).toContain('export function LicenseSafeProvenanceCard');
  expect(drawerSource).toContain('<LicenseSafeProvenanceCard />');
  expect(drawerSource).toContain('data-license-safe-notice="openscriptures-bdb"');
  expect(drawerSource).toContain('⚖️ 출처 · 라이선스 · 변경 고지');
  for (const [label, value] of REQUIRED_PROVENANCE_ROWS) {
    expect(drawerSource).toContain(label);
    expect(drawerSource).toContain(value);
  }
});

test('LexiconTranslationDrawer exposes the frozen word-search-korean-lexicon data attribute', () => {
  expect(drawerSource).toContain('data-word-search-korean-lexicon={strong}');
});

test('LexiconTranslationDrawer keeps existing approval metadata after the provenance card', () => {
  const cardIndex = drawerSource.indexOf('<LicenseSafeProvenanceCard />');
  const sourceRefsIndex = drawerSource.indexOf('원문 출처');
  const approvalDetailsIndex = drawerSource.indexOf('검증·승인 정보');
  expect(sourceRefsIndex).toBeGreaterThan(0);
  expect(approvalDetailsIndex).toBeGreaterThan(0);
  expect(cardIndex).toBeGreaterThan(sourceRefsIndex);
  expect(cardIndex).toBeLessThan(approvalDetailsIndex);
});

test('legacy PR #349 DOM-postprocessing provenance injection is fully removed', () => {
  expect(indexHtmlSource).not.toContain('installLicenseSafeLexiconNotice');
  expect(indexHtmlSource).not.toContain('lexicon-license-safe-notice');
});

test('verify-deploy asserts License-Safe provenance markers reach the shipped bundle', () => {
  expect(verifyDeploySource).toContain('21c9add13bc727d3a951361778e97e3ff7afd1ce');
  expect(verifyDeploySource).toContain('⚖️ 출처 · 라이선스 · 변경 고지');
  expect(verifyDeploySource).toContain('Open Scriptures Hebrew Lexicon');
  expect(verifyDeploySource).toContain('modulepreload');
});
