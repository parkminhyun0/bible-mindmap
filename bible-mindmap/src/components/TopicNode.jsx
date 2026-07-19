import { Handle, Position, NodeResizer } from '@xyflow/react';

const resizerHandle = { width: 9, height: 9, borderRadius: 3, border: '1.5px solid #94a3b8', background: '#fff' };
const resizerLine = { borderColor: '#94a3b8', borderWidth: 1 };

export default function TopicNode({ data, selected }) {
  const fontSize = data.fontSize || 15;
  const decorations = [
    data.underline && 'underline',
    data.strikethrough && 'line-through',
  ].filter(Boolean);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
        border: '2px solid #7c3aed',
        borderRadius: 20,
        padding: '10px 18px',
        width: '100%',
        minWidth: 140,
        boxSizing: 'border-box',
        textAlign: data.textAlign || 'center',
        boxShadow: selected
          ? '0 0 0 2px #7c3aed60, 0 2px 8px rgba(124,58,237,0.2)'
          : '0 2px 8px rgba(124,58,237,0.15)',
      }}
    >
      <NodeResizer color="#7c3aed" isVisible={selected} minWidth={120} minHeight={40} handleStyle={resizerHandle} lineStyle={resizerLine} />
      <div
        style={{
          fontWeight: data.bold !== false ? 700 : 400,
          fontSize,
          color: data.textColor || '#5b21b6',
          fontStyle: data.italic ? 'italic' : 'normal',
          textDecoration: decorations.length ? decorations.join(' ') : 'none',
        }}
      >
        🏷️ {data.title}
      </div>
      {data.keywords && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
          {data.keywords.map((kw) => (
            <span
              key={kw}
              style={{
                background: '#7c3aed20',
                color: '#6d28d9',
                fontSize: Math.max(9, fontSize - 4),
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 500,
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Top} id="top" style={{ background: '#7c3aed' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#7c3aed' }} />
      <Handle type="target" position={Position.Left} style={{ background: '#7c3aed' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#7c3aed' }} />
    </div>
  );
}
