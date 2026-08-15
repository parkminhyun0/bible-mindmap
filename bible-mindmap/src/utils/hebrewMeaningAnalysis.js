import { parseHebrewMorphSegments } from './hebrewMorphologyDisplay.js';

const STEM_ORDER = ['Qal', 'Niphal', 'Piel', 'Pual', 'Hiphil', 'Hophal', 'Hithpael'];

const STEM_INFO = {
  Qal: {
    ko: '칼',
    aliases: ['qal'],
    interpretation: '가장 기본적인 비파생 어간입니다. 주어가 어떤 행동을 하거나 어떤 상태에 있음을 나타내는 용법이 흔하며, 다른 파생 어간의 의미 변화를 비교할 때 기준점 역할을 합니다.',
    semanticShift: '기본 어휘 의미를 비교적 직접적으로 나타내는 경우가 많습니다. 다만 Qal이라고 해서 항상 “단순 능동”으로 번역되는 것은 아닙니다.',
    explanation: '가장 기본적인 어간으로 어휘의 기본 용법이 자주 나타납니다. 그러나 Qal을 항상 “단순·능동”으로 고정하지 않고, 실제 뜻은 해당 어휘의 BDB Qal 분기에서 확인해야 합니다.',
  },
  Niphal: {
    ko: '니팔',
    aliases: ['niphal', 'niph', 'nifal'],
    interpretation: '수동·중간·재귀 또는 어떤 상태가 성립되는 의미가 자주 나타납니다. 문맥에 따라 “~되다”, “스스로 ~하다”, “~한 상태가 되다”와 같은 방향으로 해석될 수 있습니다.',
    semanticShift: 'Qal의 “행하다/상태에 있다”에서 “행해지다/그 상태가 되다/스스로 관여하다” 쪽으로 의미 관계가 이동하는 경우가 많습니다.',
    explanation: '수동·중간·재귀·상태 의미가 자주 나타납니다. 어느 기능이 실제로 적용되는지는 어휘별 BDB 분기와 문맥이 결정합니다.',
  },
  Piel: {
    ko: '피엘',
    aliases: ['piel', 'piʿel', 'pi‘el', 'pi`el'],
    interpretation: '단순한 “강조형”이 아닙니다. 어떤 상태를 만들어 냄(factitive), 집중·반복된 행위, 명명·선언, 사역적 파생 등 여러 의미 기능이 나타날 수 있습니다.',
    semanticShift: '기본 의미에서 “더 세게”만 변하는 것이 아니라 “어떤 상태로 만들다”, “반복·집중하여 행하다”, “그렇게 규정·명명하다” 같은 새로운 관계가 생길 수 있습니다.',
    explanation: '강화·상태화(factitive)·사역·반복·명명 등 여러 파생 기능이 나타날 수 있습니다. “강조형” 하나로 뜻을 고정하지 않고 BDB의 해당 Piel 의미 분기를 우선합니다.',
  },
  Pual: {
    ko: '푸알',
    aliases: ['pual', 'puʿal', 'pu‘al', 'pu`al'],
    interpretation: 'Piel 계열의 수동·결과적 어간입니다. 어떤 대상이 Piel적 행위나 상태 변화의 영향을 받거나 그 결과 상태에 놓이는 의미가 자주 나타납니다.',
    semanticShift: 'Piel의 “~하게 만들다/집중적으로 행하다”에서 “~하게 되다/그 처리를 받다/그 결과 상태가 되다” 쪽으로 이동하는 경우가 많습니다.',
    explanation: 'Piel 계열의 수동·결과적 기능이 자주 나타납니다. 실제 의미 범위는 해당 어휘의 BDB Pual 분기에서 확인합니다.',
  },
  Hiphil: {
    ko: '히필',
    aliases: ['hiphil', 'hiph', 'hifil'],
    interpretation: '사역·원인 유발 의미가 흔합니다. 주어가 직접 행동하는 것보다 다른 대상이 어떤 행동이나 상태에 이르도록 원인을 제공하는 관계를 나타낼 수 있습니다.',
    semanticShift: '“~하다/되다”에서 “~하게 하다”, “~하도록 만들다”, “그 상태가 일어나게 하다” 쪽으로 의미 관계가 이동하는 경우가 많습니다.',
    explanation: '사역·원인 유발 의미가 자주 나타납니다. 다만 모든 Hiphil을 단순히 “~하게 하다”로 환원하지 않고 BDB의 어휘별 의미를 우선합니다.',
  },
  Hophal: {
    ko: '호팔',
    aliases: ['hophal', 'hoph', 'hofal'],
    interpretation: 'Hiphil 계열의 수동 어간입니다. 어떤 대상이 다른 원인에 의해 특정 행동이나 상태에 이르게 됨을 나타내는 경우가 많습니다.',
    semanticShift: 'Hiphil의 “~하게 하다”에서 “~하게 되도록 영향을 받다”, “원인 작용의 결과를 받다” 쪽으로 이동하는 경우가 많습니다.',
    explanation: 'Hiphil 계열의 수동·사역 결과 의미가 자주 나타납니다. 실제 뜻은 해당 어휘의 BDB Hophal 분기에서 확인합니다.',
  },
  Hithpael: {
    ko: '히트파엘',
    aliases: ['hithpael', 'hitpael', 'hithp'],
    interpretation: '재귀·상호·중간·자기 관련 또는 반복적 의미가 자주 나타납니다. 주어가 자기 자신에게 행하거나 서로 주고받는 관계, 스스로 어떤 상태에 관여하는 용법이 가능합니다.',
    semanticShift: '“~하다”에서 “자기 자신에게 ~하다”, “서로 ~하다”, “스스로 그 상태에 관여하다” 쪽으로 의미 관계가 이동하는 경우가 많습니다.',
    explanation: '재귀·상호·자기 관련·반복 의미가 자주 나타납니다. 정확한 기능은 어휘별 BDB 분기와 문맥을 함께 확인해야 합니다.',
  },
};

