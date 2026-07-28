import BackgroundNodeFrame from './BackgroundNodeFrame';

export default function TopicNode({ id, data, selected }) {
  const fontSize = data.fontSize || 15;
  const decorations = [
    data.underline && 'underline',
    data.strikethrough && 'line-through',
  ].filter(Boolean);

  return (
    <BackgroundNodeFrame
      id={id}
      selected={selected}
      title="주제"
      icon="🏷️"
      accent="#7c3aed"
      headerBackground="#ede9fe"
      minWidth={140}
      minHeight={40}
    >
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
    </BackgroundNodeFrame>
  );
}
