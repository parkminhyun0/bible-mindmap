import { lazy, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';
import useMobile from '../hooks/useMobile.js';

const CanonicalConceptModal = lazy(() => import('./CanonicalConceptModal.jsx'));

export default function CanonicalConceptStaticSearchEntry({ onClose }) {
  const isMobile = useMobile();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const results = useMemo(() => searchCanonicalConceptsStatic(query, { limit: 12 }), [query]);

  if (selected) {
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
        width: isMobile ? '100%' : 'min(680px, calc(100vw - 40px))',
        maxHeight: isMobile ? '86vh' : 'min(720px, calc(100vh - 48px))',
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
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78 }}>서버·AI 호출 없이 브라우저에서 검색합니다.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ minWidth: 44, minHeight: 44, border: 0, borderRadius: 10, background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
      </header>

      <div style={{ padding: 16, overflow: 'auto' }}>
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
          {query.trim() ? `${results.length}개 관련 개념` : '추천 개념 12개'} · 한글·히브리어·헬라어·Strong·정경 흐름·신학 앵커 검색
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {results.map((id) => {
            const concept = CANONICAL_CONCEPTS[id];
            const category = CONCEPT_CATEGORIES[concept.category];
            return (
              <button
                type="button"
                key={id}
                onClick={() => setSelected(id)}
                style={{
                  minHeight: 88, padding: 13, textAlign: 'left', cursor: 'pointer',
                  border: '1px solid var(--at-separator)', borderRadius: 13,
                  background: 'var(--at-surface)', color: 'var(--at-label)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 21 }}>{concept.emoji}</span>
                  <strong style={{ fontSize: 15 }}>{concept.labelKo}</strong>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--at-label-2)', lineHeight: 1.45 }}>
                  {category?.ko} · {[concept.strong?.he, concept.strong?.gr].filter(Boolean).join(' · ')}
                </div>
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
          onClick={() => setSelected(Object.keys(CANONICAL_CONCEPTS)[0])}
          style={{
            width: '100%', minHeight: 46, marginTop: 14, border: '1px solid var(--at-separator)',
            borderRadius: 12, background: 'var(--at-surface-2)', color: 'var(--at-label)',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          전체 정경 추적 상세 화면 열기
        </button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
