#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KOREAN_GLOSS_ACTIVE } from '../src/data/koreanGlossActive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DEFAULT_LOCK = path.join(APP_ROOT, 'data/lexicon/luke-g0-source-lock.json');
const DEFAULT_OUT = path.join(APP_ROOT, 'data/lexicon/luke-g0-inventory.json');
const DEFAULT_REPORT = path.join(APP_ROOT, 'data/lexicon/luke-g0-report.json');
const DEFAULT_DOC = path.join(APP_ROOT, 'docs/luke-g0-inventory.md');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = value;
      i += 1;
    }
  }
  return args;
}

function normalizeStrong(value) {
  const match = String(value || '').match(/G0*(\d+)/i);
  if (!match) return '';
  return `G${Number(match[1])}`;
}

function normalizeLemma(value) {
  return String(value || '').normalize('NFC').trim().toLocaleLowerCase('el');
}

function parseWordTransliteration(field) {
  const value = String(field || '').trim();
  const match = value.match(/^(.+?)\s+\(([^)]+)\)$/u);
  if (!match) return { word: value, transliteration: '' };
  return { word: match[1].trim(), transliteration: match[2].trim() };
}

function parseLemmaGloss(field) {
  const value = String(field || '').replace(/^\uFEFF/u, '').trim();
  if (!value) return { lemma: '', gloss: '' };
  const splitAt = value.indexOf('=');
  if (splitAt < 0) return { lemma: value.split(',')[0].trim(), gloss: '' };
  return {
    lemma: value.slice(0, splitAt).split(',')[0].trim(),
    gloss: value.slice(splitAt + 1).trim(),
  };
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en'));
}

