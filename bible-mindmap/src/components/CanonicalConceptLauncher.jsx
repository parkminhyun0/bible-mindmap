import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import useMobile from '../hooks/useMobile';
import useModalDialog from '../hooks/useModalDialog';
import { CANONICAL_CONCEPTS } from '../data/canonicalConcepts.js';
import { isCanonicalConceptSearchInput } from '../search/canonicalConceptShadowBridge';
import CanonicalSemanticComparisonPanel from './CanonicalSemanticComparisonPanel';
import CanonicalConceptSuggestionPanel from './CanonicalConceptSuggestionPanel';

const CanonicalConceptStaticSearchEntry = lazy(() => import('./CanonicalConceptStaticSearchEntry'));
const COMPARISON_DEBOUNCE_MS = 300;
const SEARCH_INPUT_SELECTOR = 'input[aria-label="정경 개념 의미 검색"]';
const SEARCH_DIALOG_SELECTOR = '[role="dialog"][aria-label="정경 추적 · 정적 의미 검색"]';
const DETAIL_OPEN_TIMEOUT_MS = 1800;

function setCanonicalSearchValue(value) {
  const input = document.querySelector(SEARCH_INPUT_SELECTOR);
  if (!(input instanceof HTMLInputElement)) return false;

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);

  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: value,
  }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus({ preventScroll: true });
  input.setSelectionRange(value.length, value.length);
  return true;
}

function mutationTouchesCanonicalSearch(mutations) {
  return mutations.some((mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
    if (!(node instanceof Element)) return false;
    return node.matches?.(SEARCH_DIALOG_SELECTOR)
      || node.matches?.(SEARCH_INPUT_SELECTOR)
      || Boolean(node.querySelector?.(SEARCH_DIALOG_SELECTOR))
      || Boolean(node.querySelector?.(SEARCH_INPUT_SELECTOR));
  }));
}

// 일반 사용자 검색은 기존 정적 로컬 검색만 사용한다. NVIDIA 후보는 별도 비교 영역에만 표시한다.

/**
 * 정경 추적 · 핵심 개념 모달 런처.
 * ⚠️ 모바일 시트를 닫지 않는다 — App.jsx가 시트 상태로 Sidebar 마운트를 제어하므로
 * 시트를 닫으면 이 런처가 통째로 언마운트되어 모달이 열리자마자 사라진다.
 * 모달은 portal + zIndex 1250으로 시트 위에 겹쳐 띄운다. [[mobile-modal-unmount-rule]]
 */
