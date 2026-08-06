import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'src/data/transliterationPolicy.js');
const docsPath = path.join(root, 'docs/transliteration-approval-gate.md');
const issues = [];
const fail = (message) => issues.push(message);

if (!fs.existsSync(policyPath)) fail('transliterationPolicy.js가 없습니다.');
if (!fs.existsSync(docsPath)) fail('음역 승인 게이트 문서가 없습니다.');

let policy;
let canApplyTransliterationMigration;
if (fs.existsSync(policyPath)) {
  ({ TRANSLITERATION_POLICY: policy, canApplyTransliterationMigration } = await import(pathToFileURL(policyPath)));
}

if (policy) {
  if (policy.schemaVersion !== 1) fail('음역 정책 schemaVersion은 1이어야 합니다.');
  if (!['pending-pastor-approval', 'approved'].includes(policy.status)) {
    fail(`허용하지 않는 음역 정책 상태: ${policy.status}`);
  }
  if (!Array.isArray(policy.proposedMappings) || policy.proposedMappings.length < 5) {
    fail('히브리어·헬라어 핵심 자모/조합 제안이 충분하지 않습니다.');
  }

  const ids = new Set();
  for (const entry of policy.proposedMappings || []) {
    if (!entry.id || ids.has(entry.id)) fail(`중복 또는 빈 mapping id: ${entry.id || '(empty)'}`);
    ids.add(entry.id);
    if (!entry.language || !entry.source || !entry.sblSymbol || !entry.proposedKoreanRule) {
      fail(`mapping ${entry.id}: 언어·원문·SBL 기호·한글 제안 규칙이 모두 필요합니다.`);
    }
  }

  if (policy.status === 'pending-pastor-approval') {
    if (policy.migrationEnabled !== false) fail('박 목사님 승인 전 migrationEnabled는 false여야 합니다.');
    if (policy.approval?.approved !== false) fail('박 목사님 승인 전 approval.approved는 false여야 합니다.');
    if (policy.approval?.approvedBy || policy.approval?.approvedAt) {
      fail('승인 전 approvedBy/approvedAt을 미리 기록할 수 없습니다.');
    }
    if (policy.proposedMappings.some((entry) => entry.approved !== false)) {
      fail('승인 전 개별 자모 대응표 항목은 모두 approved=false여야 합니다.');
    }
    if (canApplyTransliterationMigration?.(policy) !== false) {
      fail('승인 대기 상태에서 데이터 이관 함수가 true를 반환했습니다.');
    }
  }

  if (policy.status === 'approved') {
    if (policy.migrationEnabled !== true
      || policy.approval?.approved !== true
      || !policy.approval?.approvedBy
      || !policy.approval?.approvedAt
      || policy.proposedMappings.some((entry) => entry.approved !== true)
      || canApplyTransliterationMigration?.(policy) !== true) {
      fail('approved 상태는 승인자·승인일·모든 mapping 승인·migrationEnabled=true를 모두 요구합니다.');
    }
  }
}

const canonicalFiles = fs.readdirSync(path.join(root, 'src/data'))
  .filter((name) => /^canonicalConcepts(?:T\d+)?\.js$/u.test(name));
const canonicalSource = canonicalFiles
  .map((name) => fs.readFileSync(path.join(root, 'src/data', name), 'utf8'))
  .join('\n');

// 이번 승인 게이트 PR은 기반만 추가하고 labelHe/labelGr 일괄 이관을 하지 않는다.
// 승인 이후 별도 PR이 정책 버전 표식을 추가할 때 이 검사는 그 변경과 함께 갱신한다.
if (policy?.status === 'pending-pastor-approval'
  && /transliterationPolicyVersion\s*:/u.test(canonicalSource)) {
  fail('승인 대기 상태에서 canonical 음역 이관 표식이 감지됐습니다. 데이터 변경을 되돌리세요.');
}

if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, 'utf8');
  for (const phrase of ['박 목사님 확인', '승인 전 데이터 변경 금지', 'labelHe', 'labelGr']) {
    if (!docs.includes(phrase)) fail(`승인 문서 필수 문구 누락: ${phrase}`);
  }
}

console.log(`음역 정책 verifier · status=${policy?.status || 'missing'} mappings=${policy?.proposedMappings?.length || 0} canonicalFiles=${canonicalFiles.length}`);
if (issues.length) {
  console.error('✗ 음역 정책 승인 게이트 실패');
  issues.forEach((issue) => console.error(`  - ${issue}`));
  process.exit(1);
}
console.log('✓ 음역 정책 승인 게이트 통과 — 박 목사님 확인 전 labelHe/labelGr 이관 비활성');
