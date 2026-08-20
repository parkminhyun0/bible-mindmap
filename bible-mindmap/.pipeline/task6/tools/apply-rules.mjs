// 확정 규칙을 합의안·판정안 전체(245개)에 기계적으로 적용해 final.json 을 만든다.
//
// 규칙은 표결이 아니라 **이미 배포된 데이터의 선례**로 정했다.
//   1. 베가드케파트 연음: SBL 라틴에서 구분 기호를 쓰지 않는다.
//      선례 — 창세기 배치의 ṭôb(ṭôḇ 아님) · ʿereb · bōqer · bādal.
//   2. 다게쉬 포르테: 한글에서 받침으로 겹쳐 적지 않는다.
//      선례 — אַתָּה→아타(앗타 아님) · כַּפֹּרֶת→카포레트 · θάλασσα→탈라사.
//   3. 음절 말 שׁ: '쉬'로 적는다.
//      선례 — אֵשׁ→에쉬 · דְּבַשׁ→데바쉬 · שֹׁ֫רֶשׁ→쇼레쉬 · אִישׁ→이쉬.
//   4. 자음 ו: w로 보고 와/웨/위/워로 적는다. (판정자 3/3 합의)
//   5. ע+홀렘 바브: '아원'으로 적는다. (판정자 3/3 합의)
//
// 1·2·3 은 기계적으로 검사·교정하고, 교정한 항목은 전부 보고서에 남긴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T6 = path.join(ROOT, '.pipeline/task6');

const consensus = JSON.parse(fs.readFileSync(path.join(T6, 'consensus.json'), 'utf8'));
const rulingsDoc = JSON.parse(fs.readFileSync(path.join(T6, 'rulings.json'), 'utf8'));

// --- 규칙 1: 연음 기호 제거 ---------------------------------------------
// ḇ ḡ ḏ ḵ ṯ 는 아래줄(U+0331)/윗줄(U+0304)이 붙은 베가드케파트다. ṭ ṣ ḥ 의
// 아래점(U+0323)이나 ā ē î ô 의 모음 장음 표시와 섞이지 않게 자음만 되돌린다.
const SPIRANT = new Map([
  ['ḇ', 'b'], ['ḡ', 'g'], ['ḏ', 'd'], ['ḵ', 'k'], ['ṯ', 't'],
  ['Ḇ', 'B'], ['Ḡ', 'G'], ['Ḏ', 'D'], ['Ḵ', 'K'], ['Ṯ', 'T'],
]);

function deSpirant(input) {
  // 결합문자 형태(b+U+0331)와 완성문자 형태(ḇ)를 모두 처리한다.
  let s = String(input).normalize('NFC');
  s = s.replace(/[ḇḡḏḵṯḆḠḎḴṮ]/g, (ch) => SPIRANT.get(ch) ?? ch);
  s = s.normalize('NFD')
    .replace(/([bgdkptBGDKPT])̱/g, '$1')   // 아래줄
    .replace(/([bpBP])̄/g, '$1')            // p̄ 등 자음 위 장음선
    .normalize('NFC');
  return s;
}

// --- 규칙 2: 받침 중복 해제 --------------------------------------------
// 한글 음절을 분해해 앞 음절의 받침이 뒤 음절 첫소리와 같은 자음이면
// 다게쉬 포르테를 받침으로 살린 표기로 보고 받침을 뺀다.
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const BASE = 0xac00;

