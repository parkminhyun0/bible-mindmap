import BackgroundNodeFrame from './BackgroundNodeFrame';
import BibleReferenceTags from './BibleReferenceTags';

export default function PlaceNode({ id, data, selected }) {
  const fontSize = data.fontSize || 14;
  const hasCoords = data.lat != null && data.lon != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${data.lat},${data.lon}`
    : null;

  return (
    <BackgroundNodeFrame
      id={id}
      selected={selected}
      title="장소"
      icon="📍"
      accent="#b45309"
      headerBackground="#fef3c7"
      minWidth={180}
      minHeight={70}
    >
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

      {data.region && (
        <div style={{ fontSize: Math.max(9, fontSize - 3), color: '#78350f', marginBottom: 3 }}>
          성경 지역: {data.region}
        </div>
      )}

      {data.description && (
        <div style={{ fontSize: Math.max(9, fontSize - 3), color: '#374151', lineHeight: 1.4, marginTop: 2 }}>
          {data.description}
        </div>
      )}

      {data.locationBasis && (
        <div style={{
          marginTop: 5, padding: '5px 7px', borderRadius: 6,
          fontSize: Math.max(9, fontSize - 3), lineHeight: 1.4,
          color: data.certainty === 'disputed' ? '#9a3412' : '#166534',
          background: data.certainty === 'disputed' ? '#fff7ed' : '#f0fdf4',
        }}>
          위치: {data.certainty === 'confirmed' ? '확정적' : data.certainty === 'probable' ? '유력' : '논쟁 중'}
          <div>{data.locationBasis}</div>
        </div>
      )}

      {data.source && (
        <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
          출처: {data.source}
        </div>
      )}

      <BibleReferenceTags
        tags={data.bibleTags}
        fontSize={fontSize}
        palette={{ background: '#fef9c3', color: '#78350f', border: '#fcd34d' }}
      />

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
    </BackgroundNodeFrame>
  );
}
