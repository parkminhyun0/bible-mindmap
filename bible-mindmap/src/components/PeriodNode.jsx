import BackgroundNodeFrame from './BackgroundNodeFrame';

const CERTAINTY_STYLE = {
  confirmed: { label: '★확정', color: '#1d4ed8', bg: '#dbeafe' },
  estimated: { label: '추정',  color: '#6d28d9', bg: '#ede9fe' },
  debated:   { label: '논쟁',  color: '#b45309', bg: '#fef3c7' },
};

export default function PeriodNode({ id, data, selected }) {
  const fontSize = data.fontSize || 14;
  const cert = CERTAINTY_STYLE[data.certainty] || CERTAINTY_STYLE.estimated;

  return (
    <BackgroundNodeFrame
      id={id}
      selected={selected}
      title="시대"
      icon="🕰️"
      accent="#6d28d9"
      headerBackground="#ede9fe"
      minWidth={190}
      minHeight={80}
    >
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
    </BackgroundNodeFrame>
  );
}
