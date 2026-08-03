import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AI_CANDIDATE_PROVIDERS,
  AI_CANDIDATE_REQUIRED_FIELDS,
  AI_CANDIDATE_SCHEMA_VERSION,
  AI_CANDIDATE_STATUSES,
  AI_CANDIDATE_TYPES,
} from '../src/data/aiCandidateSchema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidateDir = path.resolve(__dirname, '../data/ai-candidates');
const errors = [];
const seenIds = new Set();

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isIsoDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

function fail(where, message) {
  errors.push(`${where}: ${message}`);
}

function validateCandidate(candidate, where) {
  if (!isObject(candidate)) {
    fail(where, '루트가 객체가 아님');
    return;
  }

  for (const field of AI_CANDIDATE_REQUIRED_FIELDS) {
    if (!(field in candidate)) fail(where, `필수 필드 누락 (${field})`);
  }

  if (typeof candidate.id !== 'string' || !/^[a-z0-9][a-z0-9._:-]{7,127}$/i.test(candidate.id)) {
    fail(where, 'id 형식 오류');
  } else if (seenIds.has(candidate.id)) {
    fail(where, `중복 id (${candidate.id})`);
  } else {
    seenIds.add(candidate.id);
  }

  if (candidate.schemaVersion !== AI_CANDIDATE_SCHEMA_VERSION) {
    fail(where, `schemaVersion 불일치 (${candidate.schemaVersion})`);
  }
  if (!AI_CANDIDATE_TYPES.includes(candidate.type)) fail(where, `허용되지 않은 type (${candidate.type})`);
  if (!AI_CANDIDATE_STATUSES.includes(candidate.status)) fail(where, `허용되지 않은 status (${candidate.status})`);
  if (!isObject(candidate.payload) || Object.keys(candidate.payload).length === 0) fail(where, 'payload가 비어 있음');

  const provenance = candidate.provenance;
  if (!isObject(provenance)) {
    fail(where, 'provenance 객체 누락');
  } else {
    if (!AI_CANDIDATE_PROVIDERS.includes(provenance.provider)) fail(where, `provider 오류 (${provenance.provider})`);
    if (typeof provenance.model !== 'string' || !provenance.model.trim()) fail(where, 'model 누락');
    if (typeof provenance.promptVersion !== 'string' || !provenance.promptVersion.trim()) fail(where, 'promptVersion 누락');
    if (!Array.isArray(provenance.sourceRefs) || provenance.sourceRefs.length === 0) fail(where, 'sourceRefs 최소 1개 필요');
    if (!isIsoDate(provenance.generatedAt)) fail(where, 'generatedAt ISO 날짜 오류');
  }

  const verification = candidate.verification;
  if (!isObject(verification)) {
    fail(where, 'verification 객체 누락');
  } else {
    if (typeof verification.passed !== 'boolean') fail(where, 'verification.passed는 boolean이어야 함');
    if (!Array.isArray(verification.checks)) fail(where, 'verification.checks는 배열이어야 함');
    if (!Array.isArray(verification.errors)) fail(where, 'verification.errors는 배열이어야 함');
    if (!Array.isArray(verification.warnings)) fail(where, 'verification.warnings는 배열이어야 함');
  }

  const review = candidate.review;
  if (!isObject(review)) fail(where, 'review 객체 누락');

  if (!isIsoDate(candidate.createdAt) || !isIsoDate(candidate.updatedAt)) fail(where, 'createdAt/updatedAt ISO 날짜 오류');

  if (candidate.status === 'verified' && verification?.passed !== true) {
    fail(where, 'verified 상태는 verification.passed=true 필요');
  }
  if (candidate.status === 'reviewed' && !review?.reviewedBy) {
    fail(where, 'reviewed 상태는 reviewedBy 필요');
  }
  if (candidate.status === 'approved') {
    if (verification?.passed !== true) fail(where, 'approved 상태는 verification.passed=true 필요');
    if (review?.decision !== 'approved' || !review?.reviewedBy || !isIsoDate(review?.reviewedAt)) {
      fail(where, 'approved 상태는 승인자·승인일·decision=approved 필요');
    }
  }
}

function selfTest() {
  const valid = {
    id: 'candidate:self-test-001',
    schemaVersion: AI_CANDIDATE_SCHEMA_VERSION,
    type: 'curated-chapter',
    status: 'candidate',
    payload: { bookId: 'Gen', chapter: 1 },
    provenance: {
      provider: 'nvidia-build',
      model: 'test-model',
      modelVersion: null,
      promptVersion: 'p0-2-test',
      sourceRefs: ['Gen:1'],
      generatedAt: new Date().toISOString(),
      requestId: null,
    },
    verification: { passed: false, verifierVersion: null, checkedAt: null, checks: [], errors: [], warnings: [] },
    review: { reviewedBy: null, reviewedAt: null, decision: null, notes: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  validateCandidate(valid, 'self-test.valid');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('✓ AI candidate schema self-test 통과');
}

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

if (!fs.existsSync(candidateDir)) {
  console.log('✓ AI candidate 디렉터리 없음 — 승인 전 후보 0건');
  process.exit(0);
}

const files = fs.readdirSync(candidateDir).filter((name) => name.endsWith('.json')).sort();
for (const file of files) {
  const full = path.join(candidateDir, file);
  try {
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    candidates.forEach((candidate, index) => validateCandidate(candidate, `${file}[${index}]`));
  } catch (error) {
    fail(file, `JSON 파싱 실패 (${error.message})`);
  }
}

if (errors.length) {
  console.error(`✗ AI candidate governance 검증 실패 (${errors.length}건)`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
console.log(`✓ AI candidate governance 통과 (${files.length}개 파일 · ${seenIds.size}개 후보)`);
