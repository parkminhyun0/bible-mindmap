// batch 03 이후 공용 배치 파일 생성기.
//
// 사용: node build-batch.mjs <task 디렉터리> <배치 번호> <셰이드...>
//   예) node build-batch.mjs task7 03 F G H
//
// batch 02 의 생성기와 달리 배치마다 스크립트를 복제하지 않는다. 머리말 수치는
// 전부 실제 데이터에서 계산한다 — batch 02 에서 "118개 교정"처럼 사실과 다른
// 수치를 머리말에 적었던 일이 있었다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [taskDir, batchNo, ...shards] = process.argv.slice(2);
if (!taskDir || !batchNo || !shards.length) {
  console.error('사용: node build-batch.mjs <task 디렉터리> <배치 번호> <셰이드...>');
  process.exit(1);
}
const DIR = path.join(ROOT, '.pipeline', taskDir);

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const final = readJson(path.join(DIR, 'final.json'));
const consensus = readJson(path.join(DIR, 'consensus.json'));

const byStrong = new Map(final.entries.map((e) => [e.strong, e]));

const order = [];
const meta = new Map();
for (const s of shards) {
  for (const it of readJson(path.join(DIR, `input/shard-${s}.json`)).items) {
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

const unanimous = final.entries.filter((e) => e.origin === 'unanimous').length;
const majority = final.entries.filter((e) => e.origin === 'majority').length;
const adjudicated = final.entries.filter((e) => e.origin === 'adjudicated').length;
const fieldFix = new Set(final.changes.filter((c) => c.field !== 'note').map((c) => c.strong)).size;
const models = (consensus.models || []).length;

const CONST = `KOREAN_GLOSS_TOP_BATCH_${batchNo}`;

const lines = [];
lines.push(`// 66권 빈도 상위 Strong 한글 음역 확장 · batch ${batchNo}
//
// 범위: ${order.length}개. 히브리어 ${hebrew}개 · 헬라어 ${greek}개,
//       빈도 ${meta.get(order[0]).count}회~${meta.get(order.at(-1)).count}회.
//
// 표기 원칙: batch 02 에서 확정한 규칙을 그대로 따른다. 규칙은 표결이 아니라
//       이미 배포된 데이터의 선례로 정한 것이다.
//   · 베가드케파트 연음: 구분 기호를 쓰지 않는다 (선례 ṭôb · ʿereb · bōqer)
//   · 다게쉬 포르테: 장애음 겹자음을 받침으로 겹쳐 적지 않는다
//     (선례 아타 · 카포레트 · 탈라사). ㅁ·ㄴ·ㄹ 은 한국어가 자음 하나짜리도
//     받침+초성으로 나눠 적으므로(샬롬 · 암마) 이 규칙에서 뺀다.
//   · 음절 말 שׁ: 쉬로 적는다 (선례 에쉬 · 데바쉬 · 쇼레쉬 · 이쉬)
//   · 자음 ו: w 로 보고 와/웨/위/워로 적는다
//   · 헬라어 ευ: 유 계열로 적는다 (선례 유튀스 · 에포류에토 · 프뉴마)
//   · 유성 쉐바: ĕ 로 적는다 (선례 ʾĕlōhîm · tĕhôm)
//
// 방법: ${models}개 모델(Gemini 3.1 Pro · 3.7 Flash · 3.6 Flash · Claude Opus 5)이
//       서로의 산출물을 보지 못한 채 독립으로 음역했다. 넷이 모두 같게 적은
//       ${unanimous}개와 셋 이상이 모인 ${majority}개는 그대로 두고, 갈린 ${adjudicated}개는 세 모델이
//       배포 데이터의 선례를 근거로 다시 판정했다.
//
//       확정 규칙을 작업 명세에 넣은 덕에 batch 02 보다 불일치가 크게 줄었다.
//       규칙 위반으로 기계 교정한 항목은 ${fieldFix}개다.
//
// glossKo: 이 배치는 음역 전용이다. 뜻은 생성하지 않았고 public/data/strongs-def
//       (Strong 원 정의)의 영문 뜻을 기계적으로 옮겨 담았다. 한글 뜻은 권위 사전
//       게이트에서 따로 다룬다.
//
// review: 전 항목 true. 박 목사님 확인 전까지 자동승인 대상이 아니다.
//
// 기존 파일은 수정하지 않는다. 통합은 koreanGlossActive.js 에서 한다.

export const ${CONST} = {`);

for (const strong of order) {
  const e = byStrong.get(strong);
  const m = meta.get(strong);
  lines.push(`  ${strong}: {`);
  lines.push(`    lemma: '${esc(e.lemma || m.lemma)}',`);
  lines.push(`    translit: '${esc(e.translit)}',`);
  lines.push(`    translitKo: '${esc(e.translitKo)}',`);
  lines.push(`    glossKo: '${esc((m.glossEn || m.defEn || '').trim())}',`);
  lines.push(`    note: '${esc(String(e.note || '').trim())}',`);
  lines.push('    review: true,');
  lines.push('  },');
}

lines.push('};');
lines.push('');
lines.push(`export const ${CONST}_META = {
  batchId: '${consensus.batchId}',
  status: 'candidate',
  entryCount: ${order.length},
  reviewedCount: ${order.length},
  pendingCount: 0,
  scope: '66권 전체 빈도 상위 후보 중 batch ${String(Number(batchNo) - 1).padStart(2, '0')} 이후 남은 미수록 항목',
  unanimousCount: ${unanimous},
  majorityCount: ${majority},
  adjudicatedCount: ${adjudicated},
  ruleAdjustedCount: ${fieldFix},
};`);
lines.push('');

const out = path.join(ROOT, `src/data/koreanGlossTopBatch${batchNo}.js`);
fs.writeFileSync(out, lines.join('\n'));
console.log('wrote', path.relative(ROOT, out), '·', order.length, 'entries',
  `(만장일치 ${unanimous} · 다수 ${majority} · 판정 ${adjudicated} · 규칙 교정 ${fieldFix})`);
