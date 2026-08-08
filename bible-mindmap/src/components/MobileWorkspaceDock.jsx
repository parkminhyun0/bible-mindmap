import { useUnifiedVisitorCount } from '../hooks/useUnifiedVisitorCount';

const ITEMS = [
  { id: 'add', icon: '＋', label: '추가' },
  { id: 'edit', icon: '✎', label: '편집' },
  { id: 'fit', icon: '⌗', label: '전체보기' },
  { id: 'save', icon: '▣', label: '저장' },
];

export default function MobileWorkspaceDock({
  activeSurface,
  hasSelection,
  onAdd,
  onEdit,
  onFit,
  onSave,
}) {
  const handlers = { add: onAdd, edit: onEdit, fit: onFit, save: onSave };
  const counts = useUnifiedVisitorCount();
  const format = (value) => Number.isFinite(value) ? value.toLocaleString('ko-KR') : '–';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 120,
        pointerEvents: 'none',
      }}
    >
      <aside
        aria-label="앱 접속자 현황"
        style={{
          width: 146,
          maxWidth: 'calc(100vw - 24px)',
          margin: '0 12px 8px auto',
          padding: '8px 10px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(15,23,42,.94)',
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 28px rgba(0,0,0,.32)',
          pointerEvents: 'auto',
          color: '#e2e8f0',
        }}
      >
        <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, marginBottom: 7, letterSpacing: '.04em' }}>
          👥 접속자 현황
        </div>
        <div role="status" aria-live="polite" style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', alignItems: 'center', gap: 6 }}>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: 17, lineHeight: 1, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>{format(counts.today)}</strong>
            <span style={{ display: 'block', marginTop: 5, fontSize: 8.5, color: '#94a3b8' }}>투데이</span>
          </div>
          <span aria-hidden="true" style={{ width: 1, height: 26, background: 'rgba(255,255,255,.13)' }} />
          <div style={{ textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: 17, lineHeight: 1, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>{format(counts.total)}</strong>
            <span style={{ display: 'block', marginTop: 5, fontSize: 8.5, color: '#94a3b8' }}>총 합계</span>
          </div>
        </div>
      </aside>

      <nav className="mobile-workspace-dock" aria-label="모바일 작업 메뉴" style={{ position: 'relative', pointerEvents: 'auto' }}>
        {ITEMS.map((item) => {
          const disabled = item.id === 'edit' && !hasSelection;
          const active = activeSurface === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-workspace-dock__item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={disabled ? '편집할 노드를 먼저 선택하세요' : item.label}
              disabled={disabled}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handlers[item.id]}
            >
              <span className="mobile-workspace-dock__icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