// 받침과 다음 첫소리가 같은 자음을 가리키는 짝.
//
// ㄹ·ㅁ·ㄴ 은 넣지 않는다. 한국어는 자음 하나뿐인 ל·מ·נ 도 앞 음절 받침과
// 뒤 음절 첫소리로 나눠 적기 때문이다(샬롬 · 엘로힘 · 예루샬라임). 이들까지
// 겹자음으로 보면 멀쩡한 표기를 깎는다. 파열음·마찰음 계열만 다룬다.
//
// ㅅ받침은 한국어에서 겹자음 앞을 닫는 일반 표지다(맛테 · 핫타아 · 잇샤).
// 실제 히브리어 어말 שׁ 는 '쉬'로 적으므로(미쉬파트 · 에쉬) ㅅ받침이 낱말의
// 자음에서 오는 일은 없다. 그래서 뒤에 오는 장애음 전부를 짝으로 본다.
const OBSTRUENT = ['ㄱ', 'ㄲ', 'ㅋ', 'ㄷ', 'ㄸ', 'ㅌ', 'ㅂ', 'ㅃ', 'ㅍ', 'ㅅ', 'ㅆ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅎ'];
const DOUBLE = new Map([
  ['ㅅ', OBSTRUENT],
  ['ㅆ', OBSTRUENT],
  ['ㅂ', ['ㅂ', 'ㅃ', 'ㅍ']],
  ['ㄱ', ['ㄱ', 'ㄲ', 'ㅋ']],
  ['ㄷ', ['ㄷ', 'ㄸ', 'ㅌ']],
]);

function decompose(ch) {
  const code = ch.codePointAt(0) - BASE;
  if (code < 0 || code > 11171) return null;
  return {
    cho: CHO[Math.floor(code / 588)],
    jungIdx: Math.floor((code % 588) / 28),
    jong: JONG[code % 28],
    choIdx: Math.floor(code / 588),
  };
}

function stripJong(ch) {
  const d = decompose(ch);
  if (!d) return ch;
  return String.fromCodePoint(BASE + d.choIdx * 588 + d.jungIdx * 28);
}

function deGeminate(word) {
  const chars = [...String(word)];
  const out = [...chars];
  for (let i = 0; i < chars.length - 1; i += 1) {
    const cur = decompose(chars[i]);
    const next = decompose(chars[i + 1]);
    if (!cur || !next || !cur.jong) continue;
    const allowed = DOUBLE.get(cur.jong);
    if (allowed && allowed.includes(next.cho)) {
      out[i] = stripJong(chars[i]);
    }
  }
  return out.join('');
}

// --- 규칙 3: 음절 말 שׁ 는 '쉬' ----------------------------------------
// 라틴 음역에서 š 뒤에 모음이 오지 않는 자리를 찾아, 대응하는 한글이 '시'면
// '쉬'로 바꾼다. 어말 š 만 안전하게 다룬다(중간 음절은 감사 대상으로 남긴다).
function finalShin(translit, ko) {
  if (!/š$/.test(String(translit).normalize('NFC'))) return { ko, changed: false };
  if (/시$/.test(ko)) return { ko: `${ko.slice(0, -1)}쉬`, changed: true };
  return { ko, changed: false };
}

// --- 규칙 6: 헬라어 ευ 는 유 계열 -------------------------------------
// 배포된 bookContext.js 가 εὐθύς→유튀스 · ἐπορεύετο→에포류에토 · πνεῦμα→프뉴마 ·
// Ἰουδαῖος→유다이오스 로 일관되게 적는다. 저장소 어디에도 ευ 를 '에우'로 적은
// 사례가 없다(ηὔξανεν→에우크사넨은 ηυ 로 다른 이중모음이다).
// 낱말별로 확인한 것만 고친다. 일괄 변환하지 않는다
// (transliterationPolicy.js 가 ευ 자동 단일화를 금하고 있다).
const GREEK_EU = new Map([
  ['G4100', { ko: '피스튜오', why: 'ἐπορεύετο→에포류에토 · πνεῦμα→프뉴마 처럼 배포 데이터는 ευ 를 유 계열로 적는다.' }],
  ['G4198', { ko: '포류오마이', why: '같은 동사의 활용형이 배포 데이터에 ἐπορεύετο→에포류에토 로 있다.' }],
  ['G2453', { ko: '유다이오스', why: '배포 데이터에 Ἰουδαῖος→유다이오스 · Ἰουδαῖοι→유다이오이 로 그대로 있다.' }],
  ['G2147', { ko: '휴리스코', why: 'εὑ 는 거친 기식이 얹힌 ευ 다. 유 계열에 ㅎ 을 얹어 휴로 적는다.' }],
]);

