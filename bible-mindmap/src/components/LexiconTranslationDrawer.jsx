import { useMemo } from 'react';

function DefinitionNode({ node, depth = 0 }) {
  return (
    <div style={{ marginTop: depth === 0 ? 0 : 6 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3.6em minmax(0, 1fr)',
        gap: 7,
        paddingLeft: depth * 10,
        alignItems: 'start',
      }}>
        <span style={{
          color: depth === 0 ? '#92400e' : '#64748b',
          fontFamily: 'monospace',
          fontSize: depth === 0 ? 12 : 11,
          fontWeight: 700,
          lineHeight: 1.65,
        }}>
          {node.id}
        </span>
        <span style={{
          color: '#1e293b',
          fontSize: depth === 0 ? 14 : 13,
          fontWeight: depth <= 1 ? 700 : 500,
          lineHeight: 1.65,
          wordBreak: 'keep-all',
        }}>
          {node.text}
        </span>
      </div>
      {node.children?.map((child) => (
        <DefinitionNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function MetadataCard({ label, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '5.8em minmax(0, 1fr)',
      gap: 8,
      padding: '9px 0',
      borderTop: '1px solid #f1f5f9',
      alignItems: 'start',
    }}>
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>{label}</span>
      <span style={{ color: '#334155', fontSize: 12, lineHeight: 1.65 }}>{children}</span>
    </div>
  );
}

export default function LexiconTranslationDrawer({
  open,
  translation,
  isMobile,
  popupRect,
  onClose,
  zIndex = 2502,
}) {
  const geometry = useMemo(() => {
    const {
      left = 0,
      top = 0,
      width = 380,
      maxHeight = 600,
      viewportWidth = 1200,
      margin = 12,
    } = popupRect || {};

    if (isMobile) {
      return {
        left,
        top,
        width,
        height: maxHeight,
        opensLeft: false,
      };
    }

    const rightSpace = Math.max(0, viewportWidth - (left + width) - margin - 8);
    const leftSpace = Math.max(0, left - margin - 8);
    const opensLeft = leftSpace > rightSpace;
    const available = Math.max(opensLeft ? leftSpace : rightSpace, 300);
    const drawerWidth = Math.min(420, available);
    const drawerLeft = opensLeft
      ? Math.max(margin, left - drawerWidth - 8)
      : Math.min(viewportWidth - drawerWidth - margin, left + width + 8);

    return {
      left: drawerLeft,
      top,
      width: drawerWidth,
      height: maxHeight,
      opensLeft,
    };
  }, [isMobile, popupRect]);

  if (!translation) return null;

  const hiddenTransform = isMobile
    ? 'translateX(100%)'
    : `translateX(${geometry.opensLeft ? 24 : -24}px)`;

  return (
    <aside
      id={`lexicon-translation-drawer-${translation.strong}`}
      role="dialog"
      aria-modal={isMobile ? 'true' : 'false'}
      aria-hidden={!open}
      aria-label={`${translation.strong} 한국어 사전 번역`}
      data-lexicon-translation-drawer={translation.strong}
      style={{
        position: 'fixed',
        left: geometry.left,
        top: geometry.top,
        width: geometry.width,
        height: geometry.height,
        maxHeight: geometry.height,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: '#fffdf5',
        border: '1px solid #fcd34d',
        borderRadius: isMobile ? '16px 16px 0 0' : 12,
        boxShadow: isMobile
          ? '0 -10px 36px rgba(15,23,42,.28)'
          : '0 16px 48px rgba(15,23,42,.24)',
        overflow: 'hidden',
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
        transform: open ? 'translateX(0)' : hiddenTransform,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
        transition: open
          ? 'transform .24s ease, opacity .18s ease'
          : 'transform .24s ease, opacity .18s ease, visibility 0s linear .24s',
        willChange: 'transform, opacity',
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '11px 12px',
        background: '#fef3c7',
        borderBottom: '1px solid #fde68a',
      }}>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="영어 사전으로 돌아가기"
            style={{
              width: 38,
              height: 38,
              border: 'none',
              borderRadius: 10,
              background: 'rgba(255,255,255,.72)',
              color: '#92400e',
              fontSize: 19,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ‹
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ color: '#92400e', fontSize: 14 }}>{translation.titleKo}</strong>
            <span style={{
              padding: '2px 6px',
              borderRadius: 99,
              background: '#fff',
              color: '#b45309',
              border: '1px solid #fcd34d',
              fontSize: 9,
              fontWeight: 800,
            }}>
              파일럿 · 검수 완료
            </span>
          </div>
          <div style={{ marginTop: 2, color: '#64748b', fontSize: 10 }}>
            {translation.strong} · {translation.lemma} · {translation.translitKo}
          </div>
        </div>
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="한국어 번역 패널 닫기"
            title="번역 패널 닫기 (Esc)"
            style={{
              width: 34,
              height: 34,
              border: 'none',
              borderRadius: 9,
              background: 'rgba(255,255,255,.72)',
              color: '#92400e',
              fontSize: 18,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div
        data-modal-scroll-region="true"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 14px 18px',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
        }}
      >
        <div style={{
          padding: '10px 12px',
          marginBottom: 14,
          borderRadius: 10,
          background: '#fff',
          border: '1px solid #fde68a',
          color: '#78350f',
          fontSize: 11,
          lineHeight: 1.6,
        }}>
          {translation.noticeKo}
        </div>

        <div style={{ marginBottom: 15 }}>
          {translation.definition.map((node) => (
            <DefinitionNode key={node.id} node={node} />
          ))}
        </div>

        <MetadataCard label="어원">
          {translation.originKo}
        </MetadataCard>
        <MetadataCard label={translation.twot.sourceLabel}>
          <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{translation.twot.entry}</span>
        </MetadataCard>
        <MetadataCard label="품사">
          {translation.partOfSpeechKo}
        </MetadataCard>
      </div>

      <div style={{
        padding: '7px 12px',
        borderTop: '1px solid #fde68a',
        background: '#fffbeb',
        color: '#a16207',
        fontSize: 9,
      }}>
        번역 버전 {translation.translationVersion} · 원문 출처 {translation.source}
      </div>
    </aside>
  );
}
