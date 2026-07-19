import { Handle, Position, NodeResizer } from '@xyflow/react';

const resizerHandle = { width: 9, height: 9, borderRadius: 3, border: '1.5px solid #94a3b8', background: '#fff' };
const resizerLine = { borderColor: '#94a3b8', borderWidth: 1 };

const CERTAINTY_STYLE = {
  confirmed: { label: '★확정', color: '#1d4ed8', bg: '#dbeafe' },
  estimated: { label: '추정',  color: '#6d28d9', bg: '#ede9fe' },
  debated:   { label: '논쟁',  color: '#b45309', bg: '#fef3c7' },
};

export default function PeriodNode({ data, selected }) {
  const fontSize = data.fontSize || 14;
  const cert = CERTAINTY_STYLE[data.certainty] || CERTAINTY_STYLE.estimated;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
      border: `2px solid ${selected ? '#4338ca' : '#6d28d9'}`,
      borderRadius: 16,
      padding: '10px 16px',
      width: '100%',
      minWidth: 180,
      boxSizing: 'border-box',
      boxShadow: selected
        ? '0 0 0 2px #4338ca60, 0 2px 10px rgba(67,56,202,0.25)'
        : '0 2px 8px rgba(109,40,217,0.15)',
    }}>
      <NodeResizer color="#6d28d9" isVisible={selected} minWidth={160} minHeight={60} handleStyle={resizerHandle} lineStyle={resizerLine} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>🕰️</span>
        <span style={{ fontWeight: 700, fontSize, color: '#3730a3', flex: 1 }}>
          {data.name || '시대'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: cert.color, background: cert.bg,
          padding: '2px 5px', borderRadius: 4,
        }}>
          {cert.label}
        </span>
      </div>

      {data.range && (
        <div style={{ fontSize: Math.max(9, fontSize - 3), color: '#4338ca', fontWeight: 600, marginBottom: 4 }}>
          {data.range}
        </div>
      )}

      {data.events && data.events.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 14, fontSize: Math.max(9, fontSize - 3), color: '#374151', lineHeight: 1.6 }}>
          {data.events.map((ev, i) => (
            <li key={i}>{ev}</li>
          ))}
        </ul>
      )}

      {data.bibleTags && data.bibleTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {data.bibleTags.map((tag, i) => (
            <span key={i} style={{
              fontSize: Math.max(10, fontSize - 2), fontWeight: 700,
              background: '#ede9fe', color: '#3730a3',
              border: '1px solid #c4b5fd',
              borderRadius: 10, padding: '2px 8px',
              lineHeight: 1.6,
            }}>📖 {tag}</span>
          ))}
        </div>
      )}

      {data.notes && (
        <div style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px dashed #c4b5fd',
          fontSize: Math.max(9, fontSize - 3),
          color: '#1f2937',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          ✏️ {data.notes}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={{ background: '#6d28d9' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#6d28d9' }} />
      <Handle type="target" position={Position.Left} style={{ background: '#6d28d9' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#6d28d9' }} />
    </div>
  );
}
