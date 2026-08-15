import { splitHebrewMorphemes } from './hebrewLexicalForm.js';

const VERB_STEM = {
  q: 'Qal', N: 'Niphal', p: 'Piel', P: 'Pual', h: 'Hiphil', H: 'Hophal', t: 'Hithpael',
  o: 'Polel', O: 'Polal', r: 'Hithpolel', m: 'Poel', M: 'Poal', k: 'Palel', K: 'Pulal',
  Q: 'Qal passive', l: 'Pilpel', L: 'Polpal', f: 'Hithpalpel', D: 'Nithpael', j: 'Pealal',
  i: 'Pilel', u: 'Hothpaal', c: 'Tiphil', v: 'Hishtaphel', w: 'Nithpalel', y: 'Nithpoel', z: 'Hithpoel',
};

const VERB_TYPE = {
  p: '완료', q: '연속완료', i: '미완료', w: '연속미완료', h: '청유형', j: '지시형',
  v: '명령형', r: '능동분사', s: '수동분사', a: '절대부정사', c: '연계부정사',
};

const GENDER = { b: '양성', c: '공성', f: '여성', m: '남성' };
const NUMBER = { d: '쌍수', p: '복수', s: '단수' };
const PERSON = { '1': '1인칭', '2': '2인칭', '3': '3인칭' };
const STATE = { a: '독립형', c: '연계형', d: '한정형' };

const PARTICLE_TYPE = {
  a: '긍정 불변사', d: '정관사', e: '권유 불변사', i: '의문 불변사', j: '감탄 불변사',
  m: '지시 불변사', n: '부정 불변사', o: '직접목적격 표지', r: '관계 불변사',
};
const SUFFIX_TYPE = {
  d: '방향 ה 접미사', h: '첨가 ה 접미사', n: '첨가 נ 접미사', p: '대명사 접미사',
};

function nominalDetails(segment, label) {
  const gender = GENDER[segment[2]];
  const number = NUMBER[segment[3]];
  const state = STATE[segment[4]];
  return [label, gender, number, state].filter(Boolean).join(' · ');
}

export function humanizeHebrewMorphSegment(segment) {
  if (!segment) return '';
  const head = segment[0];

  if (head === 'V') {
    const stem = VERB_STEM[segment[1]] || segment[1];
    const type = VERB_TYPE[segment[2]] || segment[2];
    const person = PERSON[segment[3]];
    const gender = GENDER[segment[4]];
    const number = NUMBER[segment[5]];
    return ['동사', stem, type, person, gender, number].filter(Boolean).join(' · ');
  }

  if (head === 'N') return nominalDetails(segment, '명사');
  if (head === 'A') return nominalDetails(segment, '형용사');
  if (head === 'C') return '접속사';
  if (head === 'D') return '부사';
  if (head === 'R') return segment[1] === 'd' ? '전치사 · 정관사 결합형' : '전치사';
  if (head === 'T') return PARTICLE_TYPE[segment[1]] || '불변사';
  if (head === 'S') {
    const type = SUFFIX_TYPE[segment[1]] || '접미사';
    const person = PERSON[segment[2]];
    const gender = GENDER[segment[3]];
    const number = NUMBER[segment[4]];
    return [type, person, gender, number].filter(Boolean).join(' · ');
  }
  if (head === 'P') return '대명사';
  if (head === 'X') return '불변사';
  if (head === 'I') return '감탄사';
  return segment;
}

export function parseHebrewMorphSegments(code) {
  if (!code || !code.startsWith('H')) return [];
  return code.slice(1)
    .split('/')
    .filter(Boolean)
    .map((segment) => ({
      code: segment,
      human: humanizeHebrewMorphSegment(segment),
    }));
}

export function humanizeHebrewMorphCode(code) {
  return parseHebrewMorphSegments(code).map((segment) => segment.human).filter(Boolean).join(' | ');
}

export function buildHebrewWordComposition(word, morphCode) {
  const forms = splitHebrewMorphemes(word);
  const morphs = parseHebrewMorphSegments(morphCode);
  const length = Math.max(forms.length, morphs.length);
  return Array.from({ length }, (_, index) => ({
    form: forms[index] || '',
    code: morphs[index]?.code || '',
    human: morphs[index]?.human || '',
  })).filter((item) => item.form || item.code || item.human);
}
