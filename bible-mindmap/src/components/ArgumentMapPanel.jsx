import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ARGUMENT_RELATION_STYLES, getArgumentMap } from '../data/argumentMaps';
import { useContextFontHost, ContextExtraFontControl } from './ContextBibleScaffolding';

function refLabel(bookKo, chapter, node) {
  if (!node) return '';
  return `${bookKo} ${chapter}:${node.from}${node.to !== node.from ? `-${node.to}` : ''}`;
}

// 사용자 조절 텍스트 크기(구조지도 전용). 기본 1.0 = 원본. 0.85~1.75 범위. 스텝 0.1.
const MAP_SCALE_MIN = 0.85;
const MAP_SCALE_MAX = 1.75;
const MAP_SCALE_STEP = 0.1;
// UI에는 정수 (예: 10 = ×1.00, 12 = ×1.20)로 표시해 관찰카드 스테퍼와 형식 일치.
const scaleToDisplay = (s) => Math.round(s * 10);
const displayToScale = (d) => d / 10;

export default function ArgumentMapPanel({
  bookId,
  bookKo,
  chapter,
  activeVerse,
  onNavigate,
  isMobile = false,
  chapterData = null,
  genre = '',
  agenda = '',
}) {
  const map = useMemo(
    () => getArgumentMap(bookId, chapter, { bookKo, chapterData, genre, agenda }),
    [bookId, bookKo, chapter, chapterData, genre, agenda],
  );
  const [selectedRelation, setSelectedRelation] = useState(null);
  const [filter, setFilter] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);
  // 사용자 폰트 조절(구조지도) — 기본 1.15 (기존 대비 15% 크게, 특히 모바일 가독성)
  const [mapScale, setMapScale] = useState(1.15);
  const { host: fontHost, compact } = useContextFontHost();
  const bumpMapFont = (delta) => {
    setMapScale((prev) => {
      const next = Math.round((prev + delta * MAP_SCALE_STEP) * 10) / 10;
      return Math.max(MAP_SCALE_MIN, Math.min(MAP_SCALE_MAX, next));
    });
  };
  const fontControl = fontHost
    ? createPortal(
        <ContextExtraFontControl label="구조지도" value={scaleToDisplay(mapScale)} onBump={bumpMapFont} compact={compact} />,
        fontHost,
      )
    : null;
  // 폰트 스케일 헬퍼(정수 픽셀 유지).
  const fs = (n) => Math.round(n * mapScale * 10) / 10;

  useEffect(() => {
    setSelectedRelation(null);
    setFilter('all');
  }, [bookId, chapter]);

  useEffect(() => {
    const openFromVerseMarker = (event) => {
      const detail = event?.detail || {};
      if (detail.bookId !== bookId || Number(detail.chapter) !== Number(chapter)) return;
      const verse = Number(detail.verse);
      const relation = map?.relations?.find((rel) => {
        const source = map.nodes.find((node) => node.id === rel.source);
        const target = map.nodes.find((node) => node.id === rel.target);
        return [source, target].some((node) => node && verse >= node.from && verse <= node.to);
      });
      setFilter('all');
      if (relation) setSelectedRelation(relation.id);
      if (isMobile) setMobileOpen(true);
    };
    window.addEventListener('argument-map-open', openFromVerseMarker);
    return () => window.removeEventListener('argument-map-open', openFromVerseMarker);
  }, [bookId, chapter, isMobile, map]);

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
  const precisionLabel = map.precision === 'curated' ? '정밀' : '자동';

  const jump = (node) => {
    if (!node || !onNavigate) return;
    if (isMobile) setMobileOpen(false);
    requestAnimationFrame(() => onNavigate(chapter, node.from));
  };

  if (isMobile && !mobileOpen) {
    return (
      <>
        {fontControl}
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
              padding: '14px 14px 13px', cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: '#dbeafe', display: 'grid', placeItems: 'center', fontSize: fs(19), flexShrink: 0 }}>🧠</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: fs(13), fontWeight: 900, color: '#1e3a8a' }}>{map.title}</span>
                  <span style={{ fontSize: fs(9), fontWeight: 900, color: map.precision === 'curated' ? '#7c3aed' : '#1d4ed8', background: map.precision === 'curated' ? '#f3e8ff' : '#dbeafe', padding: '2px 6px', borderRadius: 99 }}>{precisionLabel}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: fs(10.5), lineHeight: 1.45, color: '#64748b' }}>
                  {map.relations.length}개 구조 관계 · 전체 화면에서 흐름과 근거를 확인합니다.
                </div>
              </div>
              <span style={{ fontSize: fs(18), color: '#2563eb', fontWeight: 900, flexShrink: 0 }}>›</span>
            </div>
          </button>
        </section>
      </>
    );
  }

  const content = (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: isMobile ? '14px 16px 11px' : '12px 13px 9px',
        borderBottom: '1px solid rgba(29,78,216,.10)',
        background: isMobile ? 'rgba(255,255,255,.99)' : undefined,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <div style={{ fontSize: fs(isMobile ? 15 : 12.5), fontWeight: 900, color: '#1e3a8a' }}>🧠 {map.title}</div>
              <span style={{ fontSize: fs(9), fontWeight: 900, color: map.precision === 'curated' ? '#7c3aed' : '#1d4ed8', background: map.precision === 'curated' ? '#f3e8ff' : '#dbeafe', padding: '2px 6px', borderRadius: 99 }}>{precisionLabel}</span>
            </div>
            <div style={{ marginTop: 4, fontSize: fs(isMobile ? 11.5 : 10.5), lineHeight: 1.55, color: '#64748b' }}>{map.summary}</div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="논증 지도 닫기"
              style={{ width: 42, height: 42, border: 0, borderRadius: 12, background: '#f1f5f9', color: '#475569', fontSize: 22, flexShrink: 0, cursor: 'pointer', touchAction: 'manipulation' }}
            >×</button>
          )}
        </div>
        <div style={{ marginTop: 7, fontSize: fs(isMobile ? 10 : 9.5), color: '#94a3b8' }}>{map.method}</div>
      </div>

      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', padding: isMobile ? '9px 14px' : '8px 10px 4px',
        WebkitOverflowScrolling: 'touch', background: isMobile ? '#f8fafc' : undefined,
        borderBottom: isMobile ? '1px solid rgba(15,23,42,.06)' : undefined,
        flexShrink: 0,
      }}>
        <button type="button" onClick={() => setFilter('all')} style={filterButton(filter === 'all', '#1d4ed8', isMobile, fs)}>전체</button>
        {relationTypes.map((type) => {
          const style = ARGUMENT_RELATION_STYLES[type];
          return <button key={type} type="button" onClick={() => setFilter(type)} style={filterButton(filter === type, style?.color, isMobile, fs)}>{style?.icon} {style?.label || type}</button>;
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
        <div style={{ padding: isMobile ? '12px 14px calc(env(safe-area-inset-bottom, 0px) + 28px)' : '8px 10px 10px' }}>
          {map.precision !== 'curated' && (
            <div style={{ marginBottom: 10, padding: '9px 10px', borderRadius: 10, background: '#fff7ed', color: '#9a3412', fontSize: fs(isMobile ? 10.5 : 9.5), lineHeight: 1.5 }}>
              자동 구조 지도 · 본문 단락과 담화 신호를 이용한 탐색용 제안입니다. 정밀 주해가 추가된 본문은 ‘정밀’로 표시됩니다.
            </div>
          )}
          {visibleRelations.map((rel, index) => {
            const source = nodeById[rel.source];
            const target = nodeById[rel.target];
            if (!source || !target) return null;
            const style = ARGUMENT_RELATION_STYLES[rel.type] || ARGUMENT_RELATION_STYLES.explanation;
            const isOpen = selectedRelation === rel.id;
            const sourceActive = activeVerse >= source.from && activeVerse <= source.to;
            const targetActive = activeVerse >= target.from && activeVerse <= target.to;
            return (
              <div key={rel.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '26px 1fr' : '1fr', gap: isMobile ? 8 : 0, marginBottom: isMobile ? 2 : 8 }}>
                {isMobile && (
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 99, background: style.color, marginTop: 17, zIndex: 1, boxShadow: `0 0 0 4px ${style.color}18` }} />
                    {index < visibleRelations.length - 1 && <div style={{ position: 'absolute', top: 27, bottom: -12, width: 2, background: `${style.color}28` }} />}
                  </div>
                )}
                <div style={{ marginBottom: isMobile ? 10 : 0 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRelation(isOpen ? null : rel.id)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%', textAlign: 'left', border: `1px solid ${style.color}28`, borderRadius: isMobile ? 12 : 10,
                      background: isOpen ? style.bg : '#fff', padding: isMobile ? '11px' : '9px 10px', cursor: 'pointer',
                      boxShadow: sourceActive || targetActive ? `0 0 0 2px ${style.color}22` : isMobile ? '0 3px 10px rgba(15,23,42,.04)' : 'none',
                      touchAction: 'manipulation',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7 }}>
                      <span style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}22`, borderRadius: 99, padding: isMobile ? '3px 8px' : '2px 7px', fontSize: fs(isMobile ? 10.5 : 9.5), fontWeight: 900 }}>{style.icon} {style.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: fs(isMobile ? 11 : 9), color: '#94a3b8' }}>{isOpen ? '▾ 닫기' : '▸ 근거 보기'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 7, alignItems: 'center' }}>
                      <NodeLabel node={source} active={sourceActive} onClick={() => jump(source)} bookKo={bookKo} chapter={chapter} isMobile={isMobile} fs={fs} />
                      <span style={{ color: style.color, fontSize: fs(isMobile ? 18 : 14), fontWeight: 900 }}>→</span>
                      <NodeLabel node={target} active={targetActive} onClick={() => jump(target)} bookKo={bookKo} chapter={chapter} isMobile={isMobile} fs={fs} />
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ marginTop: 7, padding: isMobile ? '10px' : '9px 10px', borderRadius: 11, background: '#fff', border: '1px solid rgba(15,23,42,.08)' }}>
                      <Info title="원어·담화 신호" text={rel.signal} color="#1d4ed8" bg="#eff6ff" isMobile={isMobile} fs={fs} />
                      <Info title="본문 근거" text={rel.evidence} color="#047857" bg="#ecfdf5" isMobile={isMobile} fs={fs} />
                      <Info title="구조적 의미" text={rel.meaning} color="#7c3aed" bg="#f5f3ff" isMobile={isMobile} fs={fs} />
                      <Info title="해석 주의" text={rel.caution} color="#9a3412" bg="#fff7ed" last isMobile={isMobile} fs={fs} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {fontControl}
        {createPortal(
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${map.title} 연구 화면`}
            style={{
              position: 'fixed', inset: 0, zIndex: 2147483000,
              background: '#f8fafc',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              height: '100dvh', maxHeight: '100dvh',
              overflow: 'hidden',
            }}
          >
            {content}
          </section>,
          document.body,
        )}
      </>
    );
  }

  return (
    <>
      {fontControl}
      <section style={{
        marginBottom: 14,
        border: '1px solid rgba(29,78,216,.18)',
        borderRadius: 12,
        background: 'linear-gradient(180deg,#f8fbff,#fff)',
        overflow: 'hidden',
      }}>
        {content}
      </section>
    </>
  );
}

