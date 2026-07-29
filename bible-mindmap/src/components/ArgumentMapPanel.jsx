import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ARGUMENT_RELATION_STYLES, getArgumentMap } from '../data/argumentMaps';

function refLabel(bookKo, chapter, node) {
  if (!node) return '';
  return `${bookKo} ${chapter}:${node.from}${node.to !== node.from ? `-${node.to}` : ''}`;
}

export default function ArgumentMapPanel({ bookId, bookKo, chapter, activeVerse, onNavigate, isMobile = false }) {
  const map = useMemo(() => getArgumentMap(bookId, chapter), [bookId, chapter]);
  const [selectedRelation, setSelectedRelation] = useState(null);
  const [filter, setFilter] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return undefined;

    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    return () => {
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [isMobile, mobileOpen]);

  if (!map) return null;

  const nodeById = Object.fromEntries(map.nodes.map((node) => [node.id, node]));
  const visibleRelations = filter === 'all' ? map.relations : map.relations.filter((rel) => rel.type === filter);
  const relationTypes = [...new Set(map.relations.map((rel) => rel.type))];

  const jump = (node) => {
    if (!node || !onNavigate) return;
    if (isMobile) {
      setMobileOpen(false);
      window.requestAnimationFrame(() => onNavigate(chapter, node.from));
      return;
    }
    onNavigate(chapter, node.from);
  };

  if (isMobile && !mobileOpen) {
    return (
      <section style={{
        marginBottom: 12,
        border: '1px solid rgba(29,78,216,.20)',
        borderRadius: 14,
        background: 'linear-gradient(135deg,#f8fbff,#eef4ff)',
        overflow: 'hidden',
        boxShadow: '0 6px 18px rgba(30,64,175,.08)',
      }}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={`${map.title} 전체 화면으로 열기`}
          style={{
            width: '100%', border: 0, background: 'transparent', textAlign: 'left',
            padding: '14px', cursor: 'pointer', touchAction: 'manipulation', minHeight: 68,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#dbeafe', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>🧠</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#1e3a8a' }}>{map.title}</span>
                <span style={{ fontSize: 9, fontWeight: 900, color: '#1d4ed8', background: '#dbeafe', padding: '2px 6px', borderRadius: 99 }}>v1</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, color: '#64748b' }}>
                {map.relations.length}개 관계 · 탭하여 논증 흐름 전체 보기
              </div>
            </div>
            <span style={{ fontSize: 20, color: '#2563eb', fontWeight: 900, flexShrink: 0 }}>›</span>
          </div>
        </button>
      </section>
    );
  }

  const relationList = (
    <div style={{ padding: isMobile ? '12px 14px calc(env(safe-area-inset-bottom, 0px) + 24px)' : '8px 10px 10px' }}>
      {visibleRelations.map((rel, index) => {
        const source = nodeById[rel.source];
        const target = nodeById[rel.target];
        const style = ARGUMENT_RELATION_STYLES[rel.type] || ARGUMENT_RELATION_STYLES.explanation;
        const isOpen = selectedRelation === rel.id;
        const sourceActive = activeVerse >= source.from && activeVerse <= source.to;
        const targetActive = activeVerse >= target.from && activeVerse <= target.to;

        return (
          <div key={rel.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '24px minmax(0,1fr)' : '1fr', gap: isMobile ? 8 : 0 }}>
            {isMobile && (
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }} aria-hidden="true">
                <div style={{ width: 10, height: 10, borderRadius: 99, background: style.color, marginTop: 21, zIndex: 1, boxShadow: `0 0 0 4px ${style.color}18` }} />
                {index < visibleRelations.length - 1 && (
                  <div style={{ position: 'absolute', top: 31, bottom: -6, width: 2, background: `${style.color}25` }} />
                )}
              </div>
            )}

            <div style={{ marginBottom: isMobile ? 10 : 8 }}>
              <button
                type="button"
                onClick={() => setSelectedRelation(isOpen ? null : rel.id)}
                aria-expanded={isOpen}
                style={{
                  width: '100%', textAlign: 'left', border: `1px solid ${style.color}30`,
                  borderRadius: isMobile ? 14 : 10, background: isOpen ? style.bg : '#fff',
                  padding: isMobile ? '12px' : '9px 10px', cursor: 'pointer', touchAction: 'manipulation',
                  boxShadow: sourceActive || targetActive ? `0 0 0 2px ${style.color}22` : isMobile ? '0 3px 10px rgba(15,23,42,.05)' : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}25`, borderRadius: 99, padding: isMobile ? '4px 9px' : '2px 7px', fontSize: isMobile ? 11 : 9.5, fontWeight: 900 }}>
                    {style.icon} {style.label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: isMobile ? 11 : 9, color: '#64748b', fontWeight: 700 }}>
                    {isOpen ? '접기 ▲' : '근거 보기 ▼'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 24px minmax(0,1fr)', gap: 6, alignItems: 'stretch' }}>
                  <NodeLabel node={source} active={sourceActive} onClick={() => jump(source)} bookKo={bookKo} chapter={chapter} isMobile={isMobile} />
                  <span style={{ color: style.color, fontSize: isMobile ? 19 : 14, fontWeight: 900, display: 'grid', placeItems: 'center' }}>→</span>
                  <NodeLabel node={target} active={targetActive} onClick={() => jump(target)} bookKo={bookKo} chapter={chapter} isMobile={isMobile} />
                </div>
              </button>

              {isOpen && (
                <div style={{ marginTop: 7, padding: isMobile ? '10px' : '9px 10px', borderRadius: 12, background: '#fff', border: '1px solid rgba(15,23,42,.08)' }}>
                  <Info title="원어·담화 신호" text={rel.signal} color="#1d4ed8" bg="#eff6ff" isMobile={isMobile} />
                  <Info title="본문 근거" text={rel.evidence} color="#047857" bg="#ecfdf5" isMobile={isMobile} />
                  <Info title="신학적 의미" text={rel.meaning} color="#7c3aed" bg="#f5f3ff" isMobile={isMobile} />
                  <Info title="해석 주의" text={rel.caution} color="#9a3412" bg="#fff7ed" last isMobile={isMobile} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (isMobile) {
    const overlay = (
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${map.title} 연구 화면`}
        style={{
          position: 'fixed', inset: 0, zIndex: 2147483000,
          background: '#f8fafc', display: 'flex', flexDirection: 'column',
          width: '100vw', height: '100dvh', maxWidth: 'none', margin: 0,
          transform: 'none', isolation: 'isolate', overscrollBehavior: 'none',
        }}
      >
        <header style={{
          flexShrink: 0, padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px',
          background: '#fff', borderBottom: '1px solid rgba(15,23,42,.08)',
          boxShadow: '0 2px 12px rgba(15,23,42,.05)', zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#1e3a8a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🧠 {map.title}
              </div>
              <div style={{ marginTop: 2, fontSize: 10.5, color: '#64748b' }}>
                {bookKo} {chapter}장 · {map.relations.length}개 논증 관계
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="논증 지도 닫기"
              style={{
                width: 44, height: 44, border: 0, borderRadius: 12, background: '#f1f5f9',
                color: '#334155', fontSize: 23, fontWeight: 500, flexShrink: 0,
                cursor: 'pointer', touchAction: 'manipulation',
              }}
            >×</button>
          </div>
        </header>

        <nav style={{
          flexShrink: 0, display: 'flex', gap: 7, overflowX: 'auto',
          padding: '9px 14px', background: '#fff', borderBottom: '1px solid rgba(15,23,42,.07)',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }} aria-label="논증 관계 필터">
          <button type="button" onClick={() => setFilter('all')} style={filterButton(filter === 'all', '#1d4ed8', true)}>전체</button>
          {relationTypes.map((type) => {
            const style = ARGUMENT_RELATION_STYLES[type];
            return (
              <button key={type} type="button" onClick={() => setFilter(type)} style={filterButton(filter === type, style?.color, true)}>
                {style?.icon} {style?.label || type}
              </button>
            );
          })}
        </nav>

        <main style={{
          flex: '1 1 0', minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', touchAction: 'pan-y',
        }}>
          <div style={{ padding: '10px 14px 0' }}>
            <div style={{ padding: '9px 11px', borderRadius: 10, background: '#eff6ff', color: '#1e40af', fontSize: 11, lineHeight: 1.5 }}>
              카드를 눌러 근거를 펼칩니다. 절 카드를 누르면 이 화면이 닫히고 해당 본문으로 바로 이동합니다.
            </div>
          </div>
          {relationList}
        </main>
      </section>
    );

    return typeof document !== 'undefined' ? createPortal(overlay, document.body) : null;
  }

  return (
    <section style={{
      marginBottom: 14,
      border: '1px solid rgba(29,78,216,.18)',
      borderRadius: 12,
      background: 'linear-gradient(180deg,#f8fbff,#fff)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 13px 9px', borderBottom: '1px solid rgba(29,78,216,.10)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: '#1e3a8a' }}>🧠 {map.title}</div>
            <div style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.55, color: '#64748b' }}>{map.summary}</div>
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
      {relationList}
    </section>
  );
}

function NodeLabel({ node, active, onClick, bookKo, chapter, isMobile = false }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } }}
      title={`${refLabel(bookKo, chapter, node)}로 이동`}
      style={{
        minWidth: 0, display: 'block', padding: isMobile ? '8px' : '5px 6px', borderRadius: 9,
        background: active ? '#fef3c7' : '#f8fafc', border: active ? '1px solid #f59e0b55' : '1px solid rgba(15,23,42,.07)',
        cursor: 'pointer', touchAction: 'manipulation',
      }}
    >
      <span style={{ display: 'block', fontSize: isMobile ? 11 : 9, color: active ? '#b45309' : '#64748b', fontWeight: 900 }}>
        {chapter}:{node.from}{node.to !== node.from ? `-${node.to}` : ''}
      </span>
      <span style={{ display: 'block', marginTop: 2, fontSize: isMobile ? 12 : 10.5, lineHeight: 1.35, color: '#1e293b', fontWeight: 750 }}>
        {node.title}
      </span>
    </span>
  );
}

function Info({ title, text, color, bg, last = false, isMobile = false }) {
  return (
    <div style={{ padding: isMobile ? '9px 10px' : '7px 8px', borderRadius: 9, background: bg, marginBottom: last ? 0 : 7 }}>
      <div style={{ fontSize: isMobile ? 10.5 : 9.5, fontWeight: 900, color, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: isMobile ? 11.5 : 10.5, lineHeight: 1.6, color: '#334155', userSelect: 'text', WebkitUserSelect: 'text' }}>{text}</div>
    </div>
  );
}

function filterButton(active, color = '#1d4ed8', isMobile = false) {
  return {
    border: `1px solid ${active ? color : '#cbd5e1'}`,
    background: active ? `${color}12` : '#fff',
    color: active ? color : '#64748b',
    borderRadius: 99,
    padding: isMobile ? '7px 11px' : '4px 8px',
    fontSize: isMobile ? 11 : 9.5,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    minHeight: isMobile ? 38 : 30,
    touchAction: 'manipulation',
    flexShrink: 0,
  };
}
