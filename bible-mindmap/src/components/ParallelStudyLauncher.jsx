import { lazy, Suspense, useState } from 'react';

const ParallelStudyModal = lazy(() => import('./ParallelStudyModal'));

export default function ParallelStudyLauncher({ variant = 'inline' }) {
  const [open, setOpen] = useState(false);
  // ⚠️ 모바일에서 이 버튼은 시트를 닫으면 안 됨 — App.jsx가 시트 상태로 Sidebar
  // 마운트를 제어하므로 시트를 닫으면 이 런처(및 open 상태)가 통째로 언마운트되어
  // 모달이 열리자마자 사라진다. 모달은 portal + zIndex 1250으로 시트 위에 겹쳐 띄운다.
  // [[mobile-modal-unmount-rule]]
  const handleOpen = () => setOpen(true);

  const isRail = variant === 'rail';

  const buttonStyle = isRail
    ? {
        width: 36,
        height: 28,
        minHeight: 44,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #134e4a',
        borderRadius: 7,
        background: 'linear-gradient(135deg,#0f766e,#115e59)',
        color: '#ecfeff',
        fontSize: 13,
        fontWeight: 800,
        boxShadow: '0 2px 6px rgba(15,118,110,.35)',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }
    : {
        width: '100%',
        minHeight: 44,
        padding: '9px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        border: '1px solid #134e4a',
        borderRadius: 8,
        background: 'linear-gradient(135deg,#0f766e,#115e59)',
        color: '#ecfeff',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '.02em',
        boxShadow: '0 1px 3px rgba(15,118,110,.28)',
        cursor: 'pointer',
        touchAction: 'manipulation',
      };

  return (
    <>
      <button
        type="button"
        data-research-tool="parallel-study-global"
        aria-label="병렬 본문 연구 열기"
        title="공관복음 · 구약↔신약 · 인용·반향 본문을 나란히 비교"
        onClick={handleOpen}
        style={buttonStyle}
      >
        <span aria-hidden="true" style={{ fontSize: isRail ? 14 : 15, lineHeight: 1 }}>⇄</span>
        {!isRail && <span>병렬 연구</span>}
      </button>

      {open && (
        <Suspense fallback={<div className="deferred-feature-loading">병렬 본문 연구를 불러오는 중…</div>}>
          <ParallelStudyModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