function lexicalMorphSegment(code) {
  const segments = parseHebrewMorphSegments(code);
  return [...segments].reverse().find((segment) => /^[VNA]/.test(segment.code || '')) || null;
}

function flattenNodes(nodes, parentPath = []) {
  const rows = [];
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const path = [...parentPath, node];
    rows.push({ node, path });
    rows.push(...flattenNodes(node.children, path));
  }
  return rows;
}

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stemMatches(text, stem) {
  const info = STEM_INFO[stem];
  if (!info) return false;
  const haystack = normalizedText(text).toLowerCase();
  return info.aliases.some((alias) => haystack.includes(alias.toLowerCase()));
}

function nominalMatches(text, human) {
  const haystack = normalizedText(text);
  const signals = [];
  if (/복수/.test(human || '')) signals.push(/\bplural\b|\bpl\./i);
  if (/단수/.test(human || '')) signals.push(/\bsingular\b|\bsg\./i);
  if (/연계형/.test(human || '')) signals.push(/\bconstruct\b|\bcstr\.?\b/i);
  if (/독립형/.test(human || '')) signals.push(/\babsolute\b|\babs\.?\b/i);
  return signals.some((pattern) => pattern.test(haystack));
}

function branchPreview(row) {
  const { node, path } = row;
  return {
    id: node.id,
    depth: node.depth ?? Math.max(0, path.length - 1),
    text: normalizedText(node.text),
    parentText: path.length > 1 ? normalizedText(path[path.length - 2]?.text) : '',
    children: (node.children || []).slice(0, 3).map((child) => ({
      id: child.id,
      text: normalizedText(child.text),
    })),
  };
}

function uniqueBranches(rows, limit = 6) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const text = normalizedText(row?.node?.text);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(branchPreview(row));
    if (result.length >= limit) break;
  }
  return result;
}

function topLevelBranches(nodes, limit = 6) {
  return uniqueBranches((Array.isArray(nodes) ? nodes : []).map((node) => ({ node, path: [node] })), limit);
}

function withOverview(result, bdbNodes) {
  return {
    ...result,
    overviewBranches: topLevelBranches(bdbNodes),
  };
}

