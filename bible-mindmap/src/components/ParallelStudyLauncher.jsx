import { lazy, Suspense, useState } from 'react';
import { useDeviceProfile } from '../hooks/useMobile';

const ParallelStudyModal = lazy(() => import('./ParallelStudyModal'));

export default function ParallelStudyLauncher() {
  const deviceProfile = useDeviceProfile();
  const isMobile = deviceProfile.layout === 'mobile';
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          type="button"
          data-research-tool="parallel-study-global"
          aria-label="병렬 본문 연구 열기"
          title="공관복음 · 구약↔신약 · 인용·반향 본문을 나란히 비교"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            top: isMobile ? 'auto' : 14,
            left: isMobile ? 'auto' : '50%',
            right: isMobile ? 12 : 'auto',
            bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 78px)' : 'auto',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            zIndex: 1100,
            minHeight: 44,
            minWidth: isMobile ? 132 : 148,
            padding: isMobile ? '9px 13px' : '8px 15px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            border: '1px solid #134e4a',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0f766e, #115e59)',
            color: '#ecfeff',
            boxShadow: '0 3px 10px rgba(15,118,110,.28)',
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
            fontSize: isMobile ? 12.5 : 12,
            fontWeight: 800,
            letterSpacing: '.01em',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>⇄</span>
          <span>병렬 연구</span>
        </button>
      )}

      {open && (
        <Suspense fallback={<div className="deferred-feature-loading">병렬 본문 연구를 불러오는 중…</div>}>
          <ParallelStudyModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
