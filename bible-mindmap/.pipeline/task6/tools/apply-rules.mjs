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

// --- 규칙 7: 유성 쉐바는 ĕ ---------------------------------------------
// 배포된 창세기 배치가 ʾĕlōhîm · tĕhôm 으로 적는다. 이 배치도 15개는 ĕ 인데
// 3개만 ə 로 갈렸다. 같은 소리를 두 기호로 적을 이유가 없다.
const deShewa = (s) => String(s).replace(/ə/g, 'ĕ').replace(/Ə/g, 'Ĕ');

// --- 규칙 8: 같은 lemma 는 같게 --------------------------------------
// 이미 배포된 항목과 철자가 완전히 같은 낱말은 배포된 표기를 따른다.
// 사전 팝업에서 같은 글자가 다르게 읽히면 그 자체가 오류로 보인다.
const SAME_AS_SHIPPED = new Map([
  ['H4430', { ko: '멜렉', why: '아람어 항목이지만 철자가 히브리어 H4428(מֶלֶךְ)과 같고, 그쪽이 이미 멜렉으로 배포돼 있다. 같은 낱말을 사전 안에서 다르게 적지 않는다.' }],
]);

// --- 손질이 필요한 개별 항목 ------------------------------------------
// 감사에서 지적됐고 근거를 확인한 것만 손댄다.
const NOTE_OVERRIDE = new Map([
  ['H3069', '신명 YHWH 에 아도나이가 아니라 엘로힘의 모음을 얹은 형태다. 모음은 신명 자체의 것이 아니라 대독하는 낱말의 것이므로, 예호위는 재구성된 발음이 아니라 표기를 그대로 읽은 형태다. 같은 신명의 재구성 발음은 H3068 야훼를 보라. 표기를 확정하기 전 박 목사님 확인이 필요한 항목이다.'],
  ['H3091', '학술 표기는 예호슈아다. 한국어 성경은 여호수아로 옮긴다. 신명의 축약형(예호-)이 한국어 성경에서 여호-로 굳은 데서 온 차이다.'],
  ['H3414', '학술 표기는 이르메야다. 한국어 성경은 예레미야로 옮긴다. 그리스어 Ἰερεμίας 를 거쳐 굳은 형태다.'],
  // 아래는 관용 표기 설명이 판정 근거와 한 문장에 섞여 있어 문장째 걷힌 것들이다.
  // 설명 자체는 필요하므로 다시 적는다.
  ['H8010', '관용 표기는 솔로몬이다. 학술 표기를 표제로 삼아 셸로모로 둔다. 그리스어 Σολομών 을 거쳐 굳은 차이다.'],
  ['H3130', '관용 표기는 요셉이다. 학술 표기를 표제로 삼아 요세프로 둔다.'],
  ['H804', '관용 표기는 앗수르다. 학술 표기를 표제로 삼아 아슈르로 둔다.'],
  ['H4124', '관용 표기는 모압이다. 학술 표기를 표제로 삼아 모아브로 둔다. 어말 ב 를 브로 적는 이 배치의 원칙(자하브·야아코브)을 따랐다.'],
  ['H669', '관용 표기는 에브라임이다. 학술 표기를 표제로 삼아 에프라임으로 둔다.'],
  ['H4196', '어말 후음 앞의 a 는 숨은 파타흐(furtive patach)다. 발음 순서를 살려 미즈베아흐로 적는다. 마시아흐·루아흐와 같은 자리다.'],
  ['H8147', '유성 쉐바를 셰로 보아 셰나임으로 적는다. 쉬나임 표기도 쓰인다.'],
  ['H520', '멤은 다게쉬 포르테로 겹치지만, 한국어는 자음 하나짜리 מ 도 받침+초성으로 나눠 적으므로(샬롬) 이 자리는 받침 겹침 규칙에서 뺀다. 암마로 적는다.'],
]);

// 판정 단계의 근거는 규칙 교정 **전** 표기를 인용해 쓴 것이라, 교정 뒤에는
// 팝업에서 표기와 설명이 서로 다른 말을 한다. 그렇다고 note 를 통째로 지우면
// "관용 표기 '야곱'과 차이" 같은 멀쩡한 설명까지 날아간다. **문장 단위로** 본다.
function sentenceIsStale(sentence, translitKo) {
  if (/[ḇḡḏḵṯ]/.test(sentence)) return true;              // 지운 연음 기호를 아직 인용
  if (/[bpBP]̄/.test(sentence.normalize('NFD'))) return true;
  if (sentence.includes('ə')) return true;                 // 통일한 쉐바 기호를 아직 인용
  // 한글은 "채택한다/적는다/표기한다" 처럼 **채택을 주장하는 자리**만 본다.
  // 관용 표기를 인용하는 문장("관용 표기 '유다'와 차이")은 정상 설명이므로 남긴다.
  const adopt = [
    ...sentence.matchAll(/["“”'‘’]([가-힣]{2,})["“”'‘’]\s*(?:를|을)?\s*채택/g),
    ...sentence.matchAll(/([가-힣]{2,}?)(?:으로|로)\s*(?:채택|표기한다|적는다|표기하다)/g),
  ].map((m) => m[1]);
  return adopt.some((k) => k !== translitKo);
}

function splitSentences(note) {
  return String(note)
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 어긋나는 문장만 빼고 나머지는 그대로 둔다.
function pruneNote(note, translitKo) {
  if (!note) return { note: '', dropped: [] };
  const kept = [];
  const dropped = [];
  for (const s of splitSentences(note)) {
    (sentenceIsStale(s, translitKo) ? dropped : kept).push(s);
  }
  return { note: kept.join(' '), dropped };
}

// 앞머리의 집계 문장(“…판정했다(2/3 일치).” / “…일치했다.”)만 뽑는다.
function tallySentence(note) {
  const m = /^[^.]*(?:판정했다\([^)]*\)|일치했다)\./.exec(String(note));
  return m ? m[0] : '';
}

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

  const shewa = deShewa(e.translit);
  if (shewa !== e.translit) {
    changes.push({ strong: e.strong, rule: 'shewa', field: 'translit', from: e.translit, to: shewa });
    e.translit = shewa;
  }

  const same = SAME_AS_SHIPPED.get(e.strong);
  if (same && e.translitKo !== same.ko) {
    changes.push({ strong: e.strong, rule: 'same_as_shipped', field: 'translitKo', from: e.translitKo, to: same.ko, why: same.why });
    e.translitKo = same.ko;
    // 판정 집계는 사실이므로 남기고, 근거만 갈아 끼운다.
    e.note = [tallySentence(e.note), same.why].filter(Boolean).join(' ');
  }

  if (e.translitKo !== beforeKo || e.translit !== beforeLat) {
    e.ruleAdjusted = true;
  }

  // 교정 뒤에도 남아 있는 옛 표기 인용만 문장 단위로 걷어낸다.
  const pruned = pruneNote(e.note, e.translitKo);
  if (pruned.dropped.length) {
    changes.push({
      strong: e.strong,
      rule: 'note_stale',
      field: 'note',
      from: e.note,
      to: pruned.note,
      droppedSentences: pruned.dropped,
    });
    e.note = pruned.note;
  }

  const override = NOTE_OVERRIDE.get(e.strong);
  if (override) {
    const kept = tallySentence(e.note);
    e.note = [kept, override].filter(Boolean).join(' ');
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
