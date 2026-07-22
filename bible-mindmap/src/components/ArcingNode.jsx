import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useCanvas } from '../context/CanvasContext';
import { ALL_BOOKS } from '../data/bibleBooks';

export default function ArcingNode({ data, selected }) {
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
    <div style={{
      background: '#fff',
      border: `2px solid ${borderColor}`,
      borderRadius: 10,
      padding: '12px 16px',
      width: 420,
      boxSizing: 'border-box',
      boxShadow: selected
        ? `0 0 0 2px ${borderColor}40, 0 4px 20px rgba(0,0,0,0.12)`
        : '0 2px 12px rgba(0,0,0,0.08)',
      fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
    }}>
      <NodeResizer color={borderColor} isVisible={selected} minWidth={320} minHeight={100}
        handleStyle={{ width: 9, height: 9, borderRadius: 3, border: '1.5px solid #94a3b8', background: '#fff' }}
        lineStyle={{ borderColor: '#94a3b8', borderWidth: 1 }} />

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

      <Handle type="source" position={Position.Right} style={{ background: borderColor }} />
      <Handle type="target" position={Position.Left}  style={{ background: borderColor }} />
    </div>
  );
}
