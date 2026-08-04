const ITEMS = [
  { id: 'add', icon: '＋', label: '추가' },
  { id: 'edit', icon: '✎', label: '편집' },
  { id: 'fit', icon: '⌗', label: '전체보기' },
  { id: 'save', icon: '▣', label: '저장' },
];

const VISITOR_BADGE_URL = 'https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fparkminhyun0.github.io%2Fbible-mindmap%2Fapp%2F&count_bg=%2310b981&title_bg=%231e3a5f&icon=book&icon_color=%23ffffff&title=%EC%A0%91%EC%86%8D%EC%9E%90&edge_flat=true';

export default function MobileWorkspaceDock({
  activeSurface,
  hasSelection,
  onAdd,
  onEdit,
  onFit,
  onSave,
}) {
  const handlers = { add: onAdd, edit: onEdit, fit: onFit, save: onSave };

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
          width: 'fit-content',
          maxWidth: 'calc(100vw - 24px)',
          margin: '0 12px 8px auto',
          padding: '8px 10px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(15,23,42,.92)',
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 28px rgba(0,0,0,.32)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 5, letterSpacing: '.04em' }}>
          👥 접속자 현황 · 투데이 / 총 합계
        </div>
        <img
          src={VISITOR_BADGE_URL}
          alt="앱 접속자 현황 투데이 및 총 합계"
          loading="eager"
          style={{ display: 'block', width: 150, maxWidth: '100%', height: 'auto', borderRadius: 6 }}
        />
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
