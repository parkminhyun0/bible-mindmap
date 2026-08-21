#!/usr/bin/env node
// 한글 음역 표기 규칙을 **모든 배치에 대해** 강제한다.
//
// 왜 필요한가: 규칙은 batch 02 에서 배포 데이터의 선례를 근거로 확정했지만,
// 지금까지는 생성 도구가 지킬 뿐 CI 가 막지는 못했다. 도구를 안 쓰거나 손으로
// 고치면 규칙이 깨진 채로 들어온다. 실제로 batch 03 감사에서 ευ 표기 어긋남
// 5건, 어말 카마츠+헤 13건이 그렇게 들어와 있었다.
//
// 이 검증기는 데이터를 고치지 않는다. 어긋나면 실패시킨다.
import { KOREAN_GLOSS_BATCHES } from '../src/data/koreanGlossActive.js';

const errors = [];
const note = (batch, strong, msg) => errors.push(`${batch} ${strong}: ${msg}`);

// --- 한글 음절 분해 -----------------------------------------------------
const BASE = 0xac00;
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const OBSTRUENT = new Set(['ㄱ', 'ㄲ', 'ㅋ', 'ㄷ', 'ㄸ', 'ㅌ', 'ㅂ', 'ㅃ', 'ㅍ', 'ㅅ', 'ㅆ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅎ']);
// 겹자음으로 보는 받침. ㅁ·ㄴ·ㄹ 은 한국어가 자음 하나짜리도 받침+초성으로
// 나눠 적으므로(샬롬 · 암마) 제외한다.
const DOUBLE = new Map([
  ['ㅅ', OBSTRUENT], ['ㅆ', OBSTRUENT],
  ['ㅂ', new Set(['ㅂ', 'ㅃ', 'ㅍ'])],
  ['ㄱ', new Set(['ㄱ', 'ㄲ', 'ㅋ'])],
  ['ㄷ', new Set(['ㄷ', 'ㄸ', 'ㅌ'])],
]);
const decompose = (ch) => {
  const c = ch.codePointAt(0) - BASE;
  if (c < 0 || c > 11171) return null;
  return { cho: CHO[Math.floor(c / 588)], jungIdx: Math.floor((c % 588) / 28), jong: JONG[c % 28] };
};

