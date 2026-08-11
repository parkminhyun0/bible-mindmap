import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHADOW_EVALUATION_CASES } from '../shadow/nvidia-shadow-evaluation-fixture.mjs';

export const KOREAN_QUERY_CANDIDATE_SCHEMA_VERSION = 1;
export const KOREAN_QUERY_STYLES = Object.freeze(['question', 'pastoral', 'short-search']);

const STYLE_BUILDERS = Object.freeze({
  question: (query) => `${query}에 해당하는 성경의 흐름은 무엇인가요?`,
  pastoral: (query) => `${query}을 설교와 성경 연구 관점에서 찾아줘`,
  'short-search': (query) => query
    .replace(/정경적|정경|흐름|발전|장면|구원|계시/g, '')
    .replace(/\s+/g, ' ')
    .trim(),
});

function normalizeQuery(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[?？!！.,，。]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function generateKoreanEvaluationCandidates({
  cases = SHADOW_EVALUATION_CASES,
  styles = KOREAN_QUERY_STYLES,
} = {}) {
  if (!Array.isArray(cases) || cases.length === 0) throw new TypeError('cases must be a non-empty array');
  if (!Array.isArray(styles) || styles.length === 0) throw new TypeError('styles must be a non-empty array');

  const seen = new Set(cases.map((item) => normalizeQuery(item.query)));
  const candidates = [];

  for (const item of cases) {
    for (const style of styles) {
      const builder = STYLE_BUILDERS[style];
      if (!builder) throw new Error(`unsupported Korean query style: ${style}`);
      const query = builder(item.query);
      const normalized = normalizeQuery(query);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      candidates.push(Object.freeze({
        id: `${item.id}.${style}`,
        sourceCaseId: item.id,
        query,
        normalizedQuery: normalized,
        style,
        queryType: item.metadata?.queryType || 'unknown',
        proposedRelevantIds: Object.freeze([...item.relevantIds]),
        proposedHardNegativeIds: Object.freeze([...item.hardNegativeIds]),
        labelStatus: 'proposed',
        reviewStatus: 'pending-human-review',
        autoApproved: false,
        source: 'deterministic-korean-style-expansion',
      }));
    }
  }

  return Object.freeze({
    schemaVersion: KOREAN_QUERY_CANDIDATE_SCHEMA_VERSION,
    sourceCaseCount: cases.length,
    candidateCount: candidates.length,
    styles: Object.freeze([...styles]),
    requiresHumanApproval: true,
    writesEvaluationFixture: false,
    productionSearchConnected: false,
    candidates: Object.freeze(candidates),
  });
}

export function writeKoreanEvaluationCandidates(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'korean-query-candidates.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
  const lines = [
    '# 한국어 사용자형 평가 질의 후보',
    '',
    `- 원본 평가 질의: ${result.sourceCaseCount}개`,
    `- 생성 후보: ${result.candidateCount}개`,
    '- 상태: 사람 검토 전 후보',
    '- 공개 검색 연결: 없음',
    '',
    '| 후보 ID | 문체 | 유형 | 질의 | 제안 정답 라벨 |',
    '|---|---|---|---|---|',
    ...result.candidates.map((item) => `| ${item.id} | ${item.style} | ${item.queryType} | ${item.query.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')} | ${item.proposedRelevantIds.join(', ')} |`),
    '',
    '> 정답 라벨은 자동 확정하지 않는다. 중복·자연스러움·신학적 적합성·hard-negative를 사람이 검토한 뒤 별도 승인한다.',
    '',
  ];
  fs.writeFileSync(path.join(outputDir, 'korean-query-candidates.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const result = generateKoreanEvaluationCandidates();
  const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));
  if (outputArg) writeKoreanEvaluationCandidates(result, path.resolve(outputArg.slice('--output-dir='.length)));
  else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ Korean evaluation query candidate generation failed: ${error.message}`);
    process.exit(1);
  });
}
