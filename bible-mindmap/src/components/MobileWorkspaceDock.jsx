import { useEffect, useState } from 'react';

const ITEMS = [
  { id: 'add', icon: '＋', label: '추가' },
  { id: 'edit', icon: '✎', label: '편집' },
  { id: 'fit', icon: '⌗', label: '전체보기' },
  { id: 'save', icon: '▣', label: '저장' },
];

const COUNTER_NAMESPACE = 'parkminhyun0-bible-mindmap';

function useMobileVisitorCounts() {
  const [counts, setCounts] = useState({ today: null, total: null });

  useEffect(() => {
    let cancelled = false;
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const entries = [
      { field: 'today', name: `app-visits-${date}`, flag: `bmm-app-today-counted-${date}`, cache: `bmm-app-today-cache-${date}` },
      { field: 'total', name: 'app-visits', flag: 'bmm-app-total-counted-v2', cache: 'bmm-app-total-cache-v2' },
    ];

    const read = (key) => {
      try { return localStorage.getItem(key); } catch { return null; }
    };
    const write = (key, value) => {
      try { localStorage.setItem(key, String(value)); } catch {}
    };
    const request = async (entry, increment) => {
      const suffix = increment ? '/up' : '/';
      const response = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${entry.name}${suffix}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`counter ${response.status}`);
      const data = await response.json();
      const value = data.count ?? data.value;
      if (value == null) throw new Error('counter value missing');
      return Number(value);
    };

    Promise.all(entries.map(async (entry) => {
      const counted = read(entry.flag) === '1';
      try {
        const value = await request(entry, !counted);
        write(entry.cache, value);
        if (!counted) write(entry.flag, '1');
        return [entry.field, value];
      } catch {
        const cached = read(entry.cache);
        return [entry.field, cached == null ? null : Number(cached)];
      }
    })).then((pairs) => {
      if (!cancelled) setCounts(Object.fromEntries(pairs));
    });

    return () => { cancelled = true; };
  }, []);

  return counts;
}

export default function MobileWorkspaceDock({
  activeSurface,
  hasSelection,
  onAdd,
  onEdit,
  onFit,
  onSave,
}) {
  const handlers = { add: onAdd, edit: onEdit, fit: onFit, save: onSave };
  const counts = useMobileVisitorCounts();
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
