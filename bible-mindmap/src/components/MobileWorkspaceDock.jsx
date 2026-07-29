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

  return (
    <nav className="mobile-workspace-dock" aria-label="모바일 작업 메뉴">
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
  );
}
