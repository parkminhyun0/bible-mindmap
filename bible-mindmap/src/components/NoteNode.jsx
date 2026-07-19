import { Handle, Position, NodeResizer } from '@xyflow/react';

const resizerHandle = { width: 9, height: 9, borderRadius: 3, border: '1.5px solid #94a3b8', background: '#fff' };
const resizerLine = { borderColor: '#94a3b8', borderWidth: 1 };

export default function NoteNode({ data, selected }) {
  const fontSize = data.fontSize || 12;
  const isHtml = data.text && data.text.includes('<');

  return (
    <div
      style={{
        background: '#fefce8',
        border: '1px dashed #ca8a04',
        borderRadius: 6,
        padding: '8px 12px',
        width: '100%',
        minWidth: 180,
        boxSizing: 'border-box',
        boxShadow: selected
          ? '0 0 0 2px #ca8a0460, 0 1px 4px rgba(0,0,0,0.1)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        fontSize,
        lineHeight: 1.5,
      }}
    >
      <NodeResizer color="#ca8a04" isVisible={selected} minWidth={160} minHeight={50} handleStyle={resizerHandle} lineStyle={resizerLine} />
      {data.title && (
        <div style={{ fontWeight: 700, fontSize: fontSize + 1, color: '#92400e', marginBottom: 4 }}>
          📝 {data.title}
        </div>
      )}
      {isHtml ? (
        <div
          className="rich-text-display"
          style={{ color: '#78350f' }}
          dangerouslySetInnerHTML={{ __html: data.text }}
        />
      ) : (
        <div style={{ color: '#78350f' }}>{data.text}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#ca8a04' }} />
      <Handle type="target" position={Position.Left} style={{ background: '#ca8a04' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#ca8a04' }} />
      <Handle type="target" position={Position.Top} id="top" style={{ background: '#ca8a04' }} />
    </div>
  );
}
