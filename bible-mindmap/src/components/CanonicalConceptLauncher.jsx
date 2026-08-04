import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import useMobile from '../hooks/useMobile';
import useModalDialog from '../hooks/useModalDialog';
import {
  isCanonicalConceptSearchInput,
  runCanonicalConceptShadowBridge,
} from '../search/canonicalConceptShadowBridge';

const CanonicalConceptStaticSearchEntry = lazy(() => import('./CanonicalConceptStaticSearchEntry'));

/**
 * 정경 추적 · 핵심 개념 모달 런처.
 * ⚠️ 모바일 시트를 닫지 않는다 — App.jsx가 시트 상태로 Sidebar 마운트를 제어하므로
 * 시트를 닫으면 이 런처가 통째로 언마운트되어 모달이 열리자마자 사라진다.
 * 모달은 portal + zIndex 1250으로 시트 위에 겹쳐 띄운다. [[mobile-modal-unmount-rule]]
 */
export default function CanonicalConceptLauncher({ variant = 'inline' }) {
  const [open, setOpen] = useState(false);
  const isMobile = useMobile();
  const isRail = variant === 'rail';
  const shadowDebounceRef = useRef(null);
  const closeModal = useCallback(() => setOpen(false), []);

  // 선택 기능으로 보존된 P1-2d-b 서버 shadow bridge.
  // GitHub Pages에는 runtime bootstrap이 없으므로 요청 자체가 발생하지 않는다.
  // 일반 사용자 검색은 CanonicalConceptStaticSearchEntry의 정적 로컬 검색만 사용한다.
  useEffect(() => {
    if (!open) return undefined;
    const onInput = (event) => {
      if (!isCanonicalConceptSearchInput(event.target)) return;
      clearTimeout(shadowDebounceRef.current);
      const query = event.target.value;
      shadowDebounceRef.current = setTimeout(() => {
        runCanonicalConceptShadowBridge({ query }).catch(() => {});
      }, 450);
    };
    document.addEventListener('input', onInput, true);
    return () => {
      document.removeEventListener('input', onInput, true);
      clearTimeout(shadowDebounceRef.current);
    };
  }, [open]);

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
        <Suspense fallback={<div className="deferred-feature-loading">정경 추적 검색을 불러오는 중…</div>}>
          <CanonicalConceptStaticSearchEntry onClose={closeModal} />
        </Suspense>
      )}
    </>
  );
}
