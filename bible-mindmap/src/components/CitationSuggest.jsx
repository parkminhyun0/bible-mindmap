import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { buildSuggestions, formatReference } from '../utils/citationDetector';
import useMobile from '../hooks/useMobile';

const OFFSET_KEY = 'citation-suggest-offset-v1';

function loadOffset() {
  try {
    return JSON.parse(localStorage.getItem(OFFSET_KEY)) || { x: 0, y: 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

function referenceForNode(node) {
  if (!node?.data) return '';
  if (node.data.reference) return node.data.reference;
  return formatReference({
    bookId: node.data.bookId,
    chapter: node.data.chapter,
    verseStart: node.data.verseStart,
    verseEnd: node.data.verseEnd,
  });
}

export default function CitationSuggest({
  selectedNode,
  nodes,
  edges,
  onAddCitation,
  onConnectExisting,
  onAddAll,
}) {
  const isMobile = useMobile();
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [offset, setOffset] = useState(loadOffset);
  const [panelTop, setPanelTop] = useState(96);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [showAdditional, setShowAdditional] = useState(false);
  const dragStartRef = useRef(null);
  const panelRef = useRef(null);

  const clampOffset = (next) => {
    const panel = panelRef.current;
    const container = panel?.offsetParent;
    if (!panel || !container) return next;

    const panelRect = panel.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const baseLeft = containerRect.width - 16 - panelRect.width;
    const minX = 8 - baseLeft;
    const maxX = containerRect.width - 8 - panelRect.width - baseLeft;
    const maxY = containerRect.height - 8 - panelRect.height - panelTop;

    return {
      x: Math.min(Math.max(next.x, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(next.y, 0), Math.max(0, maxY)),
    };
  };

  const startDrag = (event) => {
    if (isMobile) return;
    event.preventDefault();
    dragStartRef.current = {
      mx: event.clientX,
      my: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    const move = (moveEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      setOffset(clampOffset({
        x: start.ox + (moveEvent.clientX - start.mx),
        y: start.oy + (moveEvent.clientY - start.my),
      }));
    };
    const up = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setOffset((current) => {
        try { localStorage.setItem(OFFSET_KEY, JSON.stringify(current)); } catch {}
        return current;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const resetPosition = () => {
    setOffset({ x: 0, y: 0 });
    try { localStorage.removeItem(OFFSET_KEY); } catch {}
  };

  useLayoutEffect(() => {
    if (isMobile) return undefined;

    const placeBelowToolbar = () => {
      const panel = panelRef.current;
      const container = panel?.offsetParent;
      const toolbar = container?.querySelector('[data-node-editor-toolbar="true"]');
      if (!container || !toolbar) return;
      const containerRect = container.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      setPanelTop(Math.max(16, toolbarRect.bottom - containerRect.top + 12));
    };

    placeBelowToolbar();
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(placeBelowToolbar);
    const toolbar = panelRef.current?.offsetParent?.querySelector('[data-node-editor-toolbar="true"]');
    if (toolbar) observer?.observe(toolbar);
    window.addEventListener('resize', placeBelowToolbar);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', placeBelowToolbar);
    };
  }, [isMobile, selectedNode?.id]);

  useLayoutEffect(() => {
    if (isMobile || !panelRef.current) return;
    setOffset((current) => clampOffset(current));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, panelTop, collapsed, suggestions.length]);

  useEffect(() => {
    setMobileSheetOpen(false);
    setSelectedKeys(new Set());
    setShowAdditional(false);
  }, [selectedNode?.id]);

  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'verse') {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    setCollapsed(false);
    setErrorMsg('');
    setLoadingKey(null);
    buildSuggestions(selectedNode, nodes, edges)
      .then((result) => {
        if (!cancelled) {
          setSuggestions(result);
          setLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => { cancelled = true; };
  }, [selectedNode?.id, nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedNode || selectedNode.type !== 'verse') return null;

  const pending = suggestions.filter((item) => !item.alreadyConnected);
  const manualSuggestions = suggestions.filter((item) => !item.isCrossref);
  const crossrefSuggestions = suggestions.filter((item) => item.isCrossref);
  const firstNote = manualSuggestions[0]?.note;
  const dragged = offset.x !== 0 || offset.y !== 0;
  const selectedPending = pending.filter((item) => selectedKeys.has(item.key));

  const stopPropagation = (event) => event.stopPropagation();

  const handleOne = async (suggestion) => {
    setLoadingKey(suggestion.key);
    setErrorMsg('');
    try {
      if (suggestion.existingNode && !suggestion.alreadyConnected) {
        onConnectExisting(suggestion.existingNode.id, selectedNode.id);
      } else if (!suggestion.existingNode) {
        await onAddCitation(suggestion.source, selectedNode.id, suggestion.isCrossref);
      }
    } catch (error) {
      setErrorMsg(error.message || '추가 실패');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleAll = async () => {
    setLoadingKey('__all__');
    setErrorMsg('');
    try {
      await onAddAll(pending, selectedNode.id);
      if (isMobile) setMobileSheetOpen(false);
    } catch (error) {
      setErrorMsg(error.message || '일괄 추가 실패');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleSelected = async () => {
    if (selectedPending.length === 0) return;
    setLoadingKey('__selected__');
    setErrorMsg('');
    try {
      await onAddAll(selectedPending, selectedNode.id);
      setSelectedKeys(new Set());
      setMobileSheetOpen(false);
    } catch (error) {
      setErrorMsg(error.message || '선택 항목 추가 실패');
    } finally {
      setLoadingKey(null);
    }
  };

  const toggleSelected = (suggestion) => {
    if (suggestion.alreadyConnected || loadingKey) return;
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(suggestion.key)) next.delete(suggestion.key);
      else next.add(suggestion.key);
      return next;
    });
  };

  if (isMobile) {
    if (!mobileSheetOpen) {
      if (!loadingSuggestions && suggestions.length === 0) return null;
      return (
        <button
          type="button"
          aria-label="교차 참조 열기"
          onClick={() => setMobileSheetOpen(true)}
          style={mobileLauncherStyle}
          onPointerDown={stopPropagation}
        >
          <span>🔗</span>
          <span>{loadingSuggestions ? '교차 참조 불러오는 중' : `교차 참조 ${suggestions.length}`}</span>
          <span style={{ opacity: 0.65 }}>⌃</span>
        </button>
      );
    }

    return (
      <>
        <button
          type="button"
          aria-label="교차 참조 닫기"
          onClick={() => setMobileSheetOpen(false)}
          style={mobileScrimStyle}
        />
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="교차 참조 추가"
          style={mobileSheetStyle}
          onPointerDown={stopPropagation}
          onTouchStart={stopPropagation}
        >
          <div style={mobileHandleWrapStyle}>
            <div style={mobileHandleStyle} />
          </div>
          <header style={mobileHeaderStyle}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={mobileTitleStyle}>교차 참조 추가</div>
              <div style={mobileReferenceStyle}>{referenceForNode(selectedNode)}</div>
            </div>
            <button
              type="button"
              aria-label="교차 참조 닫기"
              onClick={() => setMobileSheetOpen(false)}
              style={mobileCloseButtonStyle}
            >
              ×
            </button>
          </header>

          <div style={mobileSummaryStyle}>
            <strong>선택 {selectedPending.length}개</strong>
            <span>본문 편집 화면은 그대로 유지됩니다.</span>
          </div>

          <main style={mobileBodyStyle}>
            {loadingSuggestions ? (
              <div style={mobileEmptyStyle}>교차 참조를 불러오는 중…</div>
            ) : suggestions.length === 0 ? (
              <div style={mobileEmptyStyle}>추가할 교차 참조가 없습니다.</div>
            ) : (
              <>
                {firstNote && <div style={mobileNoteStyle}>💡 {firstNote}</div>}

                <section style={mobileSectionStyle}>
                  <div style={mobileSectionTitleStyle}>핵심 참조 {manualSuggestions.length}개</div>
                  {manualSuggestions.map((suggestion) => (
                    <MobileSelectItem
                      key={suggestion.key}
                      suggestion={suggestion}
                      selected={selectedKeys.has(suggestion.key)}
                      onToggle={() => toggleSelected(suggestion)}
                    />
                  ))}
                </section>

                {crossrefSuggestions.length > 0 && (
                  <section style={mobileSectionStyle}>
                    <button
                      type="button"
                      onClick={() => setShowAdditional((value) => !value)}
                      style={mobileDisclosureStyle}
                    >
                      <span>추가 참조 {crossrefSuggestions.length}개</span>
                      <span>{showAdditional ? '⌃' : '⌄'}</span>
                    </button>
                    {showAdditional && crossrefSuggestions.map((suggestion) => (
                      <MobileSelectItem
                        key={suggestion.key}
                        suggestion={suggestion}
                        selected={selectedKeys.has(suggestion.key)}
                        onToggle={() => toggleSelected(suggestion)}
                      />
                    ))}
                  </section>
                )}

                {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}
              </>
            )}
          </main>

          <footer style={mobileFooterStyle}>
            <div style={mobileSelectionPreviewStyle}>
              {selectedPending.length > 0
                ? `${formatReference(selectedPending[0].source)}${selectedPending.length > 1 ? ` 외 ${selectedPending.length - 1}개` : ''}`
                : '필요한 참조만 선택하세요.'}
            </div>
            <button
              type="button"
              onClick={handleSelected}
              disabled={selectedPending.length === 0 || loadingKey === '__selected__'}
              style={{
                ...mobilePrimaryButtonStyle,
                opacity: selectedPending.length === 0 ? 0.45 : 1,
              }}
            >
              {loadingKey === '__selected__'
                ? '추가하고 연결하는 중…'
                : `선택한 ${selectedPending.length}개 추가하고 연결`}
            </button>
            {pending.length > 1 && (
              <button
                type="button"
                onClick={handleAll}
                disabled={loadingKey === '__all__'}
                style={mobileSecondaryButtonStyle}
              >
                {loadingKey === '__all__' ? '전체 추가 중…' : `전체 ${pending.length}개 추가`}
              </button>
            )}
          </footer>
        </section>
      </>
    );
  }

  const desktopPanelStyle = {
    ...panelStyle,
    top: panelTop,
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  };

  if (loadingSuggestions) {
    return (
      <div ref={panelRef} style={desktopPanelStyle} onPointerDown={stopPropagation}>
        <div style={headerStyle}>
          <span style={titleStyle}>🔗 교차 참조 로딩 중…</span>
        </div>
      </div>
    );
  }
  if (suggestions.length === 0) return null;

  return (
    <div ref={panelRef} style={desktopPanelStyle} onPointerDown={stopPropagation}>
      <div
        style={{ ...headerStyle, cursor: 'move', userSelect: 'none' }}
        onMouseDown={startDrag}
        title="드래그하여 이동"
      >
        <span style={titleStyle}>
          <span style={{ color: '#cbd5e1', marginRight: 4 }}>⋮⋮</span>
          🔗 교차 참조 ({suggestions.length}건)
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {dragged && (
            <button onClick={resetPosition} onMouseDown={stopPropagation} style={collapseBtnStyle}>⤺</button>
          )}
          <button
            onClick={() => setCollapsed((value) => !value)}
            onMouseDown={stopPropagation}
            style={collapseBtnStyle}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {firstNote && <div style={noteStyle}>💡 {firstNote}</div>}
          <div style={listStyle}>
            {manualSuggestions.map((suggestion) => renderDesktopItem(suggestion, loadingKey, handleOne))}
            {manualSuggestions.length > 0 && crossrefSuggestions.length > 0 && (
              <div style={dividerStyle}>OpenBible 교차 참조</div>
            )}
            {crossrefSuggestions.map((suggestion) => renderDesktopItem(suggestion, loadingKey, handleOne))}
          </div>
          {pending.length > 1 && (
            <button onClick={handleAll} disabled={loadingKey === '__all__'} style={allButtonStyle}>
              {loadingKey === '__all__' ? '추가 중…' : `✚ 모두 추가하고 자동 연결 (${pending.length}건)`}
            </button>
          )}
          {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}
        </>
      )}
    </div>
  );
}

function MobileSelectItem({ suggestion, selected, onToggle }) {
  const isDone = suggestion.alreadyConnected;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDone}
      style={{
        ...mobileItemStyle,
        borderColor: selected ? '#2563eb' : '#dbe3ef',
        background: selected ? '#eff6ff' : '#fff',
        opacity: isDone ? 0.58 : 1,
      }}
    >
      <span style={{
        ...mobileCheckStyle,
        background: selected ? '#2563eb' : '#fff',
        color: selected ? '#fff' : '#94a3b8',
      }}>
        {isDone || selected ? '✓' : ''}
      </span>
      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
        <span style={mobileItemTitleStyle}>
          📖 {formatReference(suggestion.source)}
          {suggestion.part && <span style={partBadgeStyle}>{suggestion.part}</span>}
          {suggestion.isCrossref && suggestion.votes != null && (
            <span style={votesBadgeStyle}>↑{suggestion.votes}</span>
          )}
        </span>
        <span style={mobileItemStatusStyle}>
          {isDone
            ? '이미 연결됨'
            : suggestion.existingNode
              ? '캔버스의 기존 노드와 연결'
              : '새 노드 생성 후 자동 연결'}
        </span>
      </span>
    </button>
  );
}

function renderDesktopItem(suggestion, loadingKey, handleOne) {
  const isLoading = loadingKey === suggestion.key;
  const isDone = suggestion.alreadyConnected;
  return (
    <div key={suggestion.key} style={itemStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={itemReferenceStyle}>
          📖 {formatReference(suggestion.source)}
          {suggestion.part && <span style={partBadgeStyle}>{suggestion.part}</span>}
          {suggestion.isCrossref && suggestion.votes != null && (
            <span style={votesBadgeStyle}>↑{suggestion.votes}</span>
          )}
        </div>
        <div style={itemStatusStyle}>
          {isDone ? '✓ 이미 연결됨' : suggestion.existingNode ? '⚡ 엣지만 연결' : '+ 노드 생성 + 엣지 연결'}
        </div>
      </div>
      <button
        onClick={() => handleOne(suggestion)}
        disabled={isDone || isLoading}
        style={{
          ...actionButtonStyle,
          background: isDone ? '#e5e7eb' : suggestion.isCrossref ? '#0ea5e9' : '#6366f1',
          color: isDone ? '#94a3b8' : '#fff',
        }}
      >
        {isLoading ? '…' : isDone ? '완료' : '추가'}
      </button>
    </div>
  );
}

const panelStyle = {
  position: 'absolute',
  right: 16,
  zIndex: 40,
  width: 320,
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
};

const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const titleStyle = { fontSize: 13, fontWeight: 700, color: '#1e293b' };
const collapseBtnStyle = { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: '2px 6px' };
const noteStyle = { fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '6px 8px', borderRadius: 6, lineHeight: 1.4 };
const dividerStyle = { fontSize: 10, color: '#94a3b8', fontWeight: 600, borderTop: '1px solid #e2e8f0', marginTop: 2, paddingTop: 6 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' };
const itemStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' };
const itemReferenceStyle = { fontSize: 12, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 };
const itemStatusStyle = { fontSize: 10, marginTop: 2, fontWeight: 500, color: '#94a3b8' };
const actionButtonStyle = { padding: '4px 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 5, flexShrink: 0 };
const allButtonStyle = { padding: '8px 0', fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6 };
const partBadgeStyle = { fontSize: 10, color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: 8, fontWeight: 500 };
const votesBadgeStyle = { fontSize: 10, color: '#0ea5e9', background: '#e0f2fe', padding: '1px 6px', borderRadius: 8, fontWeight: 600 };
const errorStyle = { fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: '6px 8px', borderRadius: 6, lineHeight: 1.4 };

const mobileLauncherStyle = {
  position: 'fixed',
  right: 12,
  top: 'calc(env(safe-area-inset-top, 0px) + 94px)',
  zIndex: 1500,
  minHeight: 42,
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '8px 12px',
  border: '1px solid rgba(99,102,241,0.24)',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.96)',
  color: '#4338ca',
  boxShadow: '0 8px 22px rgba(15,23,42,0.14)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  fontSize: 12,
  fontWeight: 800,
};
const mobileScrimStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 3090,
  border: 'none',
  background: 'rgba(15,23,42,0.28)',
};
const mobileSheetStyle = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 3100,
  height: 'min(78dvh, 720px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: '24px 24px 0 0',
  background: '#f6f8fc',
  boxShadow: '0 -18px 52px rgba(15,23,42,0.22)',
  fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
};
const mobileHandleWrapStyle = { padding: '8px 0 2px', display: 'grid', placeItems: 'center', background: '#fff' };
const mobileHandleStyle = { width: 42, height: 5, borderRadius: 999, background: '#cbd5e1' };
const mobileHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px 12px',
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
};
const mobileCloseButtonStyle = { width: 40, height: 40, border: 'none', borderRadius: 12, background: '#f1f5f9', color: '#475569', fontSize: 24 };
const mobileTitleStyle = { fontSize: 17, fontWeight: 800, color: '#0f172a' };
const mobileReferenceStyle = { fontSize: 12, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const mobileSummaryStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11 };
const mobileBodyStyle = { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 14px 14px' };
const mobileEmptyStyle = { padding: '48px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 14 };
const mobileNoteStyle = { marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: '#eef2ff', color: '#4f46e5', fontSize: 12, lineHeight: 1.5 };
const mobileSectionStyle = { display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 };
const mobileSectionTitleStyle = { padding: '0 2px', fontSize: 12, fontWeight: 800, color: '#64748b' };
const mobileDisclosureStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 13px', border: '1px solid #dbe3ef', borderRadius: 12, background: '#fff', color: '#475569', fontSize: 13, fontWeight: 800 };
const mobileItemStyle = { width: '100%', minHeight: 68, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1.5px solid', borderRadius: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' };
const mobileCheckStyle = { width: 26, height: 26, flexShrink: 0, display: 'grid', placeItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 15, fontWeight: 900 };
const mobileItemTitleStyle = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, color: '#1e293b', fontSize: 14, fontWeight: 800 };
const mobileItemStatusStyle = { display: 'block', marginTop: 5, color: '#94a3b8', fontSize: 11, fontWeight: 600 };
const mobileFooterStyle = { padding: '10px 14px calc(env(safe-area-inset-bottom, 0px) + 10px)', background: 'rgba(255,255,255,0.98)', borderTop: '1px solid #e2e8f0', boxShadow: '0 -8px 24px rgba(15,23,42,0.08)' };
const mobileSelectionPreviewStyle = { minHeight: 18, marginBottom: 7, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const mobilePrimaryButtonStyle = { width: '100%', minHeight: 46, border: 'none', borderRadius: 14, background: '#10b981', color: '#fff', fontSize: 15, fontWeight: 900 };
const mobileSecondaryButtonStyle = { width: '100%', minHeight: 32, marginTop: 4, border: 'none', background: 'transparent', color: '#64748b', fontSize: 12, fontWeight: 700 };
