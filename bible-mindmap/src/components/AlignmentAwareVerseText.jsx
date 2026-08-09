import { useEffect, useMemo, useState } from 'react';
import {
  loadVerseAlignment,
  occurrenceOrdinalForRow,
  resolveVerseTokenId,
} from '../utils/alignmentLoader.js';

function buildParts(text, spans) {
  const ordered = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const parts = [];
  let cursor = 0;
  ordered.forEach((span, index) => {
    if (span.start < cursor) return;
    if (span.start > cursor) parts.push({ key: `plain-${index}`, highlighted: false, text: text.slice(cursor, span.start) });
    parts.push({ key: `mark-${index}`, highlighted: true, text: text.slice(span.start, span.end) });
    cursor = span.end;
  });
  if (cursor < text.length) parts.push({ key: 'plain-last', highlighted: false, text: text.slice(cursor) });
  return parts;
}

export default function AlignmentAwareVerseText({
  enabled,
  row,
  rows,
  text,
  color,
  fallbackNode,
  targetLanguage = 'korean',
}) {
  const [resolution, setResolution] = useState({ status: 'idle' });
  const occurrenceOrdinal = useMemo(
    () => occurrenceOrdinalForRow(row, rows),
    [row, rows]
  );

  useEffect(() => {
    if (!enabled || !row?.word || !text) {
      setResolution({ status: 'disabled' });
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setResolution({ status: 'loading' });

    (async () => {
      const tokenId = await resolveVerseTokenId({
        bookId: row.bookId,
        chapter: row.chapter,
        verse: row.verse,
        word: row.word,
        occurrenceOrdinal,
        signal: controller.signal,
      });
      if (!tokenId) return { status: 'missing-token-id' };
      return loadVerseAlignment({
        bookId: row.bookId,
        chapter: row.chapter,
        verse: row.verse,
        tokenId,
        currentSurface: String(row.word.w || '').replace(/\//g, ''),
        targetLanguage,
        verseText: text,
        signal: controller.signal,
      });
    })()
      .then((next) => { if (active) setResolution(next); })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') return;
        setResolution({ status: 'loader-error', error: String(error?.message || error) });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, occurrenceOrdinal, row, targetLanguage, text]);

  if (resolution.status !== 'ready') {
    return <span data-alignment-loader-status={resolution.status}>{fallbackNode}</span>;
  }

  const spans = resolution.target?.spans || [];
  const parts = buildParts(text, spans);
  return (
    <span
      data-alignment-loader-status="ready"
      data-token-id={resolution.tokenId}
      data-alignment-status={resolution.record?.status}
      data-alignment-source={resolution.sourcePath}
      style={{ color: '#374151' }}
    >
      {parts.map((part) => part.highlighted
        ? (
          <mark key={part.key} style={{
            background: `${color}33`,
            color,
            fontWeight: 700,
            borderRadius: 2,
            padding: '0 1px',
          }}>
            {part.text}
          </mark>
        )
        : <span key={part.key}>{part.text}</span>)}
    </span>
  );
}
