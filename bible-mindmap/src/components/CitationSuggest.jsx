import { useEffect, useMemo, useState } from 'react';
import { buildSuggestions, formatReference } from '../utils/citationDetector';
import useMobile from '../hooks/useMobile';

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
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [showAdditional, setShowAdditional] = useState(false);

  useEffect(() => {
    setOpen(false);
    setSelectedKeys(new Set());
    setShowAdditional(false);
    setErrorMsg('');
  }, [selectedNode?.id]);

  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'verse') {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingSuggestions(true);
    setErrorMsg('');

    buildSuggestions(selectedNode, nodes, edges)
      .then((result) => {
        if (cancelled) return;
        setSuggestions(result);
        setLoadingSuggestions(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setLoadingSuggestions(false);
        setErrorMsg('교차 참조를 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNode?.id, nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useMemo(
    () => suggestions.filter((item) => !item.alreadyConnected),
    [suggestions],
  );
  const manualSuggestions = useMemo(
    () => suggestions.filter((item) => !item.isCrossref),
    [suggestions],
  );
  const crossrefSuggestions = useMemo(
    () => suggestions.filter((item) => item.isCrossref),
    [suggestions],
  );
  const selectedPending = useMemo(
    () => pending.filter((item) => selectedKeys.has(item.key)),
    [pending, selectedKeys],
  );

  if (!selectedNode || selectedNode.type !== 'verse') return null;

  const stopPropagation = (event) => event.stopPropagation();

  const toggleSelected = (suggestion) => {
    if (suggestion.alreadyConnected || loadingKey) return;
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(suggestion.key)) next.delete(suggestion.key);
      else next.add(suggestion.key);
      return next;
    });
  };

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
      setErrorMsg(error?.message || '추가하지 못했습니다.');
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
    } catch (error) {
      setErrorMsg(error?.message || '선택 항목을 추가하지 못했습니다.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleAll = async () => {
    if (pending.length === 0) return;
    setLoadingKey('__all__');
    setErrorMsg('');
    try {
      await onAddAll(pending, selectedNode.id);
      setSelectedKeys(new Set());
    } catch (error) {
      setErrorMsg(error?.message || '전체 항목을 추가하지 못했습니다.');
    } finally {
      setLoadingKey(null);
    }
  };

  const launcherLabel = loadingSuggestions
    ? '교차 참조 불러오는 중'
    : `교차 참조 ${suggestions.length}`;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="cross-reference-assist-panel"
        aria-label={open ? '교차 참조 닫기' : '교차 참조 열기'}
        onClick={() => setOpen((value) => !value)}
        onPointerDown={stopPropagation}
        style={{
          ...launcherStyle,
          ...(isMobile ? mobileLauncherPosition : desktopLauncherPosition),
          ...(open ? launcherActiveStyle : null),
        }}
      >
        <span aria-hidden="true">🔗</span>
        <span>{launcherLabel}</span>
        <span aria-hidden="true" style={{ opacity: 0.7 }}>{open ? '›' : '‹'}</span>
      </button>

      {open && isMobile && (
        <button
          type="button"
          aria-label="교차 참조 닫기"
          onClick={() => setOpen(false)}
          style={mobileScrimStyle}
        />
      )}

      <aside
        id="cross-reference-assist-panel"
        role="dialog"
        aria-modal={isMobile ? 'true' : 'false'}
        aria-label="교차 참조"
        aria-hidden={!open}
        onPointerDown={stopPropagation}
        onTouchStart={stopPropagation}
        style={{
          ...drawerBaseStyle,
          ...(isMobile ? mobileDrawerStyle : desktopDrawerStyle),
          ...(open
            ? (isMobile ? mobileDrawerOpenStyle : desktopDrawerOpenStyle)
            : (isMobile ? mobileDrawerClosedStyle : desktopDrawerClosedStyle)),
        }}
      >
        <header style={headerStyle}>
          {isMobile && <div style={mobileHandleStyle} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={titleStyle}>교차 참조</div>
            <div style={referenceStyle}>{referenceForNode(selectedNode)}</div>
          </div>
          <button
            type="button"
            aria-label="교차 참조 닫기"
            onClick={() => setOpen(false)}
            style={closeButtonStyle}
          >
            ×
          </button>
        </header>

        <div style={summaryStyle}>
          <span>{loadingSuggestions ? '참조 검색 중' : `전체 ${suggestions.length}개`}</span>
          <span>선택 {selectedPending.length}개</span>
        </div>

        <main style={bodyStyle}>
          {loadingSuggestions ? (
            <div style={emptyStyle}>교차 참조를 불러오는 중…</div>
          ) : suggestions.length === 0 ? (
            <div style={emptyStyle}>등록된 교차 참조가 없습니다.</div>
          ) : (
            <>
              {manualSuggestions.length > 0 && (
                <section style={sectionStyle}>
                  <div style={sectionTitleStyle}>핵심 참조 {manualSuggestions.length}</div>
                  {manualSuggestions.map((suggestion) => (
                    <SuggestionItem
                      key={suggestion.key}
                      suggestion={suggestion}
                      selected={selectedKeys.has(suggestion.key)}
                      loading={loadingKey === suggestion.key}
                      onToggle={() => toggleSelected(suggestion)}
                      onAdd={() => handleOne(suggestion)}
                    />
                  ))}
                </section>
              )}

              {crossrefSuggestions.length > 0 && (
                <section style={sectionStyle}>
                  <button
                    type="button"
                    onClick={() => setShowAdditional((value) => !value)}
                    style={disclosureStyle}
                  >
                    <span>추가 참조 {crossrefSuggestions.length}</span>
                    <span>{showAdditional ? '⌃' : '⌄'}</span>
                  </button>
                  {showAdditional && crossrefSuggestions.map((suggestion) => (
                    <SuggestionItem
                      key={suggestion.key}
                      suggestion={suggestion}
                      selected={selectedKeys.has(suggestion.key)}
                      loading={loadingKey === suggestion.key}
                      onToggle={() => toggleSelected(suggestion)}
                      onAdd={() => handleOne(suggestion)}
                    />
                  ))}
                </section>
              )}

              {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}
            </>
          )}
        </main>

        <footer style={footerStyle}>
          <button
            type="button"
            onClick={handleSelected}
            disabled={selectedPending.length === 0 || loadingKey === '__selected__'}
            style={{
              ...primaryButtonStyle,
              opacity: selectedPending.length === 0 ? 0.45 : 1,
            }}
          >
            {loadingKey === '__selected__'
              ? '추가 중…'
              : `선택한 ${selectedPending.length}개 추가하고 연결`}
          </button>
          {pending.length > 1 && (
            <button
              type="button"
              onClick={handleAll}
              disabled={loadingKey === '__all__'}
              style={secondaryButtonStyle}
            >
              {loadingKey === '__all__' ? '전체 추가 중…' : `전체 ${pending.length}개 추가`}
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}

function SuggestionItem({ suggestion, selected, loading, onToggle, onAdd }) {
  const reference = formatReference(suggestion.source);
  const disabled = suggestion.alreadyConnected || loading;
  return (
    <article style={itemStyle}>
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onToggle}
        style={{
          ...checkButtonStyle,
          ...(selected ? checkButtonSelectedStyle : null),
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {suggestion.alreadyConnected ? '✓' : selected ? '✓' : ''}
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={itemReferenceStyle}>{reference}</div>
        {suggestion.part && <div style={itemPartStyle}>{suggestion.part}</div>}
        {suggestion.note && <div style={itemNoteStyle}>{suggestion.note}</div>}
      </div>
      {!suggestion.alreadyConnected && (
        <button type="button" onClick={onAdd} disabled={loading} style={itemAddButtonStyle}>
          {loading ? '…' : '추가'}
        </button>
      )}
    </article>
  );
}

const launcherStyle = {
  position: 'absolute',
  zIndex: 48,
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid var(--at-separator, rgba(15, 23, 42, 0.16))',
  background: 'var(--at-glass-thick, rgba(255,255,255,0.92))',
  color: 'var(--at-label, #0f172a)',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 180ms ease, transform 180ms ease, right 240ms ease',
};

const launcherActiveStyle = {
  background: '#2563eb',
  color: '#fff',
  borderColor: '#2563eb',
};

const desktopLauncherPosition = { top: 104, right: 16 };
const mobileLauncherPosition = { right: 12, bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))' };

const drawerBaseStyle = {
  position: 'absolute',
  zIndex: 47,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'var(--at-glass-thick, rgba(255,255,255,0.96))',
  color: 'var(--at-label, #0f172a)',
  border: '1px solid var(--at-separator, rgba(15, 23, 42, 0.14))',
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.22)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  transition: 'transform 240ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease',
};

const desktopDrawerStyle = {
  top: 92,
  right: 12,
  bottom: 18,
  width: 'min(400px, calc(100% - 48px))',
  borderRadius: 22,
};
const desktopDrawerOpenStyle = { transform: 'translateX(0)', opacity: 1, pointerEvents: 'auto' };
const desktopDrawerClosedStyle = { transform: 'translateX(calc(100% + 28px))', opacity: 0, pointerEvents: 'none' };

const mobileDrawerStyle = {
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: '76dvh',
  minHeight: '48dvh',
  borderRadius: '22px 22px 0 0',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};
const mobileDrawerOpenStyle = { transform: 'translateY(0)', opacity: 1, pointerEvents: 'auto' };
const mobileDrawerClosedStyle = { transform: 'translateY(calc(100% + 28px))', opacity: 0, pointerEvents: 'none' };

const mobileScrimStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: 46,
  border: 0,
  background: 'rgba(15, 23, 42, 0.24)',
};

const headerStyle = {
  position: 'relative',
  minHeight: 64,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderBottom: '1px solid var(--at-separator, rgba(15, 23, 42, 0.12))',
};
const mobileHandleStyle = {
  position: 'absolute',
  top: 7,
  left: '50%',
  width: 38,
  height: 5,
  borderRadius: 999,
  transform: 'translateX(-50%)',
  background: 'rgba(100, 116, 139, 0.34)',
};
const titleStyle = { fontSize: 16, fontWeight: 800 };
const referenceStyle = { marginTop: 2, fontSize: 12, color: 'var(--at-label-2, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const closeButtonStyle = {
  width: 44,
  height: 44,
  flexShrink: 0,
  border: 0,
  borderRadius: 999,
  background: 'var(--at-fill, rgba(148, 163, 184, 0.16))',
  color: 'inherit',
  fontSize: 24,
  cursor: 'pointer',
};
const summaryStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--at-label-2, #64748b)',
  borderBottom: '1px solid var(--at-separator, rgba(15, 23, 42, 0.08))',
};
const bodyStyle = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 };
const emptyStyle = { padding: '36px 16px', textAlign: 'center', color: 'var(--at-label-2, #64748b)', fontSize: 13 };
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 };
const sectionTitleStyle = { padding: '2px 2px 4px', fontSize: 12, fontWeight: 800, color: 'var(--at-label-2, #64748b)' };
const disclosureStyle = {
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '0 12px',
  border: 0,
  borderRadius: 12,
  background: 'var(--at-fill, rgba(148, 163, 184, 0.12))',
  color: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};
const itemStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: 11,
  borderRadius: 14,
  border: '1px solid var(--at-separator, rgba(15, 23, 42, 0.1))',
  background: 'var(--at-glass, rgba(255,255,255,0.62))',
};
const checkButtonStyle = {
  width: 28,
  height: 28,
  flexShrink: 0,
  borderRadius: 9,
  border: '1px solid rgba(100, 116, 139, 0.38)',
  background: 'transparent',
  color: '#fff',
  fontWeight: 900,
  cursor: 'pointer',
};
const checkButtonSelectedStyle = { background: '#2563eb', borderColor: '#2563eb' };
const itemReferenceStyle = { fontSize: 13, fontWeight: 800 };
const itemPartStyle = { marginTop: 3, fontSize: 12, color: 'var(--at-label-2, #475569)' };
const itemNoteStyle = { marginTop: 4, fontSize: 11, lineHeight: 1.45, color: 'var(--at-label-3, #64748b)' };
const itemAddButtonStyle = {
  minWidth: 52,
  minHeight: 36,
  flexShrink: 0,
  border: 0,
  borderRadius: 10,
  background: '#e0e7ff',
  color: '#3730a3',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};
const errorStyle = { marginTop: 10, padding: 10, borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 12 };
const footerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 12,
  borderTop: '1px solid var(--at-separator, rgba(15, 23, 42, 0.1))',
};
const primaryButtonStyle = {
  minHeight: 44,
  border: 0,
  borderRadius: 12,
  background: '#2563eb',
  color: '#fff',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
};
const secondaryButtonStyle = {
  minHeight: 40,
  border: 0,
  borderRadius: 12,
  background: 'var(--at-fill, rgba(148, 163, 184, 0.14))',
  color: 'inherit',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};
