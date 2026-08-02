import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';

const resizerHandle = {
  width: 9,
  height: 9,
  borderRadius: 3,
  border: '1.5px solid #94a3b8',
  background: '#fff',
};
const resizerLine = { borderColor: '#94a3b8', borderWidth: 1 };

export default function BackgroundNodeFrame({
  id,
  selected,
  title,
  icon,
  accent,
  headerBackground,
  nodeKind = 'default',
  minWidth = 160,
  minHeight = 50,
  headerActions = null,
  children,
}) {
  const { deleteElements } = useReactFlow();

  const handleClose = (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className="at-canvas-node"
      data-selected={selected ? 'true' : 'false'}
      data-node-kind={nodeKind}
      style={{
      '--at-node-accent': accent,
      '--at-node-header': headerBackground,
      background: 'var(--at-canvas-card, #fff)',
      border: `1.5px solid ${selected ? accent : '#cbd5e1'}`,
      borderRadius: 12,
      width: '100%',
      minWidth,
      boxSizing: 'border-box',
      overflow: 'hidden',
      boxShadow: selected
        ? `0 0 0 2px ${accent}35, 0 8px 24px rgba(15,23,42,0.16)`
        : '0 6px 18px rgba(15,23,42,0.12)',
    }}>
      <NodeResizer
        color={accent}
        isVisible={selected}
        minWidth={minWidth}
        minHeight={minHeight}
        handleStyle={resizerHandle}
        lineStyle={resizerLine}
      />

      <div
        className="canvas-node-drag-handle background-node-drag-handle at-canvas-node__header"
        style={{
          minHeight: 34,
          padding: '6px 8px 6px 11px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: headerBackground,
          borderBottom: `1px solid ${accent}35`,
          color: accent,
          cursor: 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        title="상단바를 드래그해 이동"
      >
        <span className="at-canvas-node__icon" aria-hidden="true">{icon}</span>
        <span className="at-canvas-node__title" style={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: '0.02em' }}>
          {title}
        </span>
        {headerActions && (
          <div className="nodrag nopan at-canvas-node__header-actions" style={{ display: 'flex', alignItems: 'center' }}>
            {headerActions}
          </div>
        )}
        <span className="at-canvas-node__move" style={{ fontSize: 10, opacity: 0.62 }}>⋮⋮ 이동</span>
        <button
          type="button"
          className="nodrag nopan at-canvas-node__close"
          onClick={handleClose}
          aria-label={`${title} 카드 닫기`}
          title="카드 삭제"
          style={{
            width: 24,
            height: 24,
            padding: 0,
            display: 'grid',
            placeItems: 'center',
            border: 'none',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.72)',
            color: accent,
            fontSize: 16,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <div
        className="nodrag nopan at-canvas-node__body"
        style={{
          padding: '10px 14px 12px',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          cursor: 'text',
        }}
        title="본문 텍스트를 선택해 복사할 수 있습니다"
      >
        {children}
      </div>

      <Handle className="at-canvas-node__handle" type="target" position={Position.Top} style={{ background: accent }} />
      <Handle className="at-canvas-node__handle" type="source" position={Position.Bottom} style={{ background: accent }} />
      <Handle className="at-canvas-node__handle" type="target" position={Position.Left} style={{ background: accent }} />
      <Handle className="at-canvas-node__handle" type="source" position={Position.Right} style={{ background: accent }} />
    </div>
  );
}
