import { useMemo } from 'react';
import { getArgumentMap } from '../data/argumentMaps';

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
  const label = curated ? '정밀 논증 지도 노드' : '자동 구조 지도 노드';

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
      title={`${label} · ${node.title || `${chapter}:${verse}`} · 눌러서 지도 열기`}
      aria-label={`${bookKo} ${chapter}장 ${verse}절 ${label} 열기`}
      style={{
        width: isMobile ? 30 : 24,
        height: isMobile ? 30 : 24,
        minWidth: isMobile ? 30 : 24,
        minHeight: isMobile ? 30 : 24,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        borderRadius: 999,
        border: curated ? '1px solid rgba(124,58,237,.34)' : '1px solid rgba(37,99,235,.22)',
        background: curated ? 'rgba(124,58,237,.11)' : 'rgba(37,99,235,.06)',
        color: curated ? '#7c3aed' : '#2563eb',
        fontSize: isMobile ? 13 : 11,
        fontWeight: 900,
        lineHeight: 1,
        cursor: 'pointer',
        touchAction: 'manipulation',
        boxShadow: curated ? '0 0 0 2px rgba(124,58,237,.05)' : 'none',
      }}
    >
      {curated ? '🧠' : '◇'}
    </button>
  );
}
