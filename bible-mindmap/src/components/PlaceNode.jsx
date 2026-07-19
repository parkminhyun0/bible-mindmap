import { Handle, Position, NodeResizer } from '@xyflow/react';

const resizerHandle = { width: 9, height: 9, borderRadius: 3, border: '1.5px solid #94a3b8', background: '#fff' };
const resizerLine = { borderColor: '#94a3b8', borderWidth: 1 };

export default function PlaceNode({ data, selected }) {
  const fontSize = data.fontSize || 14;
  const hasCoords = data.lat != null && data.lon != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${data.lat},${data.lon}`
    : null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      border: `2px solid ${selected ? '#b45309' : '#d97706'}`,
      borderRadius: 16,
      padding: '10px 16px',
      width: '100%',
      minWidth: 160,
      boxSizing: 'border-box',
      boxShadow: selected
        ? '0 0 0 2px #b4530960, 0 2px 10px rgba(180,83,9,0.25)'
        : '0 2px 8px rgba(217,119,6,0.15)',
    }}>
      <NodeResizer color="#d97706" isVisible={selected} minWidth={140} minHeight={50} handleStyle={resizerHandle} lineStyle={resizerLine} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>📍</span>
        <span style={{ fontWeight: 700, fontSize, color: '#78350f' }}>
          {data.name || '장소'}
        </span>
      </div>

      {hasCoords && (
        <div style={{ fontSize: Math.max(9, fontSize - 3), color: '#92400e', fontWeight: 600, marginBottom: 3 }}>
          {data.lat}°N {data.lon}°E
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 6, color: '#b45309', textDecoration: 'underline' }}
              onClick={(e) => e.stopPropagation()}
            >
              지도 ↗
            </a>
          )}
        </div>
      )}

      {data.description && (
        <div style={{ fontSize: Math.max(9, fontSize - 3), color: '#374151', lineHeight: 1.4, marginTop: 2 }}>
          {data.description}
        </div>
      )}

      {data.source && (
        <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
          출처: {data.source}
        </div>
      )}

      {data.bibleTags && data.bibleTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {data.bibleTags.map((tag, i) => (
            <span key={i} style={{
              fontSize: Math.max(10, fontSize - 2), fontWeight: 700,
              background: '#fef9c3', color: '#78350f',
              border: '1px solid #fcd34d',
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
          borderTop: '1px dashed #fcd34d',
          fontSize: Math.max(9, fontSize - 3),
          color: '#1f2937',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          ✏️ {data.notes}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={{ background: '#d97706' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#d97706' }} />
      <Handle type="target" position={Position.Left} style={{ background: '#d97706' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#d97706' }} />
    </div>
  );
}
