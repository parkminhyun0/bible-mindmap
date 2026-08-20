// final.json → src/data/koreanGlossTopBatch02.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T6 = path.join(ROOT, '.pipeline/task6');

const final = JSON.parse(fs.readFileSync(path.join(T6, 'final.json'), 'utf8'));
const consensus = JSON.parse(fs.readFileSync(path.join(T6, 'consensus.json'), 'utf8'));

const byStrong = new Map(final.entries.map((e) => [e.strong, e]));
const ruleChanges = new Map();
for (const c of final.changes) {
  if (!ruleChanges.has(c.strong)) ruleChanges.set(c.strong, new Set());
  ruleChanges.get(c.strong).add(c.rule);
}

const RULE_NOTE = {
  begadkepat: '베가드케파트 연음은 기존 배치(ṭôb·ʿereb)를 따라 구분 기호 없이 적었다.',
  gemination: '다게쉬 포르테는 기존 배치(아타·카포레트)를 따라 받침으로 겹쳐 적지 않았다.',
  final_shin: '음절 말 שׁ 는 기존 배치(에쉬·데바쉬·쇼레쉬)를 따라 쉬로 적었다.',
};
const AGREE_NOTE = '두 모델 계열(Gemini·Claude)이 독립으로 만든 음역안이 일치했다.';

// 입력 순서(빈도 내림차순) 유지 + 권위 사전에서 glossKo(영문 Strong 정의) 기계 복사
const order = [];
const meta = new Map();
for (const s of ['A', 'B', 'C', 'D', 'E']) {
  const shard = JSON.parse(fs.readFileSync(path.join(T6, `input/shard-${s}.json`), 'utf8'));
  for (const it of shard.items) {
    order.push(it.strong);
    meta.set(it.strong, it);
  }
}

const missing = order.filter((s) => !byStrong.has(s));
if (missing.length) {
  console.error('결정되지 않은 항목:', missing.length, missing.slice(0, 20));
  process.exit(1);
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const hebrew = order.filter((s) => s[0] === 'H').length;
const greek = order.length - hebrew;

const lines = [];
lines.push(`// 66권 빈도 상위 Strong 한글 음역 확장 · batch 02
//
// 범위: 성경 66권 전체 본문 빈도 상위 300개 중 batch 01 이후에도 사전에 없던
//       ${order.length}개. 히브리어 ${hebrew}개 · 헬라어 ${greek}개, 빈도 ${meta.get(order[0]).count}회~${meta.get(order.at(-1)).count}회.
//
// 표기 원칙: docs/transliteration-approval-gate.md 초안을 따른다. 학술(SBL)
//       표기를 표제로 삼고, 한국어 성경 관용 표기가 다른 낱말은 그 차이가 생긴
//       이유를 note 에 적어 함께 보여 준다.
//
// 방법: ${order.length}개를 다섯 묶음으로 나눠 각 묶음을 서로 다른 두 모델 계열
//       (Gemini 3.1 Pro / 3.7 Flash · Claude Opus 5 / Opus 4.6 / Sonnet 4.6)이
//       상대 산출물을 보지 못한 채 독립으로 음역했다. 두 안이 일치한 ${consensus.agreed.length}개는
//       그대로 두고, 갈린 ${consensus.disputed.length}개는 세 모델이 독립 판정했다.
//
// 표기가 갈린 자리는 낱말마다 따로 정하지 않고 규칙으로 정했다. 규칙은 표결이
// 아니라 **이미 배포된 데이터의 선례**를 기준으로 삼았고, ${final.changes.length}개 항목을
// 그 규칙에 맞춰 기계적으로 교정했다.
//   · 베가드케파트 연음: 구분 기호를 쓰지 않는다 (선례 ṭôb · ʿereb · bōqer)
//   · 다게쉬 포르테: 받침으로 겹쳐 적지 않는다 (선례 아타 · 카포레트 · 탈라사)
//   · 음절 말 שׁ: 쉬로 적는다 (선례 에쉬 · 데바쉬 · 쇼레쉬 · 이쉬)
//   · 자음 ו: w 로 보고 와/웨/위/워로 적는다 (판정 3/3 합의)
//   · ע + 홀렘 바브: 아원으로 적는다 (판정 3/3 합의)
//
// glossKo: 이 배치는 음역 전용이다. 뜻은 생성하지 않았고 public/data/strongs-def
//       (Strong 원 정의)의 영문 뜻을 기계적으로 옮겨 담았다. 한글 뜻은 권위 사전
//       게이트에서 따로 다룬다.
//
// review: 전 항목 true. 박 목사님 확인 전까지 자동승인 대상이 아니다.
//
// 기존 파일은 수정하지 않는다. 통합은 koreanGlossActive.js 에서 한다.

export const KOREAN_GLOSS_TOP_BATCH_02 = {`);

for (const strong of order) {
  const e = byStrong.get(strong);
  const m = meta.get(strong);
  const glossKo = (m.glossEn || m.defEn || '').trim();

  const parts = [];
  const base = String(e.note || '').trim();
  if (base) parts.push(base);
  else if (e.origin === 'agreed') parts.push(AGREE_NOTE);
  for (const rule of ruleChanges.get(strong) || []) {
    if (RULE_NOTE[rule]) parts.push(RULE_NOTE[rule]);
  }
  const note = parts.join(' ');

  lines.push(`  ${strong}: {`);
  lines.push(`    lemma: '${esc(e.lemma || m.lemma)}',`);
  lines.push(`    translit: '${esc(e.translit)}',`);
  lines.push(`    translitKo: '${esc(e.translitKo)}',`);
  lines.push(`    glossKo: '${esc(glossKo)}',`);
  lines.push(`    note: '${esc(note)}',`);
  lines.push('    review: true,');
  lines.push('  },');
}

lines.push('};');
lines.push('');
lines.push(`export const KOREAN_GLOSS_TOP_BATCH_02_META = {
  batchId: 'top-frequency-batch-02',
  status: 'candidate',
  entryCount: ${order.length},
  reviewedCount: ${order.length},
  pendingCount: 0,
  scope: '66권 전체 빈도 상위 300개 중 batch 01 이후 남은 미수록 항목',
  agreedCount: ${consensus.agreed.length},
  adjudicatedCount: ${consensus.disputed.length},
  ruleAdjustedCount: ${final.changes.length},
};`);
lines.push('');

fs.writeFileSync(path.join(ROOT, 'src/data/koreanGlossTopBatch02.js'), lines.join('\n'));
console.log('wrote src/data/koreanGlossTopBatch02.js ·', order.length, 'entries');
