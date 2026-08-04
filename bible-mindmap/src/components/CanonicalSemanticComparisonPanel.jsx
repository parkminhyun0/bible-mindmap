import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from '../search/canonicalConceptStaticSearch.js';

const WORKER_COMPARE_URL = 'https://bible-mindmap-nvidia-search.skyhyangsu63.workers.dev/compare';
const INPUT_SELECTOR = 'input[aria-label="정경 개념 의미 검색"]';
const INITIAL_STATE = Object.freeze({
  status: 'idle', latencyMs: null, dimensions: null, model: '', candidates: [], error: '',
});
const comparisonCache = new Map();

function overlapCount(keywordIds, candidateIds) {
  const baseline = new Set(keywordIds);
  return candidateIds.filter((id) => baseline.has(id)).length;
}

function conceptToPassage(id, concept) {
  const category = CONCEPT_CATEGORIES[concept.category]?.ko || concept.category || '';
  const anchors = Array.isArray(concept.reformedAnchors) ? concept.reformedAnchors.join(', ') : '';
  const arcs = Array.isArray(concept.canonicalArc)
    ? concept.canonicalArc.map((arc) => `${arc.stage}: ${arc.summary}`).join(' ')
    : '';
  return [
    `정경 개념: ${concept.labelKo || id}`,
    category ? `분류: ${category}` : '',
    concept.labelHe ? `히브리어: ${concept.labelHe}` : '',
    concept.labelGr ? `헬라어: ${concept.labelGr}` : '',
    anchors ? `개혁주의 기준: ${anchors}` : '',
    arcs ? `정경 발전: ${arcs}` : '',
  ].filter(Boolean).join('\n');
}

const ALL_CONCEPT_CANDIDATES = Object.freeze(
  Object.entries(CANONICAL_CONCEPTS).map(([id, concept]) => Object.freeze({
    id,
    text: conceptToPassage(id, concept),
  })),
);

function formatScore(score) {
  return Number.isFinite(score) ? `${Math.round(score * 100)}%` : '-';
}

function readableError(reason, status) {
  if (reason === 'origin-not-allowed') return '현재 사이트 주소가 Worker 허용 목록에 없습니다.';
  if (reason === 'missing-nvidia-api-key') return 'Worker의 NVIDIA API 키가 등록되지 않았습니다.';
  if (reason === 'nvidia-request-failed') return `NVIDIA 요청이 실패했습니다${status ? ` (${status})` : ''}.`;
  if (reason === 'invalid-nvidia-response') return 'NVIDIA 응답 형식을 확인하지 못했습니다.';
  if (reason === 'missing-candidates') return '비교할 정경 개념 데이터가 없습니다.';
  return 'NVIDIA 의미 비교를 실행하지 못했습니다.';
}

export default function CanonicalSemanticComparisonPanel({ query, onSelect }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [mountNode, setMountNode] = useState(null);
  const abortRef = useRef(null);
  const hostRef = useRef(null);
  const normalizedQuery = String(query || '').trim();
  const keywordIds = useMemo(
    () => (normalizedQuery ? searchCanonicalConceptsStatic(normalizedQuery, { limit: 8 }) : []),
    [normalizedQuery],
  );
  const semanticIds = state.candidates.map((candidate) => candidate.id);
  const overlap = overlapCount(keywordIds, semanticIds);

  useEffect(() => {
    let observer;
    let disposed = false;

    const attach = () => {
      if (disposed || hostRef.current?.isConnected) return true;
      const input = document.querySelector(INPUT_SELECTOR);
      if (!input?.parentElement) return false;

      const existing = input.parentElement.querySelector('[data-semantic-comparison-inline="true"]');
      const host = existing || document.createElement('div');
      host.dataset.semanticComparisonInline = 'true';
      host.style.marginTop = '10px';
      if (!existing) input.insertAdjacentElement('afterend', host);
      hostRef.current = host;
      setMountNode(host);
      return true;
    };

    if (!attach()) {
      observer = new MutationObserver(() => {
        if (attach()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      abortRef.current?.abort();
      const host = hostRef.current;
      hostRef.current = null;
      setMountNode(null);
      host?.remove();
    };
  }, []);

  const runComparison = useCallback(async (requestedQuery) => {
    const targetQuery = String(requestedQuery || '').trim();
    if (targetQuery.length < 2) {
      abortRef.current?.abort();
      setState(INITIAL_STATE);
      return;
    }

    const cacheKey = targetQuery.normalize('NFKC').toLowerCase();
    const cached = comparisonCache.get(cacheKey);
    if (cached) {
      setState(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...INITIAL_STATE, status: 'loading' });

    try {
      const response = await fetch(WORKER_COMPARE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery, candidates: ALL_CONCEPT_CANDIDATES, limit: 8 }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || payload?.provider !== 'NVIDIA') {
        throw Object.assign(new Error(payload?.reason || 'worker-request-failed'), {
          reason: payload?.reason,
          status: payload?.status || response.status,
        });
      }
      const nextState = {
        status: 'success',
        latencyMs: Number(payload.latencyMs) || null,
        dimensions: Number(payload.dimensions) || null,
        model: String(payload.model || ''),
        candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
        error: '',
      };
      comparisonCache.set(cacheKey, nextState);
      setState(nextState);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: readableError(error?.reason || error?.message, error?.status),
      });
    }
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      runComparison('');
      return undefined;
    }
    const timer = window.setTimeout(() => runComparison(normalizedQuery), 600);
    return () => window.clearTimeout(timer);
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
          <div style={{ fontSize: 13, fontWeight: 900 }}>🟢 NVIDIA 의미 검색 비교</div>
          <div style={{ marginTop: 2, fontSize: 10.5, color: 'var(--at-label-3)' }}>
            Cloudflare Worker가 NVIDIA 임베딩으로 전체 정경 개념의 의미 유사도를 비교합니다.
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
          NVIDIA가 검색어와 정경 개념을 비교하고 있습니다…
        </div>
      )}

      {state.status === 'error' && (
        <div role="alert" style={{ marginTop: 8, fontSize: 11, color: 'var(--at-danger,#dc2626)' }}>
          {state.error} 기존 키워드 검색은 계속 사용할 수 있습니다.
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            {[
              ['키워드', keywordIds.length],
              ['NVIDIA 후보', semanticIds.length],
              ['겹침', `${overlap} · ${state.latencyMs ?? '-'}ms`],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 7, borderRadius: 9, background: 'var(--at-surface)', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>{value}</div>
                <div style={{ fontSize: 9.5, color: 'var(--at-label-3)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 7, fontSize: 9.5, color: 'var(--at-label-3)' }}>
            모델: {state.model || 'NVIDIA embedding'}{state.dimensions ? ` · ${state.dimensions}차원` : ''}
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
                    minHeight: 44, padding: '8px 10px', display: 'grid',
                    gridTemplateColumns: '22px minmax(0,1fr) auto', gap: 8,
                    alignItems: 'center', textAlign: 'left',
                    border: '1px solid var(--at-separator)', borderRadius: 9,
                    background: 'var(--at-surface)', color: 'var(--at-label)', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--at-label-3)' }}>{index + 1}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11.5, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {concept.labelKo}
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 9.5, color: 'var(--at-label-3)' }}>
                      의미 유사도 {formatScore(candidate.score)}
                    </span>
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap', color: inKeyword ? 'var(--at-success,#059669)' : 'var(--at-accent-text)' }}>
                    {inKeyword ? '키워드 겹침' : 'NVIDIA 확장'}
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