export default function CanonicalConceptLauncher({ variant = 'inline' }) {
  const [open, setOpen] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [comparisonQuery, setComparisonQuery] = useState('');
  const isMobile = useMobile();
  const isRail = variant === 'rail';
  const comparisonDebounceRef = useRef(null);
  const lastObservedValueRef = useRef('');

  const closeModal = useCallback(() => {
    clearTimeout(comparisonDebounceRef.current);
    lastObservedValueRef.current = '';
    setOpen(false);
    setSuggestionQuery('');
    setComparisonQuery('');
  }, []);

  const scheduleComparison = useCallback((query) => {
    clearTimeout(comparisonDebounceRef.current);
    comparisonDebounceRef.current = setTimeout(() => {
      setComparisonQuery(query);
    }, COMPARISON_DEBOUNCE_MS);
  }, []);

  const commitSearchValue = useCallback((query) => {
    const value = String(query || '');
    lastObservedValueRef.current = value;
    setSuggestionQuery(value);
    scheduleComparison(value);
  }, [scheduleComparison]);

  const openCanonicalConcept = useCallback((conceptId) => {
    const concept = CANONICAL_CONCEPTS[conceptId];
    if (!concept?.labelKo) return;

    const searchText = concept.labelKo;
    setCanonicalSearchValue(searchText);
    commitSearchValue(searchText);

    const detailLabel = `${concept.labelKo} 정경 여정 상세 열기`;
    const dialogRoot = document.querySelector(SEARCH_DIALOG_SELECTOR);
    if (!(dialogRoot instanceof HTMLElement)) return;

    const findAndOpen = () => {
      const button = [...dialogRoot.querySelectorAll('button[aria-label$="정경 여정 상세 열기"]')]
        .find((candidate) => candidate.getAttribute('aria-label') === detailLabel);

      if (!(button instanceof HTMLButtonElement)) return false;
      button.scrollIntoView({ block: 'nearest' });
      button.focus({ preventScroll: true });
      button.click();
      return true;
    };

    if (findAndOpen()) return;

    const startedAt = Date.now();
    const observer = new MutationObserver(() => {
      if (findAndOpen() || Date.now() - startedAt >= DETAIL_OPEN_TIMEOUT_MS) {
        observer.disconnect();
      }
    });

    observer.observe(dialogRoot, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), DETAIL_OPEN_TIMEOUT_MS);
  }, [commitSearchValue]);

  useEffect(() => {
    if (!open) return undefined;

    let inputNode = null;
    let observedDialog = null;
    let dialogObserver = null;
    let portalFrame = 0;

    const readAndCommit = (target) => {
      if (!isCanonicalConceptSearchInput(target)) return;
      const value = String(target.value || '');
      if (value === lastObservedValueRef.current) return;
      commitSearchValue(value);
    };

    const scheduleRead = (target) => {
      // React의 controlled input onChange가 먼저 query 상태를 반영하도록
      // launcher의 비교 패널 상태 갱신은 현재 native event 이후로 미룬다.
      queueMicrotask(() => {
        if (target !== inputNode || !target?.isConnected) return;
        readAndCommit(target);
      });
    };

    const handleInput = (event) => {
      if (event.isComposing) return;
      scheduleRead(event.target);
    };

    const handleCompositionEnd = (event) => {
      scheduleRead(event.target);
    };

    const handleKeyUp = (event) => {
      if (event.isComposing) return;
      scheduleRead(event.target);
    };

    const detachInput = () => {
      if (!(inputNode instanceof HTMLInputElement)) return;
      inputNode.removeEventListener('input', handleInput);
      inputNode.removeEventListener('change', handleInput);
      inputNode.removeEventListener('compositionend', handleCompositionEnd);
      inputNode.removeEventListener('keyup', handleKeyUp);
      inputNode = null;
    };

    const attachInput = (candidate) => {
      if (!(candidate instanceof HTMLInputElement) || candidate === inputNode) return false;
      detachInput();
      inputNode = candidate;
      inputNode.addEventListener('input', handleInput);
      inputNode.addEventListener('change', handleInput);
      inputNode.addEventListener('compositionend', handleCompositionEnd);
      inputNode.addEventListener('keyup', handleKeyUp);
      scheduleRead(inputNode);
      return true;
    };

    const watchDialog = (dialogRoot) => {
      if (!(dialogRoot instanceof HTMLElement)) return false;
      if (dialogRoot !== observedDialog) {
        dialogObserver?.disconnect();
        observedDialog = dialogRoot;
        dialogObserver = new MutationObserver(() => {
          attachInput(observedDialog?.querySelector(SEARCH_INPUT_SELECTOR));
        });
        dialogObserver.observe(dialogRoot, { childList: true, subtree: true });
      }
      attachInput(dialogRoot.querySelector(SEARCH_INPUT_SELECTOR));
      return true;
    };

    const syncPortal = () => {
      portalFrame = 0;
      const dialogRoot = document.querySelector(SEARCH_DIALOG_SELECTOR);
      if (!(dialogRoot instanceof HTMLElement)) {
        if (observedDialog && !observedDialog.isConnected) {
          dialogObserver?.disconnect();
          dialogObserver = null;
          observedDialog = null;
          detachInput();
        }
        return;
      }
      if (dialogRoot === observedDialog && inputNode?.isConnected) return;
      watchDialog(dialogRoot);
    };

    const schedulePortalSync = (mutations) => {
      if (portalFrame || !mutationTouchesCanonicalSearch(mutations)) return;
      portalFrame = window.requestAnimationFrame(syncPortal);
    };

    syncPortal();
    // 검색→상세→검색 왕복 때 portal과 input 노드가 교체된다. 폴링 대신
    // 관련 노드가 추가/제거된 mutation만 프레임당 한 번 확인해 재부착한다.
    const portalObserver = new MutationObserver(schedulePortalSync);
    portalObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      portalObserver.disconnect();
      dialogObserver?.disconnect();
      if (portalFrame) window.cancelAnimationFrame(portalFrame);
      detachInput();
      clearTimeout(comparisonDebounceRef.current);
    };
  }, [open, commitSearchValue]);

  useModalDialog({
    dialogSelector: SEARCH_DIALOG_SELECTOR,
    onClose: closeModal,
    lockScroll: isMobile,
    active: open,
    manageEscape: false,
  });

  const buttonStyle = isRail
    ? {
        width: 36, height: 28, minHeight: 44, padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #334155', borderRadius: 7,
        background: 'linear-gradient(135deg,#1e293b,#334155)',
        color: '#e2e8f0', fontSize: 13, fontWeight: 800,
        boxShadow: '0 2px 6px rgba(30,41,59,.35)', cursor: 'pointer',
        touchAction: 'manipulation',
      }
    : {
        width: '100%', minHeight: 44, padding: '10px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        border: 'none', borderRadius: 8,
        background: 'linear-gradient(135deg,#1e293b,#334155)',
        color: '#fff', fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
        fontSize: 13, fontWeight: 700, letterSpacing: '.02em',
        boxShadow: '0 2px 8px rgba(30,41,59,.35)', cursor: 'pointer',
        touchAction: 'manipulation', whiteSpace: 'nowrap',
      };

  return (
    <>
      <button
        type="button"
        data-research-tool="canonical-concept-global"
        aria-label="정경 추적 핵심 개념 열기"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="핵심 개념이 창세기→요한계시록으로 계시·성취되는 흐름"
        onClick={() => setOpen(true)}
        style={buttonStyle}
      >
        <span aria-hidden="true" style={{ fontSize: isRail ? 14 : 15, lineHeight: 1 }}>🧭</span>
        {!isRail && <span>정경 추적</span>}
      </button>

      {open && (
        <>
          <Suspense fallback={<div className="deferred-feature-loading">정경 추적 검색을 불러오는 중…</div>}>
            <CanonicalConceptStaticSearchEntry onClose={closeModal} />
          </Suspense>
          <CanonicalSemanticComparisonPanel query={comparisonQuery} onSelect={openCanonicalConcept} />
          <CanonicalConceptSuggestionPanel query={suggestionQuery} />
        </>
      )}
    </>
  );
}
