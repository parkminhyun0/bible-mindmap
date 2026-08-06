import { lazy, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';
import useMobile from '../hooks/useMobile.js';
import ResearchFlowBackButton from './ResearchFlowBackButton.jsx';

const CanonicalConceptModal = lazy(() => import('./CanonicalConceptModal.jsx'));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getInitialWindowState() {
  if (typeof window === 'undefined') {
    return { position: { x: 220, y: 80 }, size: { width: 760, height: 720 } };
  }
  const width = Math.min(760, Math.max(440, window.innerWidth - 48));
  const height = Math.min(720, Math.max(420, window.innerHeight - 64));
  return {
    position: {
      x: Math.max(16, Math.round((window.innerWidth - width) / 2)),
      y: Math.max(16, Math.round((window.innerHeight - height) / 2)),
    },
    size: { width, height },
  };
}

function JourneyPreview({ concept, accent, isMobile, fontSizes }) {
  const stages = Array.isArray(concept.canonicalArc) ? concept.canonicalArc.slice(0, 4) : [];
  const remaining = Math.max(0, (concept.canonicalArc?.length || 0) - stages.length);

  if (!stages.length) return null;

  return (
    <div
      aria-label={`${concept.labelKo} 정경 여정 ${concept.canonicalArc.length}단계`}
      style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--at-separator)' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        marginBottom: 7, fontSize: Math.max(10, fontSizes.category - 1), color: 'var(--at-label-3)',
      }}>
        <span style={{ fontWeight: 800, letterSpacing: '.02em' }}>정경 여정</span>
        <span>{concept.canonicalArc.length}단계</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length + (remaining ? 1 : 0)}, minmax(0, 1fr))`,
        alignItems: 'start', gap: 4,
      }}>
        {stages.map((stage, index) => (
          <div key={`${stage.ref}-${index}`} style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
              {index > 0 && <span aria-hidden="true" style={{ flex: 1, height: 2, background: `${accent}55` }} />}
              <span aria-hidden="true" style={{
                width: isMobile ? 9 : 8, height: isMobile ? 9 : 8, borderRadius: '50%',
                background: accent, boxShadow: `0 0 0 3px ${accent}18`, flexShrink: 0,
              }} />
              {index < stages.length - 1 || remaining > 0
                ? <span aria-hidden="true" style={{ flex: 1, height: 2, background: `${accent}55` }} />
                : <span style={{ flex: 1 }} />}
            </div>
            <div style={{
              fontSize: Math.max(9.5, fontSizes.body - 2.5), lineHeight: 1.25,
              color: 'var(--at-label-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }} title={stage.stage}>
              {stage.stage}
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
              <span aria-hidden="true" style={{ flex: 1, height: 2, background: `${accent}55` }} />
              <span aria-hidden="true" style={{
                minWidth: 22, height: 16, padding: '0 4px', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: `${accent}18`, color: accent, fontSize: 9, fontWeight: 800,
              }}>+{remaining}</span>
              <span style={{ flex: 1 }} />
            </div>
            <div style={{ fontSize: Math.max(9.5, fontSizes.body - 2.5), color: 'var(--at-label-3)' }}>완성까지</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CanonicalConceptStaticSearchEntry({ onClose }) {
  const isMobile = useMobile();
  const initial = useMemo(getInitialWindowState, []);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [position, setPosition] = useState(initial.position);
  const [size, setSize] = useState(initial.size);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [fontSizes, setFontSizes] = useState({ title: 18, category: 12, body: 13 });
  const results = useMemo(() => searchCanonicalConceptsStatic(query, { limit: 12 }), [query]);

  const returnToSearch = () => {
    setSelected(null);
    setShowBrowser(false);
  };

  const bumpFont = (key, delta) => {
    const limits = key === 'title' ? [15, 25] : key === 'category' ? [10, 18] : [11, 20];
    setFontSizes((current) => ({
      ...current,
      [key]: clamp(current[key] + delta, limits[0], limits[1]),
    }));
  };

  const startDrag = (event) => {
    if (isMobile || maximized || event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    const origin = { clientX: event.clientX, clientY: event.clientY, ...position };
    const onMove = (moveEvent) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      setPosition({
        x: clamp(origin.x + moveEvent.clientX - origin.clientX, 8, Math.max(8, viewportWidth - size.width - 8)),
        y: clamp(origin.y + moveEvent.clientY - origin.clientY, 8, Math.max(8, viewportHeight - (minimized ? 64 : size.height) - 8)),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const startResize = (event) => {
    if (isMobile || maximized || minimized || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const origin = { clientX: event.clientX, clientY: event.clientY, ...size };
    const onMove = (moveEvent) => {
      setSize({
        width: clamp(origin.width + moveEvent.clientX - origin.clientX, 440, Math.max(440, window.innerWidth - position.x - 8)),
        height: clamp(origin.height + moveEvent.clientY - origin.clientY, 380, Math.max(380, window.innerHeight - position.y - 8)),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  if (selected || showBrowser) {
    const selectedLabel = selected ? CANONICAL_CONCEPTS[selected]?.labelKo : '전체 개념';
    return (
      <>
        <Suspense fallback={<div className="deferred-feature-loading">정경 추적 개념을 불러오는 중…</div>}>
          <CanonicalConceptModal initialConcept={selected} onClose={returnToSearch} />
        </Suspense>
        {createPortal(
          <ResearchFlowBackButton
            onBack={returnToSearch}
            label="정경 추적 검색으로 돌아가기"
            compact={isMobile}
            style={{
              position: 'fixed',
              zIndex: 1295,
              left: isMobile ? 12 : 20,
              top: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : 18,
            }}
          />,
          document.body,
        )}
        <span className="sr-only" aria-live="polite">{selectedLabel} 상세 화면</span>
      </>
    );
  }

  const panelStyle = isMobile
    ? {
        inset: 'auto 0 0 0', width: '100%', height: '86dvh', maxHeight: '86dvh',
        borderRadius: '18px 18px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }
    : maximized
      ? { inset: 10, width: 'auto', height: 'auto', borderRadius: 16 }
      : {
          left: position.x, top: position.y, width: size.width,
          height: minimized ? 'auto' : size.height, borderRadius: 18,
        };

  const iconButtonStyle = {
    minWidth: 40, minHeight: 40, border: '1px solid rgba(255,255,255,.14)',
    borderRadius: 10, background: 'rgba(255,255,255,.10)', color: '#fff',
    fontSize: 17, fontWeight: 800, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="정경 추적 · 정적 의미 검색"
      style={{
        position: 'fixed', zIndex: 1260, ...panelStyle,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: isMobile ? 'none' : '1px solid var(--at-separator)',
        background: 'var(--at-bg)', color: 'var(--at-label)', boxShadow: 'var(--at-shadow-xl)',
      }}
    >
      <header
        onPointerDown={startDrag}
        style={{
          padding: '12px 14px', background: 'linear-gradient(135deg,#1a1830,#2c2748)', color: '#fff',
          cursor: !isMobile && !maximized ? 'grab' : 'default', userSelect: 'none', flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: fontSizes.title, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🧭 정경 추적 검색
            </div>
            {!minimized && (
              <div style={{ marginTop: 3, fontSize: fontSizes.category, opacity: 0.78, lineHeight: 1.35 }}>
                서버·AI 호출 없이 브라우저에서 검색합니다. 각 카드에서 정경 여정을 미리 확인할 수 있습니다.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!isMobile && (
              <>
                <button type="button" onClick={() => setMinimized((value) => !value)} aria-label={minimized ? '펼치기' : '축소'} title={minimized ? '펼치기' : '축소'} style={iconButtonStyle}>
                  {minimized ? '▢' : '—'}
                </button>
                <button type="button" onClick={() => { setMaximized((value) => !value); setMinimized(false); }} aria-label={maximized ? '창 모드' : '전체화면'} title={maximized ? '창 모드' : '전체화면'} style={iconButtonStyle}>
                  {maximized ? '❐' : '⛶'}
                </button>
              </>
            )}
            <button type="button" onClick={onClose} aria-label="닫기" title="닫기" style={iconButtonStyle}>×</button>
          </div>
        </div>
      </header>

      {!minimized && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', flexShrink: 0,
            overflowX: 'auto', borderBottom: '1px solid var(--at-separator)', background: 'var(--at-surface-2)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--at-accent-text)', paddingRight: 2 }}>Aa</span>
            {[
              ['title', '타이틀'], ['category', '분류텍스트'], ['body', '본문'],
            ].map(([key, label]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
                border: '1px solid var(--at-separator)', borderRadius: 10, padding: '2px 4px', background: 'var(--at-surface)',
              }}>
                <span style={{ padding: '0 4px', fontSize: 10, fontWeight: 700, color: 'var(--at-label-2)' }}>{label}</span>
                <button type="button" onClick={() => bumpFont(key, -1)} aria-label={`${label} 글자 작게`} style={{ minWidth: 30, minHeight: 30, border: 0, borderRadius: 7, background: 'transparent', color: 'var(--at-label)', cursor: 'pointer', fontWeight: 800 }}>−</button>
                <span style={{ minWidth: 22, textAlign: 'center', fontSize: 11, fontWeight: 800 }}>{fontSizes[key]}</span>
                <button type="button" onClick={() => bumpFont(key, 1)} aria-label={`${label} 글자 크게`} style={{ minWidth: 30, minHeight: 30, border: 0, borderRadius: 7, background: 'transparent', color: 'var(--at-label)', cursor: 'pointer', fontWeight: 800 }}>+</button>
              </div>
            ))}
          </div>

          <div style={{ padding: 16, overflow: 'auto', flex: 1, minHeight: 0, WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <input
              autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="개념 검색 · 예: 왕적 제사장, 성전 임재, H2233"
              aria-label="정경 개념 의미 검색"
              style={{
                width: '100%', minHeight: 48, boxSizing: 'border-box', padding: '0 14px',
                border: '1px solid var(--at-separator)', borderRadius: 12,
                background: 'var(--at-surface)', color: 'var(--at-label)', fontSize: fontSizes.body,
              }}
            />

            <div style={{ margin: '12px 2px', fontSize: fontSizes.category, color: 'var(--at-label-3)', lineHeight: 1.45 }}>
              {query.trim() ? `${results.length}개 관련 개념` : '추천 개념 12개'} · 한글·히브리어·헬라어·Strong·정경 흐름·신학 앵커 검색 · 각 카드에서 정경 여정의 대표 단계를 미리 볼 수 있습니다.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile || (!maximized && size.width < 620) ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {results.map((id) => {
                const concept = CANONICAL_CONCEPTS[id];
                const category = CONCEPT_CATEGORIES[concept.category];
                const accent = category?.color || 'var(--at-accent)';
                return (
                  <button
                    type="button" key={id} onClick={() => setSelected(id)}
                    aria-label={`${concept.labelKo} 정경 여정 상세 열기`}
                    style={{
                      minHeight: 142, padding: 13, textAlign: 'left', cursor: 'pointer',
                      border: '1px solid var(--at-separator)', borderRadius: 13,
                      background: 'var(--at-surface)', color: 'var(--at-label)', touchAction: 'manipulation',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: fontSizes.title + 3 }}>{concept.emoji}</span>
                      <strong style={{ fontSize: Math.max(14, fontSizes.body + 2) }}>{concept.labelKo}</strong>
                      <span style={{
                        marginLeft: 'auto', padding: '2px 7px', borderRadius: 999,
                        background: `${accent}18`, color: accent, fontSize: Math.max(10, fontSizes.category - 2), fontWeight: 800,
                      }}>{category?.ko}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: fontSizes.body, color: 'var(--at-label-2)', lineHeight: 1.45 }}>
                      {[concept.strong?.he, concept.strong?.gr].filter(Boolean).join(' · ')}
                    </div>
                    <JourneyPreview concept={concept} accent={accent} isMobile={isMobile} fontSizes={fontSizes} />
                  </button>
                );
              })}
            </div>

            {query.trim() && results.length === 0 && (
              <div role="status" style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--at-label-3)', fontSize: fontSizes.body }}>
                관련 개념을 찾지 못했습니다. 개념명·원어·Strong 번호·신학 주제를 바꾸어 검색해 보세요.
              </div>
            )}

            <button
              type="button" onClick={() => setShowBrowser(true)} aria-label="전체 정경 추적 개념 브라우저 열기"
              style={{
                width: '100%', minHeight: 46, marginTop: 14, border: '1px solid var(--at-separator)',
                borderRadius: 12, background: 'var(--at-surface-2)', color: 'var(--at-label)',
                fontWeight: 700, fontSize: fontSizes.body, cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              전체 정경 추적 개념 둘러보기
            </button>
          </div>
        </>
      )}

      {!isMobile && !maximized && !minimized && (
        <div
          role="separator" aria-label="정경 추적 검색 창 크기 조절" onPointerDown={startResize}
          style={{
            position: 'absolute', right: 0, bottom: 0, width: 24, height: 24,
            cursor: 'nwse-resize', touchAction: 'none',
            background: 'linear-gradient(135deg, transparent 45%, var(--at-label-3) 46%, var(--at-label-3) 52%, transparent 53%, transparent 62%, var(--at-label-3) 63%, var(--at-label-3) 69%, transparent 70%)',
          }}
        />
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
