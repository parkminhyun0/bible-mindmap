import { useCanvas } from '../context/CanvasContext';
import { ALL_BOOKS } from '../data/bibleBooks';
import BackgroundNodeFrame from './BackgroundNodeFrame';

export default function ArcingNode({ id, data, selected }) {
  const { onOpenArcing } = useCanvas() || {};
  const borderColor = data.color || '#6d28d9';
  const fontSize = data.fontSize || 11;

  // 책 한국어 이름
  const bookObj = ALL_BOOKS.find(b => b.id === data.bookId);
  const bookKo  = bookObj?.ko || data.bookId || '';
  const passageLabel = data.bookId
    ? `${bookKo} ${data.chapter}:${data.verseStart}${data.verseEnd !== data.verseStart ? `-${data.verseEnd}` : ''}절`
    : '';

  const handleOpenFull = (e) => {
    e.stopPropagation();
    if (!onOpenArcing) return;
    const passage = (data.bookId && data.chapter && data.verseStart && data.verseEnd)
      ? { bookId: data.bookId, chapter: data.chapter, verseStart: data.verseStart, verseEnd: data.verseEnd }
      : null;
    onOpenArcing(passage);
  };

  return (
    <BackgroundNodeFrame
      id={id}
      selected={selected}
      title="절 관계 다이어그램"
      icon="🧩"
      accent={borderColor}
      headerBackground="#ede9fe"
      minWidth={320}
      minHeight={100}
    >

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        borderBottom: `2px solid ${borderColor}20`, paddingBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: borderColor, flex: 1, letterSpacing: '-0.02em' }}>
          📖 {data.title || '절 관계 다이어그램 (Arcing)'}
        </span>
        {onOpenArcing && (
          <button
            className="nodrag"
            onClick={handleOpenFull}
            style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
              background: borderColor, color: '#fff', border: 'none', fontFamily: 'inherit',
              fontWeight: 700, flexShrink: 0,
            }}
          >
            ↗ 전체 화면
          </button>
        )}
      </div>

      {/* 본문 정보 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {passageLabel ? (
          <>
            <div style={{
              fontSize: fontSize + 1, fontWeight: 700, color: '#1e293b',
              fontFamily: 'inherit',
            }}>
              {passageLabel}
            </div>
            <div style={{ fontSize: fontSize - 1, color: '#64748b', lineHeight: 1.5 }}>
              wayyiqtol(★) 주동사를 감지해 절 관계를 자동으로 구성합니다.
            </div>
          </>
        ) : (
          <div style={{ fontSize: fontSize - 1, color: '#94a3b8', lineHeight: 1.5 }}>
            본문이 설정되지 않았습니다.<br />
            전체 화면을 열어 분석할 본문을 선택하세요.
          </div>
        )}

        {data.bookId && (
          <div style={{
            marginTop: 6, padding: '6px 10px',
            background: `${borderColor}10`,
            borderRadius: 6, borderLeft: `3px solid ${borderColor}`,
            fontSize: fontSize - 1, color: '#475569',
          }}>
            ↗ 전체 화면에서 절 구조 확인 · 원어 단어 분석 · 텍스트 크기 조절
          </div>
        )}
      </div>

    </BackgroundNodeFrame>
  );
}
