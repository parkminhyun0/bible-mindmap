import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';

const INITIAL_STATE = Object.freeze({ status: 'idle', latencyMs: null, candidates: [], error: '' });
const RESULT_CACHE_LIMIT = 20;

function overlapCount(keywordIds, candidateIds) {
  const baseline = new Set(keywordIds);
  return candidateIds.filter((id) => baseline.has(id)).length;
}

export default function CanonicalSemanticComparisonPanel({ query, onSelect }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [mountNode, setMountNode] = useState(null);
  const requestRef = useRef(null);
  const cacheRef = useRef(new Map());
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
      requestRef.current?.abort();
      setMountNode(null);
      host.remove();
    };
  }, []);

  const runComparison = useCallback(async (requestedQuery, { force = false } = {}) => {
    const targetQuery = String(requestedQuery || '').trim();
    if (targetQuery.length < 2) {
      requestRef.current?.abort();
      setState(INITIAL_STATE);
      return;
    }

    const cached = cacheRef.current.get(targetQuery);
    if (!force && cached) {
      setState(cached);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ ...INITIAL_STATE, status: 'loading' });

    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: targetQuery, mode: 'manual-shadow-comparison', readOnly: true }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !Array.isArray(payload?.candidates)) {
        throw new Error(payload?.reason || `HTTP ${response.status}`);
      }
      const nextState = {
        status: 'success',
        latencyMs: Number(payload.latencyMs || 0),
        candidates: payload.candidates.filter((candidate) => CANONICAL_CONCEPTS[candidate.id]),
        error: '',
      };
      cacheRef.current.set(targetQuery, nextState);
      while (cacheRef.current.size > RESULT_CACHE_LIMIT) {
        cacheRef.current.delete(cacheRef.current.keys().next().value);
      }
      setState(nextState);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setState({ ...INITIAL_STATE, status: 'error', error: error?.message || 'semantic-search-failed' });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, []);

  useEffect(() => {
    runComparison(normalizedQuery);
    return () => requestRef.current?.abort();
  }, [normalizedQuery, runComparison]);

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
            입력이 끝나면 자동 비교합니다. 기존 검색 결과는 유지됩니다.
          </div>
        </div>
        <button
          type="button"
          onClick={() => runComparison(normalizedQuery, { force: true })}
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
