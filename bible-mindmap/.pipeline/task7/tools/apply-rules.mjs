// batch 03 이후 공용: 확정 규칙을 배치 전체에 기계적으로 검사·교정한다.
//
// batch 02 에서 확정한 규칙은 작업 명세(WORKER_SPEC)에 이미 들어가 있으므로
// 위반이 많지는 않다. 그래도 사람이 눈으로 훑는 대신 전수로 확인한다.
//
// 사용: node apply-rules.mjs <task 디렉터리 이름>   예) task7
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const TASK = process.argv[2] || path.basename(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const DIR = path.join(ROOT, '.pipeline', TASK);

const readJson = (p) => {
  let raw = fs.readFileSync(p, 'utf8').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(raw);
};

const consensus = readJson(path.join(DIR, 'consensus.json'));
const rulingsPath = path.join(DIR, 'rulings.json');
const rulings = fs.existsSync(rulingsPath) ? readJson(rulingsPath) : { rulings: [] };

// --- 규칙 1: 베가드케파트 연음 기호 제거 --------------------------------
const SPIRANT = new Map([
  ['ḇ', 'b'], ['ḡ', 'g'], ['ḏ', 'd'], ['ḵ', 'k'], ['ṯ', 't'],
  ['Ḇ', 'B'], ['Ḡ', 'G'], ['Ḏ', 'D'], ['Ḵ', 'K'], ['Ṯ', 'T'],
]);
function deSpirant(input) {
  let s = String(input).normalize('NFC');
  s = s.replace(/[ḇḡḏḵṯḆḠḎḴṮ]/g, (ch) => SPIRANT.get(ch) ?? ch);
  return s.normalize('NFD')
    .replace(/([bgdkptBGDKPT])̱/g, '$1')
    .replace(/([bpBP])̄/g, '$1')
    .normalize('NFC');
}

// --- 규칙 2: 장애음 겹자음 받침 해제 ------------------------------------
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const BASE = 0xac00;
const OBSTRUENT = ['ㄱ', 'ㄲ', 'ㅋ', 'ㄷ', 'ㄸ', 'ㅌ', 'ㅂ', 'ㅃ', 'ㅍ', 'ㅅ', 'ㅆ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅎ'];
const DOUBLE = new Map([
  ['ㅅ', OBSTRUENT], ['ㅆ', OBSTRUENT],
  ['ㅂ', ['ㅂ', 'ㅃ', 'ㅍ']], ['ㄱ', ['ㄱ', 'ㄲ', 'ㅋ']], ['ㄷ', ['ㄷ', 'ㄸ', 'ㅌ']],
]);
const decompose = (ch) => {
  const code = ch.codePointAt(0) - BASE;
  if (code < 0 || code > 11171) return null;
  return { cho: CHO[Math.floor(code / 588)], jungIdx: Math.floor((code % 588) / 28), jong: JONG[code % 28], choIdx: Math.floor(code / 588) };
};
const stripJong = (ch) => {
  const d = decompose(ch);
  return d ? String.fromCodePoint(BASE + d.choIdx * 588 + d.jungIdx * 28) : ch;
};
function deGeminate(word) {
  const chars = [...String(word)];
  const out = [...chars];
  for (let i = 0; i < chars.length - 1; i += 1) {
    const cur = decompose(chars[i]);
    const next = decompose(chars[i + 1]);
    if (!cur || !next || !cur.jong) continue;
    const allowed = DOUBLE.get(cur.jong);
    if (allowed && allowed.includes(next.cho)) out[i] = stripJong(chars[i]);
  }
  return out.join('');
}

// --- 규칙 3: 어말 š 는 쉬 ------------------------------------------------
function finalShin(translit, ko) {
  if (!/š$/.test(String(translit).normalize('NFC'))) return { ko, changed: false };
  if (/시$/.test(ko)) return { ko: `${ko.slice(0, -1)}쉬`, changed: true };
  return { ko, changed: false };
}

// --- 규칙 7: 유성 쉐바는 ĕ ----------------------------------------------
const deShewa = (s) => String(s).replace(/ə/g, 'ĕ').replace(/Ə/g, 'Ĕ');

// --- 규칙 6: 헬라어 ευ 는 유 계열 --------------------------------------
// 배포된 bookContext.js 의 선례는 예외가 없다:
//   εὐθύς→유튀스 · εὐαγγέλιον→유앙겔리온 · εὐχαριστοῦμεν→유카리스투멘 ·
//   προσευχόμενος→프로슈코메노스 · ἀρχιερεὺς→아르키에류스 · πνεῦμα→프뉴마 ·
//   ἐλευθερίᾳ→엘류테리아 · πολίτευμα→폴리튜마 · μαθητεύσατε→마테튜사테
// '에우'로 적은 사례는 ηὔξανεν→에우크사넨 하나뿐이고 그것은 ηυ 로 다른
// 이중모음이다.
//
// 한글에서는 '<자음>ㅔ + 우' 두 음절이 '<자음>ㅠ' 한 음절로 합쳐진다.
//   테+우→튜 · 레+우→류 · 세+우→슈 · 헤+우→휴 · 네+우→뉴 · 에+우→유
// lemma 에 ευ 가 있는 항목에만 적용한다. ηυ 는 건드리지 않는다.
const JUNG_E = 5;   // ㅔ
const JUNG_YU = 17; // ㅠ
function greekEu(lemma, ko) {
  const l = String(lemma).normalize('NFC');
  if (!/ε[υύὐὑῦὺ]/.test(l)) return ko;
  const chars = [...String(ko)];
  const out = [];
  for (let i = 0; i < chars.length; i += 1) {
    const cur = decompose(chars[i]);
    if (cur && !cur.jong && cur.jungIdx === JUNG_E && chars[i + 1] === '우') {
      out.push(String.fromCodePoint(BASE + cur.choIdx * 588 + JUNG_YU * 28));
      i += 1; // '우' 를 흡수한다
      continue;
    }
    out.push(chars[i]);
  }
  return out.join('');
}

// --- 규칙 9: 어말 카마츠+헤 는 -â ---------------------------------------
// 여성형 어미 ־ָה 의 헤는 자음이 아니라 모음 글자다. 배포 데이터는 예외 없이
// -â 로 적는다: tôrâ · ʾădāmâ · bĕhēmâ · mišpāḥâ · gālâ · kāsâ · minḥâ · ʿēdâ.
// batch 02 도 31개가 전부 -â 이고 -āh 는 하나도 없다.
//
// 두 가지는 건드리지 않는다.
//   · lemma 가 마피크 붙은 הּ 로 끝나면 헤가 자음이다 (יָהּ → yāh).
//   · 세골·홀렘 뒤의 헤는 배포 데이터가 -eh·-ōh 로 적는다
//     (mōšeh · parʿōh · šĕlōmōh). 카마츠 자리만 다룬다.
function finalQamatsHe(lemma, translit) {
  const l = String(lemma).normalize('NFC');
  if (/הּ\s*$/.test(l)) return translit;      // הּ 마피크 = 자음
  return String(translit).normalize('NFC').replace(/āh$/, 'â');
}

// --- 규칙 10: 어두 ῥ 는 ㄹ ----------------------------------------------
// 배포 데이터는 거친 기식을 한글로 살리지 않는다:
// ῥάβδος→라브도스 · ῥίζα→리자. '흐르'·'흐레' 로 적은 사례가 없다.
function initialRho(lemma, ko) {
  if (!/^ῥ/.test(String(lemma).normalize('NFC'))) return ko;
  return String(ko).replace(/^흐/, '');
}

// --- note 위생: 교정 전 표기를 인용한 문장만 걷어낸다 ---------------------
// 무엇이 낡았는지는 **추측하지 말고 교정 이력에서 가져온다.** 앞선 판본은
// "하나로 적는다"의 '하나', "유 계열로 적는다"의 '계열'을 표기 주장으로 오인해
// 멀쩡한 설명을 지웠고, 반대로 "에우로 음역함"은 동사가 달라 놓쳤다.
//
// 이 항목에서 실제로 무엇이 무엇으로 바뀌었는지 알고 있으니, 바뀌기 전 표기를
// 인용한 문장만 걷어낸다.
const RULE_STALE_MARK = {
  greek_eu: ['에우'],   // ευ 를 유 계열로 합쳤으므로 '에우'를 말하는 문장은 낡았다
};

function staleMarkers(entryChanges) {
  const marks = new Set();
  for (const c of entryChanges) {
    if (c.field === 'note') continue;
    if (c.from) marks.add(String(c.from));
    for (const extra of RULE_STALE_MARK[c.rule] || []) marks.add(extra);
  }
  return [...marks];
}

function sentenceIsStale(sentence, translitKo, marks) {
  if (/[ḇḡḏḵṯ]/.test(sentence)) return true;
  if (/[bpBP]̄/.test(sentence.normalize('NFD'))) return true;
  if (sentence.includes('ə')) return true;
  if (marks.some((m) => m && m !== translitKo && sentence.includes(m))) return true;
  // 따옴표로 표기를 특정해 채택을 주장하는 자리만 본다. 따옴표 없는
  // "…로 적는다" 는 일반 서술일 때가 많아 근거로 삼지 않는다.
  const quoted = [...sentence.matchAll(/["“”'‘’]([가-힣]{2,})["“”'‘’]\s*(?:를|을)?\s*채택/g)].map((m) => m[1]);
  return quoted.some((k) => k !== translitKo);
}

function pruneNote(note, translitKo, marks) {
  if (!note) return { note: '', dropped: [] };
  const kept = [];
  const dropped = [];
  for (const s of String(note).split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean)) {
    (sentenceIsStale(s, translitKo, marks) ? dropped : kept).push(s);
  }
  return { note: kept.join(' '), dropped };
}

// --- 적용 ---------------------------------------------------------------
const entries = new Map();
for (const s of consensus.settled) {
  entries.set(s.strong, { ...s, origin: s.origin });
}
for (const r of rulings.rulings || []) {
  const base = entries.get(r.strong) || {};
  entries.set(r.strong, {
    ...base,
    strong: r.strong,
    lemma: r.lemma || base.lemma,
    translit: r.translit,
    translitKo: r.translitKo,
    note: r.note,
    origin: 'adjudicated',
  });
}

// 감사에서 지적됐고 배포 데이터로 근거를 확인한 개별 손질.
// {"H1035": {"translitKo": "...", "note": "...", "why": "..."}}
const overridePath = path.join(DIR, 'overrides.json');
const overrides = fs.existsSync(overridePath) ? readJson(overridePath) : {};

// 판정 없이 선례만으로 결론이 서는 불일치 항목은 오버라이드로 확정한다.
// 그런 항목은 settled 에 없으므로 여기서 넣어 주지 않으면 배치에서 통째로 빠진다.
for (const d of consensus.disputed || []) {
  const ov = overrides[d.strong];
  if (!ov || !ov.translitKo) continue;
  if (entries.has(d.strong)) continue;
  const first = (d.options || [])[0] || {};
  entries.set(d.strong, {
    strong: d.strong,
    lemma: d.lemma,
    translit: ov.translit || first.translit || '',
    translitKo: ov.translitKo,
    note: ov.note || ov.why || '',
    origin: 'override',
  });
}

const changes = [];
for (const e of entries.values()) {
  const beforeLat = e.translit;
  const beforeKo = e.translitKo;

  e.translit = deShewa(deSpirant(e.translit));
  if (e.translit !== beforeLat) {
    changes.push({ strong: e.strong, rule: /ə/.test(beforeLat) ? 'shewa' : 'begadkepat', field: 'translit', from: beforeLat, to: e.translit });
  }

  const qamats = finalQamatsHe(e.lemma, e.translit);
  if (qamats !== e.translit) {
    changes.push({ strong: e.strong, rule: 'qamats_he', field: 'translit', from: e.translit, to: qamats });
    e.translit = qamats;
  }

  const deGem = deGeminate(e.translitKo);
  if (deGem !== e.translitKo) {
    changes.push({ strong: e.strong, rule: 'gemination', field: 'translitKo', from: e.translitKo, to: deGem });
    e.translitKo = deGem;
  }

  const eu = greekEu(e.lemma, e.translitKo);
  if (eu !== e.translitKo) {
    changes.push({ strong: e.strong, rule: 'greek_eu', field: 'translitKo', from: e.translitKo, to: eu });
    e.translitKo = eu;
  }

  const rho = initialRho(e.lemma, e.translitKo);
  if (rho !== e.translitKo) {
    changes.push({ strong: e.strong, rule: 'initial_rho', field: 'translitKo', from: e.translitKo, to: rho });
    e.translitKo = rho;
  }

  const shin = finalShin(e.translit, e.translitKo);
  if (shin.changed) {
    changes.push({ strong: e.strong, rule: 'final_shin', field: 'translitKo', from: e.translitKo, to: shin.ko });
    e.translitKo = shin.ko;
  }

  const marks = staleMarkers(changes.filter((c) => c.strong === e.strong));
  const pruned = pruneNote(e.note, e.translitKo, marks);
  if (pruned.dropped.length) {
    changes.push({ strong: e.strong, rule: 'note_stale', field: 'note', from: e.note, to: pruned.note, droppedSentences: pruned.dropped });
    e.note = pruned.note;
  }

  const ov = overrides[e.strong];
  if (ov) {
    for (const field of ['translit', 'translitKo']) {
      if (ov[field] && ov[field] !== e[field]) {
        changes.push({ strong: e.strong, rule: 'audit_override', field, from: e[field], to: ov[field], why: ov.why });
        e[field] = ov[field];
      }
    }
    if (ov.note) e.note = ov.note;
  }

  if (e.translitKo !== beforeKo || e.translit !== beforeLat) e.ruleAdjusted = true;
}

const byRule = {};
for (const c of changes) byRule[c.rule] = (byRule[c.rule] || 0) + 1;
const fieldFix = new Set(changes.filter((c) => c.field !== 'note').map((c) => c.strong)).size;

fs.writeFileSync(
  path.join(DIR, 'final.json'),
  `${JSON.stringify({
    batchId: consensus.batchId,
    ruleBasis: 'batch 02 에서 배포 데이터 선례로 확정한 규칙을 그대로 적용한다.',
    total: entries.size,
    fieldFixCount: fieldFix,
    changesByRule: byRule,
    changes,
    entries: [...entries.values()],
  }, null, 2)}\n`,
);

console.log(TASK, '· 총', entries.size, '· 표기 교정', fieldFix, '항목 ·', JSON.stringify(byRule));
for (const c of changes.filter((x) => x.field !== 'note').slice(0, 12)) {
  console.log('  ', c.rule, c.strong, c.from, '→', c.to);
}
