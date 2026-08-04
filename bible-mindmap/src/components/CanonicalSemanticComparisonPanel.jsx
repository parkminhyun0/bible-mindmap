import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';

const INITIAL_STATE = Object.freeze({ status: 'idle', latencyMs: null, candidates: [], error: '' });

function overlapCount(keywordIds, candidateIds) {
  const baseline = new Set(keywordIds);
  return candidateIds.filter((id) => baseline.has(id)).length;
}

export default function CanonicalSemanticComparisonPanel({ query, onSelect }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [mountNode, setMountNode] = useState(null);
  const normalizedQuery = String(query || '').trim();
  const keywordResults = useMemo(
    () => (normalizedQuery ? searchCanonicalConceptsStatic(normalizedQuery, { limit: 8 }) : []),
    [normalizedQuery],
  );
  const keywordIds = keywordResults.map((result) => result.id);
  const semanticIds = state.candidates.map((candidate) => candidate.id);
  const overlap = overlapCount(keywordIds, semanticIds);

  useEffect(() => {
    const input = document.querySelector('input[aria-label="정경 개념 의미 검색"]');
    if (!input?.parentElement) return undefined;
    const host = document.createElement('div');
    host.dataset.semanticComparisonInline = 'true';
    host.style.marginTop = '10px';
    input.insertAdjacentElement('afterend', host);
    setMountNode(host);
    return () => {
      setMountNode(null);
      host.remove();
    };
  }, []);

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

  if (!mountNode || normalizedQuery.length < 2) return null;

  return createPortal(
    <section
      aria-label="NVIDIA 의미 검색 비교"
      style={{
        width: '100%', boxSizing: 'border-box', padding: 12,
        border: '1px solid var(--at-separator)', borderRadius: 12,
        background: 'var(--at-surface-2)', color: 'var(--at-label)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900 }}>🧪 NVIDIA 의미 검색 비교</div>
          <div style={{ marginTop: 2, fontSize: 10.5, color: 'var(--at-label-3)' }}>
            기존 검색 결과는 유지하고 의미 후보만 비교합니다.
          </div>
        </div>
        <button
          type="button"
          onClick={runComparison}
          disabled={state.status === 'loading'}
          style={{
            minWidth: 96, minHeight: 44, padding: '0 13px', border: 0, borderRadius: 10,
            background: 'var(--at-accent)', color: '#fff', fontWeight: 800,
            cursor: state.status === 'loading' ? 'wait' : 'pointer',
            opacity: state.status === 'loading' ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {state.status === 'loading' ? '비교 중…' : '비교 실행'}
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--at-label-3)' }}>
        검색어: <strong style={{ color: 'var(--at-label)' }}>{normalizedQuery}</strong>
      </div>

      {state.status === 'error' && (
        <div role="alert" style={{ marginTop: 8, fontSize: 11, color: 'var(--at-danger,#dc2626)' }}>
          의미 검색을 실행하지 못했습니다: {state.error}
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            {[['키워드', keywordIds.length], ['의미 후보', semanticIds.length], ['겹침', `${overlap} · ${state.latencyMs}ms`]].map(([label, value]) => (
              <div key={label} style={{ padding: 7, borderRadius: 9, background: 'var(--at-surface)', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>{value}</div>
                <div style={{ fontSize: 9.5, color: 'var(--at-label-3)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
            {state.candidates.map((candidate, index) => {
              const concept = CANONICAL_CONCEPTS[candidate.id];
              const inKeyword = keywordIds.includes(candidate.id);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelect?.(candidate.id)}
                  style={{
                    minHeight: 44, padding: '8px 10px', display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) auto', gap: 8,
                    alignItems: 'center', textAlign: 'left', border: '1px solid var(--at-separator)', borderRadius: 9,
                    background: 'var(--at-surface)', color: 'var(--at-label)', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--at-label-3)' }}>{index + 1}</span>
                  <span style={{ minWidth: 0, fontSize: 11.5, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{concept.labelKo}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap', color: inKeyword ? 'var(--at-success,#059669)' : 'var(--at-accent-text)' }}>
                    {inKeyword ? '겹침' : '새 후보'}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>,
    mountNode,
  );
}
