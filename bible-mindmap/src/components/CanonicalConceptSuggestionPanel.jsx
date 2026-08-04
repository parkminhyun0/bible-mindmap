import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCanonicalConceptSuggestions } from '../search/canonicalConceptSuggestions.js';

function applySuggestion(searchText) {
  const input = document.querySelector('input[aria-label="정경 개념 의미 검색"]');
  if (!(input instanceof HTMLInputElement)) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, searchText);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus({ preventScroll: true });
  input.setSelectionRange(searchText.length, searchText.length);
}

export default function CanonicalConceptSuggestionPanel({ query }) {
  const [mountNode, setMountNode] = useState(null);
  const suggestions = useMemo(
    () => getCanonicalConceptSuggestions(query, { limit: 6 }),
    [query],
  );

  useEffect(() => {
    const input = document.querySelector('input[aria-label="정경 개념 의미 검색"]');
    if (!input?.parentElement) return undefined;
    const host = document.createElement('div');
    host.dataset.canonicalSuggestionInline = 'true';
    host.style.marginTop = '8px';
    input.insertAdjacentElement('afterend', host);
    setMountNode(host);
    return () => {
      setMountNode(null);
      host.remove();
    };
  }, []);

  if (!mountNode || suggestions.length === 0) return null;

  return createPortal(
    <section
      aria-label="추천 검색 의미"
      style={{
        padding: 10,
        border: '1px solid var(--at-separator)',
        borderRadius: 12,
        background: 'var(--at-surface-2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ fontSize: 11.5, color: 'var(--at-label)' }}>추천 검색 의미</strong>
        <span style={{ fontSize: 9.5, color: 'var(--at-label-3)' }}>검증된 개념·정경 단계</span>
      </div>
      <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.source}:${suggestion.searchText}`}
            type="button"
            onClick={() => applySuggestion(suggestion.searchText)}
            title={`검색어 확장: ${suggestion.searchText}`}
            style={{
              minHeight: 36,
              padding: '7px 10px',
              border: '1px solid var(--at-separator)',
              borderRadius: 999,
              background: 'var(--at-surface)',
              color: 'var(--at-label)',
              fontSize: 10.5,
              fontWeight: 800,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 7, fontSize: 9.5, lineHeight: 1.4, color: 'var(--at-label-3)' }}>
        제안을 선택하면 검색어가 의미 문장으로 확장되고 키워드 검색과 NVIDIA 비교가 함께 갱신됩니다.
      </div>
    </section>,
    mountNode,
  );
}