export function analyzeHebrewMorphologyMeaning(code, bdbNodes = []) {
  const lexical = lexicalMorphSegment(code);
  const human = lexical?.human || '';
  const allRows = flattenNodes(bdbNodes);

  if (!lexical) {
    return withOverview({
      kind: 'unknown',
      title: '형태와 의미 연결',
      grammarSummary: human || '형태 정보 없음',
      explanation: '현재 토큰에서 의미 변화와 연결할 수 있는 핵심 형태소를 확인하지 못했습니다.',
      sourceLabel: 'BDB 주요 의미 분기',
      branches: topLevelBranches(bdbNodes),
      caution: '형태 정보가 부족한 경우 뜻을 추정하지 않습니다. BDB 원문과 문맥을 직접 확인해 주세요.',
    }, bdbNodes);
  }

  if (lexical.code.startsWith('V')) {
    const stem = human.split(' · ')[1] || '';
    const info = STEM_INFO[stem] || null;
    const matched = info ? allRows.filter(({ node }) => stemMatches(node.text, stem)) : [];
    return withOverview({
      kind: 'verb',
      title: info ? `${info.ko}(${stem})이 의미에 주는 영향` : '동사 어간이 의미에 주는 영향',
      grammarSummary: human,
      stem,
      explanation: info?.explanation || '현재 동사 어간의 일반 기능만으로 의미를 확정하지 않고, BDB의 어휘별 stem 분기와 문맥을 함께 확인합니다.',
      sourceLabel: matched.length ? `BDB · 현재 ${stem} 관련 분기` : 'BDB · 주요 의미 분기',
      branches: matched.length ? uniqueBranches(matched) : topLevelBranches(bdbNodes),
      caution: 'Binyan은 의미 해석의 중요한 단서이지만 뜻 자체를 자동 결정하지 않습니다. 일반적인 어간 기능보다 이 어휘의 BDB stem/sense 구조를 우선합니다.',
    }, bdbNodes);
  }

  if (lexical.code.startsWith('N') || lexical.code.startsWith('A')) {
    const matched = allRows.filter(({ node }) => nominalMatches(node.text, human));
    const isPlural = /복수/.test(human);
    return withOverview({
      kind: 'nominal',
      title: '명사 형태와 BDB 의미 분기',
      grammarSummary: human,
      explanation: `${isPlural ? '현재 어형은 복수형입니다. ' : ''}명사·형용사에는 Qal/Piel 같은 Binyan이 적용되지 않습니다. 수·성·상태는 의미 판단의 문법 단서이지만, 그 형태만으로 단수적 대상·집합·강조 등의 의미를 자동 확정하지 않습니다.`,
      sourceLabel: matched.length ? 'BDB · 현재 형태와 관련된 의미 분기' : 'BDB · 주요 의미 분기',
      branches: matched.length ? uniqueBranches(matched) : topLevelBranches(bdbNodes),
      caution: '특히 복수 형태는 곧바로 “여러 개체”라는 뜻을 보장하지 않습니다. BDB의 실제 sense 분기와 이 절의 통사적 일치를 함께 확인해야 합니다.',
    }, bdbNodes);
  }

  return withOverview({
    kind: 'other',
    title: '형태와 의미 연결',
    grammarSummary: human,
    explanation: '현재 품사는 Binyan 체계의 직접 적용 대상이 아닙니다. 형태 정보는 문법 기능을 설명하고, 어휘 의미는 BDB의 sense 구조와 문맥을 통해 확인합니다.',
    sourceLabel: 'BDB · 주요 의미 분기',
    branches: topLevelBranches(bdbNodes),
    caution: '형태론과 어휘 의미를 구분하여 표시합니다. 형태 정보만으로 사전 의미를 새로 생성하지 않습니다.',
  }, bdbNodes);
}

export function hebrewStemGuidance(stem) {
  return STEM_INFO[stem] ? { stem, ...STEM_INFO[stem] } : null;
}

export function hebrewStemGuidanceList() {
  return STEM_ORDER.map((stem) => hebrewStemGuidance(stem)).filter(Boolean);
}
