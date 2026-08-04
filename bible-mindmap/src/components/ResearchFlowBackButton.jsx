export default function ResearchFlowBackButton({
  onBack,
  label = '검색으로 돌아가기',
  compact = false,
  style,
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={label}
      title={label}
      style={{
        minHeight: 44,
        minWidth: 44,
        padding: compact ? '0 12px' : '0 16px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,.18)',
        background: 'rgba(20,18,40,.92)',
        color: '#fff',
        boxShadow: '0 12px 32px rgba(15,23,42,.24)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
        touchAction: 'manipulation',
        ...style,
      }}
    >
      <span aria-hidden="true">←</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}
