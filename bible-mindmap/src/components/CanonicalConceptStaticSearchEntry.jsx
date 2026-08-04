import { lazy, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';
import useMobile from '../hooks/useMobile.js';

const CanonicalConceptModal = lazy(() => import('./CanonicalConceptModal.jsx'));

function JourneyPreview({ concept, accent, isMobile }) {
  const stages = Array.isArray(concept.canonicalArc) ? concept.canonicalArc.slice(0, 4) : [];
  const remaining = Math.max(0, (concept.canonicalArc?.length || 0) - stages.length);

  if (!stages.length) return null;

  return (
    <div
      aria-label={`${concept.labelKo} 정경 여정 ${concept.canonicalArc.length}단계`}
      style={{
        marginTop: 10,
        paddingTop: 9,
        borderTop: '1px solid var(--at-separator)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        marginBottom: 7, fontSize: 10.5, color: 'var(--at-label-3)',
      }}>
        <span style={{ fontWeight: 800, letterSpacing: '.02em' }}>정경 여정</span>
        <span>{concept.canonicalArc.length}단계</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length + (remaining ? 1 : 0)}, minmax(0, 1fr))`,
        alignItems: 'start',
        gap: 4,
      }}>
        {stages.map((stage, index) => (
          <div key={`${stage.ref}-${index}`} style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
              {index > 0 && <span aria-hidden="true" style={{ flex: 1, height: 2, background: `${accent}55` }} />}
              <span aria-hidden="true" style={{
                width: isMobile ? 9 : 8,
                height: isMobile ? 9 : 8,
                borderRadius: '50%',
                background: accent,
                boxShadow: `0 0 0 3px ${accent}18`,
                flexShrink: 0,
              }} />
              {index < stages.length - 1 || remaining > 0
                ? <span aria-hidden="true" style={{ flex: 1, height: 2, background: `${accent}55` }} />
                : <span style={{ flex: 1 }} />}
            </div>
            <div style={{
              fontSize: 9.5,
              lineHeight: 1.25,
              color: 'var(--at-label-2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
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
            <div style={{ fontSize: 9.5, color: 'var(--at-label-3)' }}>완성까지</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CanonicalConceptStaticSearchEntry({ onClose }) {
  const isMobile = useMobile();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const results = useMemo(() => searchCanonicalConceptsStatic(query, { limit: 12 }), [query]);

  if (selected || showBrowser) {
    return (
      <Suspense fallback={<div className="deferred-feature-loading">정경 추적 개념을 불러오는 중…</div>}>
        <CanonicalConceptModal initialConcept={selected} onClose={onClose} />
      </Suspense>
    );
  }

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="정경 추적 · 정적 의미 검색"
      style={{
        position: 'fixed',
        zIndex: 1260,
        inset: isMobile ? 'auto 0 0 0' : '50% auto auto 50%',
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        width: isMobile ? '100%' : 'min(760px, calc(100vw - 40px))',
        maxHeight: isMobile ? '86vh' : 'min(760px, calc(100vh - 48px))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: isMobile ? '18px 18px 0 0' : 18,
        border: '1px solid var(--at-separator)',
        background: 'var(--at-bg)',
        color: 'var(--at-label)',
        boxShadow: 'var(--at-shadow-xl)',
      }}
    >
      <header style={{ padding: '18px 18px 14px', background: 'linear-gradient(135deg,#1a1830,#2c2748)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>🧭 정경 추적 검색</div>
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78 }}>서버·AI 호출 없이 브라우저에서 검색합니다. 각 카드에서 정경 여정을 미리 확인할 수 있습니다.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ minWidth: 44, minHeight: 44, border: 0, borderRadius: 10, background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
      </header>

      <div style={{ padding: 16, overflow: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="개념 검색 · 예: 왕적 제사장, 성전 임재, H2233"
          aria-label="정경 개념 의미 검색"
          style={{
            width: '100%', minHeight: 48, boxSizing: 'border-box', padding: '0 14px',
            border: '1px solid var(--at-separator)', borderRadius: 12,
            background: 'var(--at-surface)', color: 'var(--at-label)', fontSize: 15,
          }}
        />

        <div style={{ margin: '12px 2px', fontSize: 12, color: 'var(--at-label-3)' }}>
          {query.trim() ? `${results.length}개 관련 개념` : '추천 개념 12개'} · 각 카드에서 정경 여정의 대표 단계를 미리 볼 수 있습니다.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {results.map((id) => {
            const concept = CANONICAL_CONCEPTS[id];
            const category = CONCEPT_CATEGORIES[concept.category];
            const accent = category?.color || 'var(--at-accent)';
            return (
              <button
                type="button"
                key={id}
                onClick={() => setSelected(id)}
                aria-label={`${concept.labelKo} 정경 여정 상세 열기`}
                style={{
                  minHeight: 142, padding: 13, textAlign: 'left', cursor: 'pointer',
                  border: '1px solid var(--at-separator)', borderRadius: 13,
                  background: 'var(--at-surface)', color: 'var(--at-label)',
                  touchAction: 'manipulation',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 21 }}>{concept.emoji}</span>
                  <strong style={{ fontSize: 15 }}>{concept.labelKo}</strong>
                  <span style={{
                    marginLeft: 'auto', padding: '2px 7px', borderRadius: 999,
                    background: `${accent}18`, color: accent, fontSize: 10, fontWeight: 800,
                  }}>{category?.ko}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--at-label-2)', lineHeight: 1.45 }}>
                  {[concept.strong?.he, concept.strong?.gr].filter(Boolean).join(' · ')}
                </div>
                <JourneyPreview concept={concept} accent={accent} isMobile={isMobile} />
              </button>
            );
          })}
        </div>

        {query.trim() && results.length === 0 && (
          <div role="status" style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--at-label-3)' }}>
            관련 개념을 찾지 못했습니다. 개념명·원어·Strong 번호·신학 주제를 바꾸어 검색해 보세요.
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowBrowser(true)}
          aria-label="전체 정경 추적 개념 브라우저 열기"
          style={{
            width: '100%', minHeight: 46, marginTop: 14, border: '1px solid var(--at-separator)',
            borderRadius: 12, background: 'var(--at-surface-2)', color: 'var(--at-label)',
            fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
          }}
        >
          전체 정경 추적 개념 둘러보기
        </button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