function numericStrongSort(a, b) {
  return Number(a.replace(/^G/u, '')) - Number(b.replace(/^G/u, ''));
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function parseTagntLuke(content) {
  const tokenById = new Map();
  const duplicates = [];
  let excludedNonSblRows = 0;
  let malformedLukeRows = 0;

  for (const rawLine of content.split(/\r?\n/u)) {
    if (!rawLine.startsWith('Luk.')) continue;
    const fields = rawLine.split('\t');
    const refMatch = fields[0]?.match(/^Luk\.(\d+)\.(\d+)#(\d+)/u);
    if (!refMatch || fields.length < 6) {
      malformedLukeRows += 1;
      continue;
    }

    const editions = String(fields[5] || '');
    if (!editions.includes('SBL')) {
      excludedNonSblRows += 1;
      continue;
    }

    const chapter = Number(refMatch[1]);
    const verse = Number(refMatch[2]);
    const position = Number(refMatch[3]);
    const tokenId = `Luke.${chapter}.${verse}.${position}`;
    const { word, transliteration } = parseWordTransliteration(fields[1]);
    const strong = normalizeStrong(fields[3]);
    const morph = String(fields[3] || '').includes('=')
      ? String(fields[3]).slice(String(fields[3]).indexOf('=') + 1).trim()
      : '';
    const { lemma, gloss } = parseLemmaGloss(fields[4]);

    const token = {
      tokenId,
      chapter,
      verse,
      position,
      ref: `Luke ${chapter}:${verse}`,
      word,
      transliteration,
      strong,
      morph,
      lemma: lemma.normalize('NFC'),
      gloss,
      editions,
    };

    if (tokenById.has(tokenId)) {
      duplicates.push({ tokenId, kept: tokenById.get(tokenId), discarded: token });
      continue;
    }
    tokenById.set(tokenId, token);
  }

  const tokens = [...tokenById.values()].sort(
    (a, b) => a.chapter - b.chapter || a.verse - b.verse || a.position - b.position,
  );
  return { tokens, duplicates, excludedNonSblRows, malformedLukeRows };
}

function parseMorphgntLuke(content) {
  const tokens = [];
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = line.split(/\s+/u);
    if (fields.length < 7 || !/^\d{6}$/u.test(fields[0])) continue;
    const ref = fields[0];
    tokens.push({
      chapter: Number(ref.slice(2, 4)),
      verse: Number(ref.slice(4, 6)),
      pos: fields[1],
      parsing: fields[2],
      text: fields[3],
      word: fields[4],
      normalized: fields[5],
      lemma: fields.slice(6).join(' ').normalize('NFC'),
    });
  }
  return tokens;
}

function buildInventory(tagntResult, morphTokens, sourceLock, sourceDigests) {
  const { tokens, duplicates, excludedNonSblRows, malformedLukeRows } = tagntResult;
  const verseKeys = new Set(tokens.map((token) => `${token.chapter}:${token.verse}`));
  const morphVerseKeys = new Set(morphTokens.map((token) => `${token.chapter}:${token.verse}`));
  const chapters = new Map();
  const strongMap = new Map();
  const missingStrong = [];
  const missingLemma = [];

  for (const token of tokens) {
    if (!chapters.has(token.chapter)) {
      chapters.set(token.chapter, {
        chapter: token.chapter,
        tokenCount: 0,
        verses: new Set(),
        strongs: new Set(),
        lemmas: new Set(),
      });
    }
    const chapter = chapters.get(token.chapter);
    chapter.tokenCount += 1;
    chapter.verses.add(token.verse);
    if (token.strong) chapter.strongs.add(token.strong);
    if (token.lemma) chapter.lemmas.add(normalizeLemma(token.lemma));

    if (!token.strong) {
      missingStrong.push(token.tokenId);
      continue;
    }
    if (!token.lemma) missingLemma.push(token.tokenId);

    if (!strongMap.has(token.strong)) {
      strongMap.set(token.strong, {
        strong: token.strong,
        tokenCount: 0,
        chapters: new Set(),
        verses: new Set(),
        lemmas: new Set(),
        transliterations: new Set(),
        glosses: new Set(),
        morphologies: new Set(),
        firstRef: token.ref,
        firstTokenId: token.tokenId,
      });
    }
    const entry = strongMap.get(token.strong);
    entry.tokenCount += 1;
    entry.chapters.add(token.chapter);
    entry.verses.add(`${token.chapter}:${token.verse}`);
    if (token.lemma) entry.lemmas.add(token.lemma.normalize('NFC'));
    if (token.transliteration) entry.transliterations.add(token.transliteration);
    if (token.gloss) entry.glosses.add(token.gloss);
    if (token.morph) entry.morphologies.add(token.morph);
  }

  const koreanByNormalizedStrong = new Map(
    Object.entries(KOREAN_GLOSS_ACTIVE)
      .map(([strong, entry]) => [normalizeStrong(strong), entry])
      .filter(([strong]) => Boolean(strong)),
  );
  const strongs = [...strongMap.values()]
    .map((entry) => {
      const korean = koreanByNormalizedStrong.get(entry.strong) || null;
      return {
        strong: entry.strong,
        tokenCount: entry.tokenCount,
        verseCount: entry.verses.size,
        chapterCount: entry.chapters.size,
        chapters: [...entry.chapters].sort((a, b) => a - b),
        lemmas: sortedUnique([...entry.lemmas]),
        transliterations: sortedUnique([...entry.transliterations]).slice(0, 8),
        glosses: sortedUnique([...entry.glosses]).slice(0, 12),
        morphologies: sortedUnique([...entry.morphologies]),
        firstRef: entry.firstRef,
        firstTokenId: entry.firstTokenId,
        existingKorean: Boolean(korean),
        existingKoreanGloss: korean
          ? {
              glossKo: korean.glossKo || '',
              translitKo: korean.translitKo || '',
              status: korean.status || 'baseline',
            }
          : null,
      };
    })
    .sort((a, b) => numericStrongSort(a.strong, b.strong));

  const existingStrongEntries = strongs.filter((entry) => entry.existingKorean);
  const newStrongEntries = strongs.filter((entry) => !entry.existingKorean);
  const coveredTokens = existingStrongEntries.reduce((sum, entry) => sum + entry.tokenCount, 0);
  const tagntLemmaSet = new Set(tokens.map((token) => normalizeLemma(token.lemma)).filter(Boolean));
  const morphLemmaSet = new Set(morphTokens.map((token) => normalizeLemma(token.lemma)).filter(Boolean));
  const onlyTagntLemmas = [...tagntLemmaSet].filter((lemma) => !morphLemmaSet.has(lemma)).sort();
  const onlyMorphgntLemmas = [...morphLemmaSet].filter((lemma) => !tagntLemmaSet.has(lemma)).sort();

  const chapterStats = [...chapters.values()]
    .map((chapter) => ({
      chapter: chapter.chapter,
      verseCount: chapter.verses.size,
      tokenCount: chapter.tokenCount,
      uniqueStrongCount: chapter.strongs.size,
      uniqueLemmaCount: chapter.lemmas.size,
    }))
    .sort((a, b) => a.chapter - b.chapter);

  const newTranslationQueue = newStrongEntries
    .map((entry) => ({
      strong: entry.strong,
      tokenCount: entry.tokenCount,
      verseCount: entry.verseCount,
      chapterCount: entry.chapterCount,
      lemmas: entry.lemmas,
      transliterations: entry.transliterations,
      glosses: entry.glosses,
      firstRef: entry.firstRef,
      priority: entry.tokenCount >= 50 ? 'high' : entry.tokenCount >= 10 ? 'medium' : 'low',
      status: 'new-translation-required',
    }))
    .sort((a, b) => b.tokenCount - a.tokenCount || numericStrongSort(a.strong, b.strong));

  const summary = {
    chapters: chapterStats.length,
    verses: verseKeys.size,
    tagntSblTokenCount: tokens.length,
    tagntUniqueStrongCount: strongs.length,
    tagntUniqueLemmaCount: tagntLemmaSet.size,
    morphgntTokenCount: morphTokens.length,
    morphgntVerseCount: morphVerseKeys.size,
    morphgntUniqueLemmaCount: morphLemmaSet.size,
    tokenCountDeltaTagntMinusMorphgnt: tokens.length - morphTokens.length,
    lemmaOnlyTagntCount: onlyTagntLemmas.length,
    lemmaOnlyMorphgntCount: onlyMorphgntLemmas.length,
    existingKoreanStrongCount: existingStrongEntries.length,
    newTranslationStrongCount: newStrongEntries.length,
    strongReuseRatePercent: round((existingStrongEntries.length / strongs.length) * 100),
    existingKoreanTokenCoverageCount: coveredTokens,
    existingKoreanTokenCoveragePercent: round((coveredTokens / tokens.length) * 100),
  };

  return {
    schemaVersion: 1,
    book: 'Luke',
    testament: 'NT',
    stage: 'G0',
    generatedDate: sourceLock.generatedDate,
    policy: {
      tagntSelection: 'Rows whose editions field includes SBL; one deterministic token per Luke.chapter.verse.position.',
      morphgntRole: 'Independent token and lemma cross-check only; no Strong mapping inferred from MorphGNT.',
      koreanReuse: 'Exact normalized Greek Strong match against KOREAN_GLOSS_ACTIVE.',
      productionWriteAllowed: false,
      providerCallsAllowed: false,
    },
    sources: {
      tagnt: { ...sourceLock.sources.tagnt, sha256: sourceDigests.tagnt },
      morphgnt: { ...sourceLock.sources.morphgnt, sha256: sourceDigests.morphgnt },
      koreanGloss: sourceLock.sources.koreanGloss,
    },
    summary,
    chapterStats,
    strongs,
    newTranslationQueue,
    crossCheck: { onlyTagntLemmas, onlyMorphgntLemmas },
    diagnostics: {
      duplicateTokenIds: duplicates.map((item) => item.tokenId),
      duplicateTokenCount: duplicates.length,
      excludedNonSblRows,
      malformedLukeRows,
      missingStrongTokenIds: missingStrong,
      missingLemmaTokenIds: missingLemma,
    },
  };
}

function buildReport(inventory) {
  const { summary, diagnostics, newTranslationQueue } = inventory;
  const queueCounts = newTranslationQueue.reduce(
    (acc, item) => {
      acc[item.priority] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );
  return {
    schemaVersion: 1,
    book: inventory.book,
    stage: inventory.stage,
    generatedDate: inventory.generatedDate,
    pass:
      summary.chapters === 24
      && summary.verses === 1151
      && diagnostics.missingStrongTokenIds.length === 0
      && diagnostics.duplicateTokenCount === 0,
    summary,
    queueCounts,
    diagnostics: {
      duplicateTokenCount: diagnostics.duplicateTokenCount,
      excludedNonSblRows: diagnostics.excludedNonSblRows,
      malformedLukeRows: diagnostics.malformedLukeRows,
      missingStrongCount: diagnostics.missingStrongTokenIds.length,
      missingLemmaCount: diagnostics.missingLemmaTokenIds.length,
    },
    nextGate: 'G1 payload schema, deterministic batch manifest, risk/audit contract, and verifier.',
  };
}

function buildMarkdown(inventory, report) {
  const s = inventory.summary;
  const rows = inventory.chapterStats
    .map((row) => `| ${row.chapter} | ${row.verseCount} | ${row.tokenCount} | ${row.uniqueStrongCount} | ${row.uniqueLemmaCount} |`)
    .join('\n');
  const topNew = inventory.newTranslationQueue
    .slice(0, 20)
    .map((item) => `| ${item.strong} | ${item.lemmas.join(', ')} | ${item.tokenCount} | ${item.chapterCount} | ${item.priority} |`)
    .join('\n');

  return `# 누가복음 G0 · 헬라어 Strong 전수 인벤토리

## 판정

- 상태: **${report.pass ? 'PASS' : 'FAIL'}**
- 범위: 누가복음 24장 전체
- 실제 NVIDIA·OpenAI 호출: **0건**
- 서비스 사전 쓰기: **없음**
- 다음 단계: **G1 데이터 계약·배치 manifest·결정적 verifier**

## 실측 기준선

| 항목 | 값 |
|---|---:|
| 장 | ${s.chapters} |
| 절 | ${s.verses} |
| TAGNT SBL 토큰 | ${s.tagntSblTokenCount} |
| 고유 Strong | ${s.tagntUniqueStrongCount} |
| TAGNT 고유 lemma | ${s.tagntUniqueLemmaCount} |
| MorphGNT 토큰 | ${s.morphgntTokenCount} |
| MorphGNT 고유 lemma | ${s.morphgntUniqueLemmaCount} |
| 기존 한글 Strong 재사용 | ${s.existingKoreanStrongCount} |
| 신규 번역 필요 Strong | ${s.newTranslationStrongCount} |
| 고유 Strong 재사용률 | ${s.strongReuseRatePercent}% |
| 본문 토큰 자동 커버율 | ${s.existingKoreanTokenCoveragePercent}% |

## 원천과 권리

- 주 원천: STEPBible TAGNT Mat–Jhn, CC BY 4.0. SBL 포함 행만 선택합니다.
- 독립 대조: MorphGNT SBLGNT morphology/lemmatization, CC BY-SA 3.0. SBLGNT 본문 이용 조건은 원 저장소 고지를 따릅니다.
- 원천 대용량 파일은 재배포하지 않고, 고정 blob SHA에서 CI가 내려받아 집계 산출물만 저장합니다.
- 기존 한글 사전은 \`KOREAN_GLOSS_ACTIVE\`의 정규화된 Greek Strong 키로 재사용 여부만 판정합니다.

## 장별 분포

| 장 | 절 | 토큰 | 고유 Strong | 고유 lemma |
|---:|---:|---:|---:|---:|
${rows}

## 신규 번역 우선순위 상위 20

| Strong | lemma | 토큰 | 출현 장 | 우선순위 |
|---|---|---:|---:|---|
${topNew}

## 안전 경계

- 기존 원어·성경 본문·사용자 저장 데이터는 변경하지 않습니다.
- G0는 모집단과 재사용/신규 범위만 확정합니다.
- 번역 후보 생성, 신학 감사, 사람 승인, 팝업 통합은 G1 이후 별도 Gate에서 진행합니다.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  ensure(args.tagnt, '--tagnt <path> is required');
  ensure(args.morphgnt, '--morphgnt <path> is required');

  const lockPath = path.resolve(args.lock || DEFAULT_LOCK);
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  const reportPath = path.resolve(args.report || DEFAULT_REPORT);
  const docPath = path.resolve(args.doc || DEFAULT_DOC);

  const [tagntContent, morphgntContent, lockContent] = await Promise.all([
    fs.readFile(path.resolve(args.tagnt), 'utf8'),
    fs.readFile(path.resolve(args.morphgnt), 'utf8'),
    fs.readFile(lockPath, 'utf8'),
  ]);
  const sourceLock = JSON.parse(lockContent);
  const tagntResult = parseTagntLuke(tagntContent);
  const morphTokens = parseMorphgntLuke(morphgntContent);
  const inventory = buildInventory(
    tagntResult,
    morphTokens,
    sourceLock,
    { tagnt: sha256(tagntContent), morphgnt: sha256(morphgntContent) },
  );
  const report = buildReport(inventory);
  const markdown = buildMarkdown(inventory, report);

  await Promise.all([
    fs.mkdir(path.dirname(outPath), { recursive: true }),
    fs.mkdir(path.dirname(reportPath), { recursive: true }),
    fs.mkdir(path.dirname(docPath), { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(outPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8'),
    fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    fs.writeFile(docPath, markdown, 'utf8'),
  ]);

  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
