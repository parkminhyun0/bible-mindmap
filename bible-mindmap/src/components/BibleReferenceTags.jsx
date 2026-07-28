import { useCanvas } from '../context/CanvasContext';
import { parseBackgroundBibleReference } from '../utils/backgroundBibleReference';

export default function BibleReferenceTags({ tags, fontSize, palette }) {
  const canvas = useCanvas();
  if (!Array.isArray(tags) || tags.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {tags.map((tag, index) => {
        const reference = parseBackgroundBibleReference(tag);
        return (
          <button
            key={`${tag}-${index}`}
            type="button"
            className="nodrag nopan"
            disabled={!reference}
            title={reference ? `${tag} 본문 팝업으로 열기` : '본문 위치를 확인할 수 없는 태그입니다'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (reference) canvas?.onOpenBible?.(reference);
            }}
            style={{
              appearance: 'none',
              fontFamily: 'inherit',
              fontSize: Math.max(10, fontSize - 2),
              fontWeight: 700,
              background: palette.background,
              color: palette.color,
              border: `1px solid ${palette.border}`,
              borderRadius: 10,
              padding: '2px 8px',
              lineHeight: 1.6,
              cursor: reference ? 'pointer' : 'default',
              opacity: reference ? 1 : 0.65,
            }}
          >
            📖 {tag}
          </button>
        );
      })}
    </div>
  );
}
