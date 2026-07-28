import { Handle, Position, NodeResizer } from '@xyflow/react';

const resizerHandle = { width: 9, height: 9, borderRadius: 3, border: '1.5px solid #94a3b8', background: '#fff' };
const resizerLine = { borderColor: '#94a3b8', borderWidth: 1 };

export default function PersonNode({ data, selected }) {
  const fontSize = data.fontSize || 14;
  const isHistorical = data.category === 'historical';
  const accent = isHistorical ? '#d97706' : '#059669';
  return (
    <div style={{
      background: isHistorical
        ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
        : 'linear-gradient(135deg, #dcfce7, #d1fae5)',
      border: `2px solid ${selected ? accent : (isHistorical ? '#f59e0b' : '#10b981')}`,
      borderRadius: 16,
      padding: '10px 16px',
      width: '100%',
      minWidth: 160,
      boxSizing: 'border-box',
      boxShadow: selected
        ? '0 0 0 2px #05966960, 0 2px 10px rgba(5,150,105,0.25)'
        : '0 2px 8px rgba(16,185,129,0.15)',
    }}>
      <NodeResizer color={accent} isVisible={selected} minWidth={140} minHeight={50} handleStyle={resizerHandle} lineStyle={resizerLine} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>👤</span>
        <span style={{ fontWeight: 700, fontSize, color: isHistorical ? '#92400e' : '#065f46' }}>
          {data.name || '인물'}
        </span>
      </div>

      <div style={{
        display: 'inline-block', marginBottom: 4, padding: '2px 6px', borderRadius: 8,
        fontSize: 9, fontWeight: 800,
        color: isHistorical ? '#92400e' : '#065f46',
        background: isHistorical ? '#fde68a' : '#bbf7d0',
      }}>
        {isHistorical ? '🏛️ 역사 인물 · 연대 추정' : '📖 성경 인물'}
      </div>

      {data.nameChangeNote && (
        <div style={{
          marginBottom: 5, padding: '5px 7px', borderRadius: 6,
          fontSize: Math.max(9, fontSize - 3), lineHeight: 1.4,
          color: '#3730a3', background: '#eef2ff',
        }}>
          이름 정보: {data.nameChangeNote}
          {data.nameChangeReference && <div>근거: {data.nameChangeReference}</div>}
        </div>
      )}

      {(data.birthDate || data.deathDate) && (
        <div style={{ fontSize: Math.max(9, fontSize - 3), color: '#047857', fontWeight: 600, marginBottom: 3 }}>
          {data.birthDate && data.deathDate
            ? `${data.birthDate} – ${data.deathDate}`
            : data.birthDate || data.deathDate}
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
              background: '#bbf7d0', color: '#065f46',
              border: '1px solid #6ee7b7',
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
          borderTop: '1px dashed #6ee7b7',
          fontSize: Math.max(9, fontSize - 3),
          color: '#1f2937',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          ✏️ {data.notes}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={{ background: accent }} />
      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
      <Handle type="target" position={Position.Left} style={{ background: accent }} />
      <Handle type="source" position={Position.Right} style={{ background: accent }} />
    </div>
  );
}
