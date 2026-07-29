import { useMemo, useState } from 'react';
import { ARGUMENT_RELATION_STYLES, getArgumentMap } from '../data/argumentMaps';

function refLabel(bookKo, chapter, node) {
  if (!node) return '';
  return `${bookKo} ${chapter}:${node.from}${node.to !== node.from ? `-${node.to}` : ''}`;
}

export default function ArgumentMapPanel({ bookId, bookKo, chapter, activeVerse, onNavigate, isMobile = false }) {
  const map = useMemo(() => getArgumentMap(bookId, chapter), [bookId, chapter]);
  const [selectedRelation, setSelectedRelation] = useState(null);
  const [filter, setFilter] = useState('all');

  if (!map) return null;

  const nodeById = Object.fromEntries(map.nodes.map((node) => [node.id, node]));
  const visibleRelations = filter === 'all' ? map.relations : map.relations.filter((rel) => rel.type === filter);
  const selected = map.relations.find((rel) => rel.id === selectedRelation) || null;
  const relationTypes = [...new Set(map.relations.map((rel) => rel.type))];

  const jump = (node) => {
    if (!node || !onNavigate) return;
    onNavigate(chapter, node.from);
  };

  return (
    <section style={{
      marginBottom: 14,
      border: '1px solid rgba(29,78,216,.18)',
      borderRadius: 12,
      background: 'linear-gradient(180deg,#f8fbff,#fff)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: isMobile ? '11px 12px 9px' : '12px 13px 9px', borderBottom: '1px solid rgba(29,78,216,.10)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: isMobile ? 12 : 12.5, fontWeight: 900, color: '#1e3a8a' }}>🧠 {map.title}</div>
            <div style={{ marginTop: 4, fontSize: isMobile ? 10.5 : 10.5, lineHeight: 1.55, color: '#64748b' }}>{map.summary}</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '3px 7px', borderRadius: 99, flexShrink: 0 }}>v1</span>
        </div>
        <div style={{ marginTop: 7, fontSize: 9.5, color: '#94a3b8' }}>{map.method}</div>
      </div>

      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', padding: '8px 10px 4px', WebkitOverflowScrolling: 'touch' }}>
        <button type="button" onClick={() => setFilter('all')} style={filterButton(filter === 'all')}>전체</button>
        {relationTypes.map((type) => {
          const style = ARGUMENT_RELATION_STYLES[type];
          return <button key={type} type="button" onClick={() => setFilter(type)} style={filterButton(filter === type, style?.color)}>{style?.icon} {style?.label || type}</button>;
        })}
      </div>

      <div style={{ padding: '8px 10px 10px' }}>
        {visibleRelations.map((rel) => {
          const source = nodeById[rel.source];
          const target = nodeById[rel.target];
          const style = ARGUMENT_RELATION_STYLES[rel.type] || ARGUMENT_RELATION_STYLES.explanation;
          const isOpen = selectedRelation === rel.id;
          const sourceActive = activeVerse >= source.from && activeVerse <= source.to;
          const targetActive = activeVerse >= target.from && activeVerse <= target.to;
          return (
            <div key={rel.id} style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedRelation(isOpen ? null : rel.id)}
                aria-expanded={isOpen}
                style={{
                  width: '100%', textAlign: 'left', border: `1px solid ${style.color}22`, borderRadius: 10,
                  background: isOpen ? style.bg : '#fff', padding: '9px 10px', cursor: 'pointer',
                  boxShadow: sourceActive || targetActive ? `0 0 0 2px ${style.color}22` : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}22`, borderRadius: 99, padding: '2px 7px', fontSize: 9.5, fontWeight: 900 }}>{style.icon} {style.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8' }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
                  <NodeLabel node={source} active={sourceActive} onClick={() => jump(source)} bookKo={bookKo} chapter={chapter} />
                  <span style={{ color: style.color, fontSize: 14, fontWeight: 900 }}>→</span>
                  <NodeLabel node={target} active={targetActive} onClick={() => jump(target)} bookKo={bookKo} chapter={chapter} />
                </div>
              </button>

              {isOpen && (
                <div style={{ marginTop: 6, padding: '9px 10px', borderRadius: 10, background: '#fff', border: '1px solid rgba(15,23,42,.08)' }}>
                  <Info title="원어·담화 신호" text={rel.signal} color="#1d4ed8" bg="#eff6ff" />
                  <Info title="본문 근거" text={rel.evidence} color="#047857" bg="#ecfdf5" />
                  <Info title="신학적 의미" text={rel.meaning} color="#7c3aed" bg="#f5f3ff" />
                  <Info title="해석 주의" text={rel.caution} color="#9a3412" bg="#fff7ed" last />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NodeLabel({ node, active, onClick, bookKo, chapter }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } }}
      title={`${refLabel(bookKo, chapter, node)}로 이동`}
      style={{ minWidth: 0, display: 'block', padding: '5px 6px', borderRadius: 7, background: active ? '#fef3c7' : '#f8fafc', border: active ? '1px solid #f59e0b55' : '1px solid rgba(15,23,42,.06)', cursor: 'pointer' }}
    >
      <span style={{ display: 'block', fontSize: 9, color: active ? '#b45309' : '#64748b', fontWeight: 800 }}>{chapter}:{node.from}{node.to !== node.from ? `-${node.to}` : ''}</span>
      <span style={{ display: 'block', marginTop: 2, fontSize: 10.5, lineHeight: 1.35, color: '#1e293b', fontWeight: 750 }}>{node.title}</span>
    </span>
  );
}

function Info({ title, text, color, bg, last = false }) {
  return (
    <div style={{ padding: '7px 8px', borderRadius: 8, background: bg, marginBottom: last ? 0 : 6 }}>
      <div style={{ fontSize: 9.5, fontWeight: 900, color, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 10.5, lineHeight: 1.55, color: '#334155', userSelect: 'text', WebkitUserSelect: 'text' }}>{text}</div>
    </div>
  );
}

function filterButton(active, color = '#1d4ed8') {
  return {
    border: `1px solid ${active ? color : '#cbd5e1'}`,
    background: active ? `${color}12` : '#fff',
    color: active ? color : '#64748b',
    borderRadius: 99,
    padding: '4px 8px',
    fontSize: 9.5,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    minHeight: 30,
  };
}
