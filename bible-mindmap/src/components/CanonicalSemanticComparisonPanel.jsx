import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';
import { getCanonicalConceptSuggestions } from '../search/canonicalConceptSuggestions.js';

const INITIAL_STATE = Object.freeze({ status: 'idle', latencyMs: null, candidates: [], error: '' });

function overlapCount(keywordIds, candidateIds) {
  const baseline = new Set(keywordIds);
  return candidateIds.filter((id) => baseline.has(id)).length;
}

function buildExpandedCandidates(query, limit = 8) {
  const startedAt = performance.now();
  const suggestions = getCanonicalConceptSuggestions(query, { limit: 6 });
  const expandedQueries = [query, ...suggestions.map((item) => item.searchText)];
  const scores = new Map();

  expandedQueries.forEach((expandedQuery, queryIndex) => {
    searchCanonicalConceptsStatic(expandedQuery, { limit: 12 }).forEach((id, resultIndex) => {
      const queryWeight = queryIndex === 0 ? 18 : 12;
      const rankWeight = Math.max(1, 12 - resultIndex);
      scores.set(id, (scores.get(id) || 0) + queryWeight + rankWeight);
    });
  });

  const candidates = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));

  return {
    status: 'success',
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    candidates,
    error: '',
  };
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

  const runComparison = useCallback((requestedQuery) => {
    const targetQuery = String(requestedQuery || '').trim();
    if (targetQuery.length < 2) {
      setState(INITIAL_STATE);
      return;
    }

    setState({ ...INITIAL_STATE, status: 'loading' });
    window.requestAnimationFrame(() => {
      try {
        setState(buildExpandedCandidates(targetQuery));
      } catch (error) {
        setState({ ...INITIAL_STATE, status: 'error', error: error?.message || 'static-semantic-search-failed' });
      }
    });
  }, []);

  useEffect(() => {
    runComparison(normalizedQuery);
  }, [normalizedQuery, runComparison]);

  if (!mountNode || normalizedQuery.length < 2) return null;

  return createPortal(
    <section
      aria-label="정적 의미 확장 비교"
      style={{
        width: '100%', boxSizing: 'border-box', padding: 12,
        border: '1px solid var(--at-separator)', borderRadius: 12,
        background: 'var(--at-surface-2)', color: 'var(--at-label)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900 }}>🧭 의미 확장 비교</div>
          <div style={{ marginTop: 2, fontSize: 10.5, color: 'var(--at-label-3)' }}>
            GitHub Pages에서 검증된 제안어와 정경 개념 색인을 조합해 자동 비교합니다.
          </div>
        </div>
        <button
          type="button"
          onClick={() => runComparison(normalizedQuery)}
          disabled={state.status === 'loading'}
          style={{
            minWidth: 96, minHeight: 44, padding: '0 13px', border: 0, borderRadius: 10,
            background: 'var(--at-accent)', color: '#fff', fontWeight: 800,
            cursor: state.status === 'loading' ? 'wait' : 'pointer',
            opacity: state.status === 'loading' ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {state.status === 'loading' ? '비교 중…' : '다시 비교'}
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--at-label-3)' }}>
        검색어: <strong style={{ color: 'var(--at-label)' }}>{normalizedQuery}</strong>
      </div>

      {state.status === 'loading' && (
        <div role="status" aria-live="polite" style={{ marginTop: 8, fontSize: 11, color: 'var(--at-accent-text)' }}>
          의미 후보를 비교하고 있습니다…
        </div>
      )}

      {state.status === 'error' && (
        <div role="alert" style={{ marginTop: 8, fontSize: 11, color: 'var(--at-danger,#dc2626)' }}>
          의미 검색을 실행하지 못했습니다: {state.error}
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            {[['키워드', keywordIds.length], ['확장 후보', semanticIds.length], ['겹침', `${overlap} · ${state.latencyMs}ms`]].map(([label, value]) => (
              <div key={label} style={{ padding: 7, borderRadius: 9, background: 'var(--at-surface)', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>{value}</div>
                <div style={{ fontSize: 9.5, color: 'var(--at-label-3)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
            {state.candidates.map((candidate, index) => {
              const concept = CANONICAL_CONCEPTS[candidate.id];
              if (!concept) return null;
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
                    {inKeyword ? '겹침' : '확장 후보'}
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
