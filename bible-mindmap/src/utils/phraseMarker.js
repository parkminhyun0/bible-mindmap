/**
 * phraseMarker.js
 *
 * morph code(TAHOT/TAGNT) 기반 규칙 구 분석 + 파스 트리 빌더.
 * buildPhraseTree(words) → {label, children, word} 트리 노드
 */

// ── POS 추출 ───────────────────────────────────────────────────────────────

// ── TAGNT (헬라어) 감지 ──
// 실제 TAGNT morph 코드:
//   전치사 'PREP', 접속사 'CONJ'/'CONJ-N', 부사 'ADV', 부정사 'PRT-N'
//   단일 대문자+대시 패턴: N-NSM, V-IAI-3S, T-ASM(관사), A-GPM(형용사),
//   D-NSM(지시대명사), R-ASN(관계대명사), K-APN(상관대명사), P-GPM(인칭대명사)
// 히브리어는 H+대문자 또는 '/'를 포함하는 형태 — 대시 패턴 없음
function isGreekMorph(m) {
  if (!m) return false;
  // 전체 단어 코드 (PREP, CONJ, ADV, PRT-N, CONJ-N, PART, …)
  if (/^(PREP|CONJ|ADV|PRT|PART|COND|INJ|ARAM|HEB)/.test(m)) return true;
  // 단일 알파벳 + 대시 패턴 (T-NSM, N-NSM, A-GPM, V-IAI-3S, D-NSM, R-ASN, P-GPM 등)
  if (/^[A-Z]-[A-Z0-9]/.test(m)) return true;
  return false;
}

// 헬라어 품사 → 히브리어 청킹 시스템과 공유 가능한 단일 문자 코드로 변환
// R=전치사(PP), V=동사(VP), N=명사(NP), P=대명사(NP), A=형용사(NP)
// T=관사·불변(Td/PrtP), C=접속사(CONJ), D=부사(AdvP)
function getGreekPOS(m) {
  const u = m.toUpperCase();
  // 전체 단어 코드
  if (u.startsWith('PREP'))                                    return 'R';
  if (u.startsWith('CONJ'))                                    return 'C';
  if (u.startsWith('ADV'))                                     return 'D';
  if (u.startsWith('PRT') || u.startsWith('PART') || u.startsWith('INJ')) return 'T';
  // 단일 알파벳 + 대시 코드 (실제 TAGNT 형식)
  if (u.startsWith('V-'))                                      return 'V';
  if (u.startsWith('N-'))                                      return 'N';
  if (u.startsWith('T-'))                                      return 'T'; // 관사 (getPOS2 → Td → NP)
  if (u.startsWith('A-'))                                      return 'A';
  if (/^[DRKP]-/.test(u))                                     return 'P'; // 지시·관계·상관·인칭 대명사
  // 구형 DET/PRON/ADJ 형식 (fallback)
  if (u.startsWith('DET'))                                     return 'T';
  if (u.startsWith('PRON'))                                    return 'P';
  if (u.startsWith('ADJ'))                                     return 'A';
  return (u.match(/[A-Z]/) || ['X'])[0];
}

// ── TAHOT (히브리어) 단어 경계 마커 제거 ──
// H + 대문자로 시작하는 경우 앞의 H는 마커 → 실제 품사는 다음 문자
// 예: HNpl → Npl → N, HVqcc → V, HPp3ms → P
function stripHMarker(part) {
  return (part.length > 1 && part[0] === 'H' && part[1] >= 'A' && part[1] <= 'Z')
    ? part.slice(1) : part;
}

function getPOS(m) {
  if (!m) return 'X';
  if (isGreekMorph(m)) return getGreekPOS(m);
  const part = m.includes('/') ? m.split('/').pop() : m;
  return (stripHMarker(part).match(/[A-Z]/) || ['X'])[0];
}