// --- 적용 ---------------------------------------------------------------
const entries = new Map();
for (const a of consensus.agreed) {
  entries.set(a.strong, {
    strong: a.strong,
    lemma: a.lemma,
    translit: a.translit,
    translitKo: a.translitKo,
    note: a.note,
    origin: 'agreed',
  });
}
for (const r of rulingsDoc.rulings) {
  entries.set(r.strong, {
    strong: r.strong,
    lemma: r.lemma,
    translit: r.translit,
    translitKo: r.translitKo,
    note: r.note,
    origin: 'adjudicated',
    votesKo: r.votesKo,
  });
}

const changes = [];
for (const e of entries.values()) {
  const beforeLat = e.translit;
  const beforeKo = e.translitKo;

  e.translit = deSpirant(e.translit);
  if (e.translit !== beforeLat) {
    changes.push({ strong: e.strong, rule: 'begadkepat', field: 'translit', from: beforeLat, to: e.translit });
  }

  const deGem = deGeminate(e.translitKo);
  if (deGem !== e.translitKo) {
    changes.push({ strong: e.strong, rule: 'gemination', field: 'translitKo', from: e.translitKo, to: deGem });
    e.translitKo = deGem;
  }

  const shin = finalShin(e.translit, e.translitKo);
  if (shin.changed) {
    changes.push({ strong: e.strong, rule: 'final_shin', field: 'translitKo', from: e.translitKo, to: shin.ko });
    e.translitKo = shin.ko;
  }

  const eu = GREEK_EU.get(e.strong);
  if (eu && e.translitKo !== eu.ko) {
    changes.push({ strong: e.strong, rule: 'greek_eu', field: 'translitKo', from: e.translitKo, to: eu.ko, why: eu.why });
    e.translitKo = eu.ko;
    // 판정 단계의 근거는 '에우'를 전제로 쓴 것이라 교정된 표기와 어긋난다.
    // 덧붙이지 않고 교체한다.
    e.note = eu.why;
  }

  if (e.translitKo !== beforeKo || e.translit !== beforeLat) {
    e.ruleAdjusted = true;
  }
}

const byRule = {};
for (const c of changes) byRule[c.rule] = (byRule[c.rule] || 0) + 1;

fs.writeFileSync(
  path.join(T6, 'final.json'),
  `${JSON.stringify(
    {
      batchId: 'top-frequency-batch-02',
      rules: {
        begadkepat: 'SBL 라틴에서 베가드케파트 연음 구분 기호를 쓰지 않는다 (선례: ṭôb · ʿereb · bōqer).',
        gemination: '다게쉬 포르테를 한글 받침으로 겹쳐 적지 않는다 (선례: 아타 · 카포레트 · 탈라사).',
        final_shin: '음절 말 שׁ 는 쉬로 적는다 (선례: 에쉬 · 데바쉬 · 쇼레쉬 · 이쉬).',
        greek_eu: '헬라어 ευ 는 유 계열로 적는다 (선례: 유튀스 · 에포류에토 · 프뉴마 · 유다이오스). 낱말별 확인분만 교정한다.',
        waw: '자음 ו 는 w 로 보고 와/웨/위/워로 적는다 (판정자 3/3 합의).',
        ayin_holam: 'ע + 홀렘 바브는 아원으로 적는다 (판정자 3/3 합의).',
      },
      ruleBasis: '표결이 아니라 이미 배포된 koreanGloss·창세기 배치의 선례를 기준으로 확정했다.',
      total: entries.size,
      changesByRule: byRule,
      changes,
      entries: [...entries.values()],
    },
    null,
    2,
  )}\n`,
);

console.log('총', entries.size, '· 규칙 교정', changes.length, byRule);
for (const c of changes.slice(0, 15)) console.log(' ', c.rule, c.strong, c.from, '→', c.to);
