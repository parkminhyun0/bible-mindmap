import BackgroundNodeFrame from './BackgroundNodeFrame';

export default function NoteNode({ id, data, selected }) {
  const fontSize = data.fontSize || 12;
  const isHtml = data.text && data.text.includes('<');

  return (
    <BackgroundNodeFrame
      id={id}
      selected={selected}
      title="메모"
      icon="📝"
      accent="#ca8a04"
      headerBackground="#fef9c3"
      minWidth={180}
      minHeight={50}
    >
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
    </BackgroundNodeFrame>
  );
}
