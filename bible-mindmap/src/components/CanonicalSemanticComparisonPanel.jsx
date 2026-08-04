import { useMemo, useState } from 'react';
import { CANONICAL_CONCEPTS } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';

const INITIAL_STATE = Object.freeze({ status: 'idle', latencyMs: null, candidates: [], error: '' });

function overlapCount(keywordIds, candidateIds) {
  const baseline = new Set(keywordIds);
  return candidateIds.filter((id) => baseline.has(id)).length;
}

export default function CanonicalSemanticComparisonPanel({ query, onSelect }) {
  const [state, setState] = useState(INITIAL_STATE);
  const normalizedQuery = String(query || '').trim();
  const keywordResults = useMemo(
    () => (normalizedQuery ? searchCanonicalConceptsStatic(normalizedQuery, { limit: 8 }) : []),
    [normalizedQuery],
  );
  const keywordIds = keywordResults.map((result) => result.id);
  const semanticIds = state.candidates.map((candidate) => candidate.id);
  const overlap = overlapCount(keywordIds, semanticIds);

  const runComparison = async () => {
    if (normalizedQuery.length < 2 || state.status === 'loading') return;
    setState({ ...INITIAL_STATE, status: 'loading' });
    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: normalizedQuery, mode: 'manual-shadow-comparison', readOnly: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !Array.isArray(payload?.candidates)) {
        throw new Error(payload?.reason || `HTTP ${response.status}`);
      }
      setState({
        status: 'success',
        latencyMs: Number(payload.latencyMs || 0),
        candidates: payload.candidates.filter((candidate) => CANONICAL_CONCEPTS[candidate.id]),
        error: '',
      });
    } catch (error) {
      setState({ ...INITIAL_STATE, status: 'error', error: error?.message || 'semantic-search-failed' });
    }
  };

  if (normalizedQuery.length < 2) return null;

  return (
    <section
      aria-label="NVIDIA 의미 검색 비교"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        zIndex: 1288,
        width: 'min(700px, calc(100vw - 32px))',
        maxHeight: 'min(46vh, 520px)',
        overflow: 'auto',
        overscrollBehavior: 'contain',
        border: '1px solid var(--at-separator)', borderRadius: 16,
        background: 'var(--at-bg)', color: 'var(--at-label)', boxShadow: 'var(--at-shadow-xl)',
        padding: 14,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>🧪 NVIDIA 의미 검색 비교</div>
          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--at-label-3)', lineHeight: 1.4 }}>
            현재 결과는 바꾸지 않고 후보만 비교합니다.
          </div>
        </div>
        <button
          type="button"
          onClick={runComparison}
          disabled={state.status === 'loading'}
          style={{
            minWidth: 92, minHeight: 44, padding: '0 13px', border: 0, borderRadius: 10,
            background: 'var(--at-accent)', color: '#fff', fontWeight: 800,
            cursor: state.status === 'loading' ? 'wait' : 'pointer', opacity: state.status === 'loading' ? 0.7 : 1,
            flexShrink: 0,
          }}
        >
          {state.status === 'loading' ? '비교 중…' : '비교 실행'}
        </button>
      </div>

      <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: 'var(--at-surface-2)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--at-label-3)' }}>검색어</div>
        <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, overflowWrap: 'anywhere' }}>{normalizedQuery}</div>
      </div>

      {state.status === 'error' && (
        <div role="alert" style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(220,38,38,.10)', color: 'var(--at-danger,#dc2626)', fontSize: 12 }}>
          의미 검색을 실행하지 못했습니다: {state.error}
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--at-surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{keywordIds.length}</div>
              <div style={{ fontSize: 10, color: 'var(--at-label-3)' }}>키워드</div>
            </div>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--at-surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{semanticIds.length}</div>
              <div style={{ fontSize: 10, color: 'var(--at-label-3)' }}>의미 후보</div>
            </div>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--at-surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{overlap}</div>
              <div style={{ fontSize: 10, color: 'var(--at-label-3)' }}>겹침 · {state.latencyMs}ms</div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, fontWeight: 900 }}>의미 검색 상위 후보</div>
          <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
            {state.candidates.map((candidate, index) => {
              const concept = CANONICAL_CONCEPTS[candidate.id];
              const inKeyword = keywordIds.includes(candidate.id);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelect?.(candidate.id)}
                  style={{
                    minHeight: 44, padding: '9px 10px', display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto', gap: 8,
                    alignItems: 'center', textAlign: 'left', border: '1px solid var(--at-separator)', borderRadius: 10,
                    background: 'var(--at-surface)', color: 'var(--at-label)', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--at-label-3)' }}>{index + 1}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{concept.labelKo}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 10, color: 'var(--at-label-3)' }}>{candidate.score.toFixed(4)}</span>
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: inKeyword ? 'var(--at-success,#059669)' : 'var(--at-accent-text)', whiteSpace: 'nowrap' }}>
                    {inKeyword ? '겹침' : '새 후보'}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