function NodeLabel({ node, active, onClick, bookKo, chapter, isMobile = false, fs = (n) => n }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } }}
      title={`${refLabel(bookKo, chapter, node)}로 이동`}
      style={{ minWidth: 0, display: 'block', padding: isMobile ? '7px 8px' : '5px 6px', borderRadius: 8, background: active ? '#fef3c7' : '#f8fafc', border: active ? '1px solid #f59e0b55' : '1px solid rgba(15,23,42,.06)', cursor: 'pointer' }}
    >
      <span style={{ display: 'block', fontSize: fs(isMobile ? 10.5 : 9), color: active ? '#b45309' : '#64748b', fontWeight: 900 }}>{chapter}:{node.from}{node.to !== node.from ? `-${node.to}` : ''}</span>
      <span style={{ display: 'block', marginTop: 2, fontSize: fs(isMobile ? 11.5 : 10.5), lineHeight: 1.35, color: '#1e293b', fontWeight: 750 }}>{node.title}</span>
    </span>
  );
}

function Info({ title, text, color, bg, last = false, isMobile = false, fs = (n) => n }) {
  return (
    <div style={{ padding: isMobile ? '9px 10px' : '7px 8px', borderRadius: 9, background: bg, marginBottom: last ? 0 : 7 }}>
      <div style={{ fontSize: fs(isMobile ? 10.5 : 9.5), fontWeight: 900, color, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: fs(isMobile ? 11.5 : 10.5), lineHeight: 1.6, color: '#334155', userSelect: 'text', WebkitUserSelect: 'text' }}>{text}</div>
    </div>
  );
}

function filterButton(active, color = '#1d4ed8', isMobile = false, fs = (n) => n) {
  return {
    border: `1px solid ${active ? color : '#cbd5e1'}`,
    background: active ? `${color}12` : '#fff',
    color: active ? color : '#64748b',
    borderRadius: 99,
    padding: isMobile ? '6px 10px' : '4px 8px',
    fontSize: fs(isMobile ? 10.5 : 9.5),
    fontWeight: 800,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    minHeight: isMobile ? 36 : 30,
    touchAction: 'manipulation',
  };
}