// 두 자리 품사 코드 (Td=관사 → NP 트리거)
function getPOS2(m) {
  if (!m) return 'X';
  if (isGreekMorph(m)) {
    const u = m.toUpperCase();
    if (u.startsWith('T-') || u.startsWith('DET')) return 'Td'; // 헬라어 관사 → NP 합류
    return getGreekPOS(m);
  }
  const part = m.includes('/') ? m.split('/').pop() : m;
  return (stripHMarker(part).match(/[A-Z][a-z]?/) || ['X'])[0];
}

// 접속사 접두사가 붙은 단어인지 (히브리어 Hc/Vqw3ms 형태; 헬라어는 해당 없음)
function hasConjPrefix(m) {
  return !!m && /^[HA][a-z]+\//.test(m);
}

// ── 노드 색상 설정 ──────────────────────────────────────────────────────────
export const NODE_CFG = {
  S:    { fill: '#f0fdf4', stroke: '#059669', text: '#064e3b' },
  NP:   { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
  VP:   { fill: '#dcfce7', stroke: '#16a34a', text: '#14532d' },
  PP:   { fill: '#fef9c3', stroke: '#ca8a04', text: '#78350f' },
  CONJ: { fill: '#f1f5f9', stroke: '#64748b', text: '#334155' },
  AdvP: { fill: '#f3e8ff', stroke: '#9333ea', text: '#4c1d95' },
  V:    { fill: '#bbf7d0', stroke: '#15803d', text: '#14532d' },
  N:    { fill: '#bfdbfe', stroke: '#2563eb', text: '#1e3a8a' },
  Det:  { fill: '#e0e7ff', stroke: '#4f46e5', text: '#312e81' },
  Adj:  { fill: '#fae8ff', stroke: '#a21caf', text: '#701a75' },
  Pro:  { fill: '#ddd6fe', stroke: '#7c3aed', text: '#4c1d95' },
  P:    { fill: '#fef3c7', stroke: '#d97706', text: '#92400e' },
  Adv:  { fill: '#f3e8ff', stroke: '#7c3aed', text: '#5b21b6' },
  Prt:  { fill: '#ffe4e6', stroke: '#e11d48', text: '#881337' },
  Inf:  { fill: '#ecfdf5', stroke: '#059669', text: '#065f46' },
  Ptc:  { fill: '#fef3c7', stroke: '#b45309', text: '#78350f' },
};

export function getNodeColor(label) {
  return NODE_CFG[label] || { fill: '#f8fafc', stroke: '#94a3b8', text: '#475569' };
}

// ── 구 청킹 (기존 유지) ────────────────────────────────────────────────────
export const PHRASE_CFG = {
  NP:   { label: 'NP',   desc: '명사구',   color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  VP:   { label: 'VP',   desc: '동사구',   color: '#166534', bg: '#dcfce7', border: '#86efac' },
  PP:   { label: 'PP',   desc: '전치사구', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  AdvP: { label: 'AdvP', desc: '부사구',   color: '#6d28d9', bg: '#f3e8ff', border: '#c4b5fd' },
  CONJ: { label: 'CONJ', desc: '접속사',   color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  PrtP: { label: 'Prt',  desc: '불변화사', color: '#9f1239', bg: '#ffe4e6', border: '#fda4af' },
  X:    { label: '?',    desc: '미분류',   color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

export function chunkVerse(words) {
  if (!words || words.length === 0) return [];
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const w = words[i];
    const pos  = getPOS(w.m);
    const pos2 = getPOS2(w.m);

    if (pos === 'R') {
      const chunk = { type: 'PP', words: [w] };
      i++;
      while (i < words.length) {
        const p = getPOS(words[i].m);
        if (['T', 'A', 'N', 'P', 'S'].includes(p) && !hasConjPrefix(words[i].m)) {
          chunk.words.push(words[i]); i++;
        } else break;
      }
      chunks.push(chunk);
    } else if (pos === 'V') {
      chunks.push({ type: 'VP', words: [w] }); i++;
    } else if (pos2 === 'Td' || pos === 'N' || pos === 'S') {
      const chunk = { type: 'NP', words: [w] }; i++;
      while (i < words.length) {
        const p  = getPOS(words[i].m);
        const p2 = getPOS2(words[i].m);
        if ((p === 'A' || p === 'N' || p === 'S' || p2 === 'Td') && !hasConjPrefix(words[i].m)) {
          chunk.words.push(words[i]); i++;
        } else break;
      }
      chunks.push(chunk);
    } else if (pos === 'A') {
      const chunk = { type: 'NP', words: [w] }; i++;
      while (i < words.length) {
        const p = getPOS(words[i].m);
        if ((p === 'A' || p === 'N') && !hasConjPrefix(words[i].m)) {
          chunk.words.push(words[i]); i++;
        } else break;
      }
      chunks.push(chunk);
    } else if (pos === 'P') {
      chunks.push({ type: 'NP', words: [w] }); i++;
    } else if (pos === 'C') {
      chunks.push({ type: 'CONJ', words: [w] }); i++;
    } else if (pos === 'D') {
      chunks.push({ type: 'AdvP', words: [w] }); i++;
    } else {
      chunks.push({ type: 'PrtP', words: [w] }); i++;
    }
  }
  return chunks;
}

// ── 파스 트리 빌더 ──────────────────────────────────────────────────────────

// chunkType을 word entry에 주입해 한글 정렬에 활용
function makeLeaf(label, wordEntry, chunkType = null) {
  const word = wordEntry ? { ...wordEntry, _chunkType: chunkType } : null;
  return { label, children: [], word };
}

function buildNPSubtree(words, chunkType = 'NP') {
  if (words.length === 0) return null;
  if (words.length === 1) {
    const pos2 = getPOS2(words[0].m);
    const pos  = getPOS(words[0].m);
    const lbl  = pos2 === 'Td' ? 'Det' : pos === 'P' ? 'Pro' : pos === 'A' ? 'Adj' : 'N';
    return makeLeaf(lbl, words[0], chunkType);
  }
  const children = words.map(w => {
    const pos2 = getPOS2(w.m);
    const pos  = getPOS(w.m);
    if (pos2 === 'Td') return makeLeaf('Det', w, chunkType);
    if (pos === 'P')   return makeLeaf('Pro', w, chunkType);
    if (pos === 'A')   return makeLeaf('Adj', w, chunkType);
    if (pos === 'S')   return makeLeaf('N',   w, chunkType);
    return makeLeaf('N', w, chunkType);
  });
  return { label: 'NP', children, word: null };
}

function buildChunkSubtree(chunk) {
  const ws = chunk.words;
  const ct = chunk.type;

  switch (ct) {
    case 'PP': {
      const pHeads = ws.filter(w => getPOS(w.m) === 'R');
      const npBody = ws.filter(w => getPOS(w.m) !== 'R');
      const children = [
        ...pHeads.map(w => makeLeaf('P', w, 'PP')),
        ...(npBody.length ? [buildNPSubtree(npBody, 'PP')] : []),
      ].filter(Boolean);
      return { label: 'PP', children, word: null };
    }
    case 'VP': {
      const w = ws[0];
      const m = w.m || '';
      // 히브리어 부정사(l)/분사(r/s) vs 헬라어 부정사(-N$)/분사(-P-)
      const isInf = /V[A-Z]l/.test(m) || /V-[A-Z]+N$/.test(m);
      const isPtc = /V[A-Z][rs]/.test(m) || /V-[A-Z]+P-/.test(m);
      const lbl = isInf ? 'Inf' : isPtc ? 'Ptc' : 'V';
      return { label: 'VP', children: [makeLeaf(lbl, w, 'VP')], word: null };
    }
    case 'NP': {
      const sub = buildNPSubtree(ws, 'NP');
      if (sub && sub.label !== 'NP') {
        return { label: 'NP', children: [sub], word: null };
      }
      return sub || makeLeaf('NP', ws[0], 'NP');
    }
    case 'CONJ':
      return makeLeaf('CONJ', ws[0], 'CONJ');
    case 'AdvP':
      return makeLeaf('Adv', ws[0], 'AdvP');
    default:
      return makeLeaf('Prt', ws[0], 'PrtP');
  }
}

/**
 * words 배열 → 파스 트리 루트 노드 (S)
 * { label: 'S', children: [...], word: null }
 */
export function buildPhraseTree(words) {
  if (!words || words.length === 0) return null;
  const chunks = chunkVerse(words);
  if (chunks.length === 0) return null;
  const children = chunks.map(buildChunkSubtree).filter(Boolean);
  return { label: 'S', children, word: null };
}

// ── 절 구조 분석 (흐름 뷰용) ───────────────────────────────────────────────

// 동사 morph에서 인칭·성·수 추출
function extractPGN(m) {
  if (!m) return null;

  // 헬라어: V-PAI-3S / V-AAI-1P 형태 → 마지막 세그먼트 [인칭][수]
  if (isGreekMorph(m)) {
    const gk = m.match(/-([123])([SP])$/i);
    if (!gk) return null;
    const pStr = { '1': '1인', '2': '2인', '3': '3인' }[gk[1]] || gk[1];
    const nStr = { S: '단', P: '복', s: '단', p: '복' }[gk[2]] || gk[2];
    return `${pStr}칭${nStr}수`;
  }

  // 히브리어: 인칭(1-3) + 성(m/f/c) + 수(s/p/d)
  const part = m.includes('/') ? m.split('/').pop() : m;
  const match = part.match(/([123])([mfcMFC])([spd])/i);
  if (!match) return null;
  const [, p, g, n] = match;
  const pStr = { '1': '1인', '2': '2인', '3': '3인' }[p] || p;
  const gStr = { m: '남', f: '여', c: '공', M: '남', F: '여', C: '공' }[g] || g;
  const nStr = { s: '단', p: '복', d: '쌍' }[n] || n;
  return `${pStr}칭${gStr}${nStr}수`;
}

function cleanW(w) { return (w?.w || '').replace(/\//g, ''); }

/**
 * words 배열 → 절 구조 요약 객체
 * { verb, subject, objects, complements, impliedPGN }
 */
export function analyzeClause(words) {
  if (!words || !words.length) return null;
  const chunks = chunkVerse(words);

  const vpChunks   = chunks.filter(c => c.type === 'VP');
  const npChunks   = chunks.filter(c => c.type === 'NP');
  const ppChunks   = chunks.filter(c => c.type === 'PP');
  const conjChunks = chunks.filter(c => c.type === 'CONJ');

  const mainVerbWord = vpChunks[0]?.words[0] || null;
  const pgn = mainVerbWord ? extractPGN(mainVerbWord.m) : null;

  // 주어: 동사 바로 뒤에 오는 NP (히브리어 VSO 어순)
  // 또는 동사 앞에 오는 NP (Topic)
  const verbIdx   = chunks.findIndex(c => c.type === 'VP');
  const npAfterV  = chunks.slice(verbIdx + 1).find(c => c.type === 'NP');
  const npBeforeV = chunks.slice(0, verbIdx).find(c => c.type === 'NP');
  const subjChunk = npAfterV || npBeforeV || null;

  // 목적어: 주어 이후의 NP들
  const usedNP = new Set(subjChunk ? [subjChunk] : []);
  const objChunks = npChunks.filter(c => !usedNP.has(c));

  const chunkEntries = (c) => ({
    heb:     c.words.map(cleanW).join(' '),
    tr:      c.words.map(w => w.tr || '').join(' ').trim(),
    entries: c.words,   // 원본 word entry 배열 — Strong 번호 등 포함
  });

  return {
    verb: mainVerbWord
      ? { heb: cleanW(mainVerbWord), tr: mainVerbWord.tr || '', g: mainVerbWord.g || '',
          pgn, m: mainVerbWord.m, entry: mainVerbWord }
      : null,
    subject:     subjChunk ? chunkEntries(subjChunk) : null,
    impliedPGN:  pgn,
    objects:     objChunks.map(chunkEntries),
    complements: ppChunks.map(chunkEntries),
    hasConj:     conjChunks.length > 0,
    chunks,
  };
}