for (const { entries, meta } of KOREAN_GLOSS_BATCHES) {
  const batchId = meta?.batchId || 'unknown';
  // 창세기 배치는 본문을 직접 검토해 만든 것으로, 확정 규칙 이전 산출물이다.
  // 표기를 뒤늦게 흔들지 않는다.
  if (!/^top-frequency-batch-/.test(batchId)) continue;
  // batch 01 은 TAHOT 에 학술 음역이 없어 translit 이 비어 있다. 규칙 대상 밖이다.
  const checkLatin = batchId !== 'top-frequency-batch-01';

  for (const [strong, e] of Object.entries(entries)) {
    const lemma = String(e.lemma || '').normalize('NFC');
    const lat = String(e.translit || '').normalize('NFC');
    const ko = String(e.translitKo || '');

    // 1. 베가드케파트 연음 기호를 쓰지 않는다 (선례 ṭôb · ʿereb · bōqer)
    if (checkLatin && /[ḇḡḏḵṯ]/.test(lat)) note(batchId, strong, `연음 기호가 남아 있다: ${lat}`);
    if (checkLatin && /[bpBP]̄/.test(lat.normalize('NFD'))) note(batchId, strong, `자음 위 장음선이 남아 있다: ${lat}`);

    // 2. 유성 쉐바는 ĕ (선례 ʾĕlōhîm · tĕhôm)
    if (checkLatin && lat.includes('ə')) note(batchId, strong, `유성 쉐바를 ə 로 적었다: ${lat}`);

    // 3. 어말 카마츠+헤 는 -â. 마피크 붙은 הּ 는 자음이므로 -āh 가 맞다.
    if (checkLatin && /āh$/.test(lat) && !/הּ\s*$/.test(lemma)) {
      note(batchId, strong, `어말 카마츠+헤는 -â 로 적는다: ${lat}`);
    }

    // 4. 헬라어 ευ 는 유 계열 (선례 유튀스 · 프로슈코메노스 · 유앙겔리온)
    if (/ε[υύὐὑῦὺ]/.test(lemma) && /에우|[가-힣]에\s*우/.test(ko)) {
      note(batchId, strong, `ευ 는 유 계열로 적는다: ${ko}`);
    }

    // 5. 어두 ῥ 는 ㄹ (선례 라브도스 · 리자)
    if (/^ῥ/.test(lemma) && /^흐/.test(ko)) note(batchId, strong, `어두 ῥ 에 기식을 살렸다: ${ko}`);

    // 6. 장애음 겹자음을 받침으로 겹쳐 적지 않는다 (선례 아타 · 카포레트 · 탈라사)
    const chars = [...ko];
    for (let i = 0; i < chars.length - 1; i += 1) {
      const cur = decompose(chars[i]);
      const nxt = decompose(chars[i + 1]);
      if (!cur || !nxt || !cur.jong) continue;
      const allowed = DOUBLE.get(cur.jong);
      if (allowed && allowed.has(nxt.cho)) {
        note(batchId, strong, `겹자음을 받침으로 살렸다: ${ko}`);
        break;
      }
    }

    // 7. note 가 실제 표기와 어긋나는 말을 하면 안 된다.
    //    팝업은 표기 바로 아래 note 를 보여 준다. 둘이 다른 말을 하면 그 자체가 오류다.
    const n = String(e.note || '');
    if (checkLatin && /[ḇḡḏḵṯ]/.test(n)) note(batchId, strong, 'note 가 지운 연음 기호를 인용한다');
    if (checkLatin && n.includes('ə')) note(batchId, strong, 'note 가 통일한 쉐바 기호를 인용한다');
    for (const m of n.matchAll(/["“”'‘’]([가-힣]{2,})["“”'‘’]\s*(?:를|을)?\s*채택/g)) {
      if (m[1] !== ko) note(batchId, strong, `note 가 다른 표기를 채택했다고 한다: "${m[1]}" ↔ ${ko}`);
    }

    // 8. 승인 전까지 전 항목 review=true
    if (e.review !== true) note(batchId, strong, 'review 가 true 가 아니다 (박 목사님 확인 전 자동승인 금지)');
  }
}

// --- 같은 lemma 는 사전 안에서 같게 적는다 ------------------------------
const byLemma = new Map();
for (const { entries, meta } of KOREAN_GLOSS_BATCHES) {
  if (!/^top-frequency-batch-/.test(meta?.batchId || '')) continue;
  for (const [strong, e] of Object.entries(entries)) {
    const key = String(e.lemma || '').normalize('NFC');
    if (!key) continue;
    if (!byLemma.has(key)) byLemma.set(key, []);
    byLemma.get(key).push({ strong, ko: e.translitKo });
  }
}
for (const [lemma, rows] of byLemma) {
  const forms = new Set(rows.map((r) => r.ko));
  if (forms.size > 1) {
    errors.push(`같은 lemma ${lemma} 가 다르게 적혔다: ${rows.map((r) => `${r.strong}=${r.ko}`).join(' · ')}`);
  }
}

const total = KOREAN_GLOSS_BATCHES
  .filter((b) => /^top-frequency-batch-/.test(b.meta?.batchId || ''))
  .reduce((n, b) => n + Object.keys(b.entries).length, 0);

if (errors.length) {
  console.error(`✗ 음역 표기 규칙 위반 ${errors.length}건`);
  for (const e of errors.slice(0, 40)) console.error(`  ${e}`);
  if (errors.length > 40) console.error(`  … 외 ${errors.length - 40}건`);
  process.exit(1);
}
console.log(`✓ 음역 표기 규칙 검증 통과 · 빈도 배치 ${total}개 항목`);
