const PILOT = {
  tokenId: 'GEN.1.1.hot.2',
  strong: 'H430',
  confidence: 0.98,
  web: {
    label: 'WEB',
    text: 'In the beginning, God created the heavens and the earth.',
    span: { start: 18, end: 21 },
  },
  krv: {
    label: '개역한글',
    text: '태초에 하나님이 천지를 창조하시니라',
    span: { start: 4, end: 8 },
    lexeme: '하나님',
    particle: '이',
  },
};

function SpanText({ source, color }) {
  const before = source.text.slice(0, source.span.start);
  const matched = source.text.slice(source.span.start, source.span.end);
  const after = source.text.slice(source.span.end);
  return (
    <span style={{ color: '#374151', overflowWrap: 'anywhere' }}>
      {before}
      <mark style={{ background: `${color}33`, color, fontWeight: 800, borderRadius: 3, padding: '0 2px' }}>{matched}</mark>
      {after}
    </span>
  );
}

export default function WordSearchAlignmentPilot({ color = '#2a78d6' }) {
  return (
    <div
      data-word-search-alignment-panel="H430"
      style={{
        marginTop: 7,
        paddingTop: 7,
        borderTop: '1px dashed #bfdbfe',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color, background: `${color}15`, border: `1px solid ${color}55`, borderRadius: 99, padding: '2px 6px' }}>
          다언어 정렬 파일럿
        </span>
        <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>{PILOT.tokenId}</span>
        <span style={{ fontSize: 9, color: '#64748b' }}>direct · {Math.round(PILOT.confidence * 100)}%</span>
      </div>
      {[PILOT.web, PILOT.krv].map((source) => (
        <div key={source.label} style={{ display: 'grid', gridTemplateColumns: '4.8em minmax(0,1fr)', gap: 6, alignItems: 'start', fontSize: 12, lineHeight: 1.55 }}>
          <span style={{ color: '#64748b', fontWeight: 800, whiteSpace: 'nowrap' }}>{source.label}</span>
          <SpanText source={source} color={color} />
        </div>
      ))}
      <div style={{ fontSize: 9, color: '#94a3b8' }}>
        KRV 어절: {PILOT.krv.lexeme} + {PILOT.krv.particle} · 저장된 span만 표시
      </div>
    </div>
  );
}
