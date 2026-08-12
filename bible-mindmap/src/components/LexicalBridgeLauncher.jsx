import { lazy, Suspense, useEffect, useState } from 'react';
import { hasLexicalBridge, normalizeBridgeStrong } from '../data/lexicalBridgePilot';

const LexicalBridgeModal = lazy(() => import('./LexicalBridgeModalV2'));

export default function LexicalBridgeLauncher({
  strong = 'H5162',
  variant = 'inline',
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const normalizedStrong = normalizeBridgeStrong(strong) || 'H5162';
  const isAnchor = variant === 'anchor';
  const available = isAnchor ? hasLexicalBridge(normalizedStrong) : true;

  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);

  // 원어 브릿지는 후속 재설계 전까지 production UI에서 비활성화한다.
  // 개발/회귀 테스트 자산은 보존해 다음 작업 때 기존 연구 결과를 재사용한다.
  if (import.meta.env.PROD) return null;
  if (!available) return null;

  const setModalOpen = (next) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const buttonStyle = isAnchor
    ? {
        minHeight: 36,
        padding: '7px 9px',
        border: '1px solid #99f6e4',
        borderRadius: 8,
        background: '#f0fdfa',
        color: '#0f766e',
        fontSize: 11,
        fontWeight: 800,
        cursor: 'pointer',
        touchAction: 'manipulation',
        whiteSpace: 'nowrap',
      }
    : {
        width: '100%',
        minHeight: 44,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        border: 'none',
        borderRadius: 8,
        background: 'linear-gradient(135deg,#0f766e,#0e7490)',
        color: '#fff',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: '.02em',
        boxShadow: '0 2px 8px rgba(14,116,144,.30)',
        cursor: 'pointer',
        touchAction: 'manipulation',
        whiteSpace: 'nowrap',
      };

  return (
    <>
      <button
        type="button"
        data-research-tool={isAnchor ? 'lexical-bridge-anchor' : 'lexical-bridge-global'}
        aria-label={isAnchor ? `${normalizedStrong} 원어 브릿지 열기` : '원어 브릿지 열기'}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={isAnchor
          ? '이 원어의 MT–LXX–NT 연결점 보기'
          : 'MT–LXX–NT 정경 원어 연결 연구'}
        onClick={() => setModalOpen(true)}
        style={buttonStyle}
      >
        <span aria-hidden="true">🧬</span>
        <span>원어 브릿지</span>
      </button>

      {open && (
        <Suspense fallback={<div className="deferred-feature-loading">원어 브릿지를 불러오는 중…</div>}>
          <LexicalBridgeModal
            initialStrong={normalizedStrong}
            onClose={() => setModalOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
