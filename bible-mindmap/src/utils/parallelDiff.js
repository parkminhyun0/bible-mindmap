function stripHtml(value) {
  let cleaned = String(value || '')
    .replace(/<span[^>]*>\s*\d+\s*<\/span>/gi, ' ');
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  } while (cleaned !== prev);
  return cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeToken(token) {
  return String(token || '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function tokenizeParallelText(value) {
  const text = stripHtml(value);
  if (!text) return [];

  const tokens = text.match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)?|[^\s]/gu) || [];
  return tokens.map((textToken, index) => ({
    id: `${index}:${textToken}`,
    text: textToken,
    normalized: normalizeToken(textToken),
    lexical: /[\p{L}\p{N}]/u.test(textToken),
  }));
}

function lcsPairs(left, right, maxTokens = 260) {
  const a = left.filter((token) => token.lexical).slice(0, maxTokens);
  const b = right.filter((token) => token.lexical).slice(0, maxTokens);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => new Uint16Array(cols));

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i].normalized && a[i].normalized === b[j].normalized
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].normalized && a[i].normalized === b[j].normalized) {
      pairs.push([a[i].id, b[j].id]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return {
    pairs,
    lcsLength: pairs.length,
    leftLexical: a.length,
    rightLexical: b.length,
    truncated: left.filter((token) => token.lexical).length > maxTokens
      || right.filter((token) => token.lexical).length > maxTokens,
  };
}

function lexicalFrequency(tokens) {
  const map = new Map();
  for (const token of tokens) {
    if (!token.lexical || !token.normalized) continue;
    map.set(token.normalized, (map.get(token.normalized) || 0) + 1);
  }
  return map;
}

export function compareParallelTexts(anchorText, comparisonText, options = {}) {
  const anchorTokens = tokenizeParallelText(anchorText);
  const comparisonTokens = tokenizeParallelText(comparisonText);
  const result = lcsPairs(anchorTokens, comparisonTokens, options.maxTokens || 260);
  const anchorMatched = new Set(result.pairs.map(([id]) => id));
  const comparisonMatched = new Set(result.pairs.map(([, id]) => id));
  const anchorFreq = lexicalFrequency(anchorTokens);
  const comparisonFreq = lexicalFrequency(comparisonTokens);

  const renderedComparison = comparisonTokens.map((token) => {
    if (!token.lexical) return { ...token, status: 'punctuation' };
    if (comparisonMatched.has(token.id)) return { ...token, status: 'common' };
    if (anchorFreq.has(token.normalized)) return { ...token, status: 'moved' };
    return { ...token, status: 'addition' };
  });

  const omissions = anchorTokens
    .filter((token) => token.lexical && !anchorMatched.has(token.id) && !comparisonFreq.has(token.normalized))
    .map((token) => token.text);

  const movedFromAnchor = anchorTokens
    .filter((token) => token.lexical && !anchorMatched.has(token.id) && comparisonFreq.has(token.normalized))
    .map((token) => token.text);

  const additions = renderedComparison
    .filter((token) => token.status === 'addition')
    .map((token) => token.text);

  const moved = renderedComparison
    .filter((token) => token.status === 'moved')
    .map((token) => token.text);

  const denominator = result.leftLexical + result.rightLexical;
  const similarity = denominator
    ? Math.round((2 * result.lcsLength / denominator) * 100)
    : 0;

  return {
    anchorTokens,
    comparisonTokens: renderedComparison,
    omissions,
    additions,
    moved,
    movedFromAnchor,
    commonCount: result.lcsLength,
    similarity,
    truncated: result.truncated,
  };
}

export function canCompareOriginalLanguages(anchorBookId, comparisonBookId, isOT) {
  return isOT(anchorBookId) === isOT(comparisonBookId);
}

export const PARALLEL_DIFF_LEGEND = [
  { id: 'common', label: '공통', description: '기준 본문과 같은 순서로 대응되는 어휘' },
  { id: 'addition', label: '추가', description: '비교 본문에만 나타나는 어휘' },
  { id: 'omission', label: '생략', description: '기준 본문에는 있으나 비교 본문에서 확인되지 않는 어휘' },
  { id: 'moved', label: '어순', description: '양쪽에 있으나 LCS 대응 순서에서 벗어난 어휘' },
];
