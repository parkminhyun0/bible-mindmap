import { useMemo } from 'react';
import { KOREAN_GLOSS } from '../data/koreanGloss.js';
import { normalizeStrongId, resolveHighlightSpans } from '../utils/translationAlignment.js';

function buildParts(text, spans) {
  const parts = [];
  let cursor = 0;
  spans.forEach((span, index) => {
    if (span.start > cursor) parts.push({ key: `plain-${index}`, highlighted: false, text: text.slice(cursor, span.start) });
    parts.push({ key: `mark-${index}`, highlighted: true, text: text.slice(span.start, span.end) });
    cursor = span.end;
  });
  if (cursor < text.length) parts.push({ key: 'plain-last', highlighted: false, text: text.slice(cursor) });
  return parts;
}

export default function AlignedHighlightText({
  text,
  language,
  entry,
  userQuery = '',
  alignmentRecord = null,
  color = '#1d4ed8',
  dir = 'ltr',
  fontFamily,
  fallback = '(본문 없음)',
  showUnresolved = false,
}) {
  const strong = normalizeStrongId(entry?.s);
  const dictionaryEntry = strong ? KOREAN_GLOSS[strong] || null : null;
  const resolution = useMemo(
    () => resolveHighlightSpans({ text, language, entry, dictionaryEntry, userQuery, alignmentRecord }),
    [text, language, entry, dictionaryEntry, userQuery, alignmentRecord]
  );

  const baseStyle = { color: '#374151', direction: dir, ...(fontFamily ? { fontFamily } : {}) };
  if (!text) return <span style={{ color: '#94a3b8' }}>{fallback}</span>;
  const parts = buildParts(text, resolution.spans);

  return (
    <span
      style={baseStyle}
      data-alignment-status={resolution.status}
      data-alignment-source={resolution.source}
      title={showUnresolved && resolution.status === 'unresolved' ? '사전 후보와 본문 정렬이 확정되지 않아 임의로 표시하지 않았습니다.' : undefined}
    >
      {parts.map(part => part.highlighted
        ? <mark key={part.key} style={{ background: `${color}33`, color, fontWeight: 700, borderRadius: 2, padding: '0 1px' }}>{part.text}</mark>
        : <span key={part.key}>{part.text}</span>
      )}
      {showUnresolved && resolution.status === 'unresolved' && (
        <span aria-label="정렬 미확정" style={{ marginLeft: 5, color: '#94a3b8', fontSize: '0.75em' }}>정렬 미확정</span>
      )}
    </span>
  );
}
