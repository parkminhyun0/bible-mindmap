import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import useMobile from '../hooks/useMobile';
import useModalDialog from '../hooks/useModalDialog';
import {
  isCanonicalConceptSearchInput,
  runCanonicalConceptShadowBridge,
} from '../search/canonicalConceptShadowBridge';
import CanonicalSemanticComparisonPanel from './CanonicalSemanticComparisonPanel';

const CanonicalConceptStaticSearchEntry = lazy(() => import('./CanonicalConceptStaticSearchEntry'));

/**
 * 정경 추적 · 핵심 개념 모달 런처.
 * ⚠️ 모바일 시트를 닫지 않는다 — App.jsx가 시트 상태로 Sidebar 마운트를 제어하므로
 * 시트를 닫으면 이 런처가 통째로 언마운트되어 모달이 열리자마자 사라진다.
 * 모달은 portal + zIndex 1250으로 시트 위에 겹쳐 띄운다. [[mobile-modal-unmount-rule]]
 */
export default function CanonicalConceptLauncher({ variant = 'inline' }) {
  const [open, setOpen] = useState(false);
  const [comparisonQuery, setComparisonQuery] = useState('');
  const isMobile = useMobile();
  const isRail = variant === 'rail';
  const comparisonDebounceRef = useRef(null);

  const closeModal = useCallback(() => {
    clearTimeout(comparisonDebounceRef.current);
    setOpen(false);
    setComparisonQuery('');
  }, []);

  const scheduleComparison = useCallback((query) => {
    clearTimeout(comparisonDebounceRef.current);
    comparisonDebounceRef.current = setTimeout(() => {
      setComparisonQuery(query);
      runCanonicalConceptShadowBridge({ query }).catch(() => {});
    }, 700);
  }, []);

  const handleSearchInput = useCallback((event) => {
    if (!isCanonicalConceptSearchInput(event.target)) return;
    if (event.nativeEvent?.isComposing) return;
    scheduleComparison(event.target.value);
  }, [scheduleComparison]);

  const handleCompositionEnd = useCallback((event) => {
    if (!isCanonicalConceptSearchInput(event.target)) return;
    scheduleComparison(event.target.value);
  }, [scheduleComparison]);

  useEffect(() => () => clearTimeout(comparisonDebounceRef.current), []);

  useModalDialog({
    dialogSelector: '[role="dialog"][aria-label^="정경 추적 ·"]',
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
          <div onInput={handleSearchInput} onCompositionEnd={handleCompositionEnd}>
            <Suspense fallback={<div className="deferred-feature-loading">정경 추적 검색을 불러오는 중…</div>}>
              <CanonicalConceptStaticSearchEntry onClose={closeModal} />
            </Suspense>
          </div>
          <CanonicalSemanticComparisonPanel query={comparisonQuery} />
        </>
      )}
    </>
  );
}
