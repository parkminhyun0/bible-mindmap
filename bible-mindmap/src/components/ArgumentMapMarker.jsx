import { useMemo } from 'react';
import { ARGUMENT_RELATION_STYLES, getArgumentMap } from '../data/argumentMaps';

const SHORT_RELATION_LABELS = {
  conclusion: '결론',
  contrast: '대조',
  explanation: '설명',
  ground: '근거',
  extension: '확장',
  clarification: '반론',
};

export default function ArgumentMapMarker({
  bookId,
  bookKo,
  chapter,
  verse,
  chapterData,
  genre = '',
  agenda = '',
  isMobile = false,
}) {
  const map = useMemo(
    () => getArgumentMap(bookId, chapter, { bookKo, chapterData, genre, agenda }),
    [bookId, bookKo, chapter, chapterData, genre, agenda],
  );

  const node = map?.nodes?.find((item) => Number(item.from) === Number(verse));
  if (!map || !node) return null;

  const curated = map.precision === 'curated';
  const precisionLabel = curated ? '정밀 논증 지도 노드' : '자동 구조 지도 노드';
  const relation = map.relations?.find((item) => item.target === node.id)
    || map.relations?.find((item) => item.source === node.id)
    || null;
  const relationStyle = ARGUMENT_RELATION_STYLES[relation?.type] || {
    label: '구조', icon: '◆', color: '#475569', bg: '#f8fafc',
  };
  const relationLabel = SHORT_RELATION_LABELS[relation?.type] || '구조';
  const precisionIcon = curated ? '🧠' : '◇';

  const openMap = (event) => {
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent('argument-map-open', {
      detail: { bookId, chapter, verse, nodeId: node.id },
    }));
  };

  return (
    <button
      type="button"
      onClick={openMap}
      title={`${precisionLabel} · ${relationStyle.label} · ${node.title || `${chapter}:${verse}`} · 눌러서 지도 열기`}
      aria-label={`${bookKo} ${chapter}장 ${verse}절 ${precisionLabel}, ${relationStyle.label} 관계 열기`}
      style={{
        minWidth: isMobile ? 44 : 40,
        minHeight: isMobile ? 28 : 24,
        maxWidth: isMobile ? 46 : 44,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: isMobile ? '3px 4px' : '2px 4px',
        borderRadius: 999,
        border: `${curated ? 2 : 1}px solid ${relationStyle.color}${curated ? '88' : '55'}`,
        background: relationStyle.bg,
        color: relationStyle.color,
        fontSize: isMobile ? 8.5 : 8,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-.03em',
        cursor: 'pointer',
        touchAction: 'manipulation',
        boxShadow: curated
          ? `0 0 0 2px ${relationStyle.color}12, 0 2px 6px ${relationStyle.color}18`
          : `0 1px 3px ${relationStyle.color}12`,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: isMobile ? 9 : 8, lineHeight: 1 }}>{precisionIcon}</span>
      <span>{relationLabel}</span>
    </button>
  );
}
