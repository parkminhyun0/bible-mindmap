import { useState, useEffect } from 'react';
import { buildSuggestions, formatReference } from '../utils/citationDetector';

export default function CitationSuggest({
  selectedNode,
  nodes,
  edges,
  onAddCitation,
  onConnectExisting,
  onAddAll,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 선택 노드 변경 시 제안 목록 (재)로드 — buildSuggestions는 이제 async
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
    buildSuggestions(selectedNode, nodes, edges).then((result) => {
      if (!cancelled) {
        setSuggestions(result);
        setLoadingSuggestions(false);
      }
    });
    return () => { cancelled = true; };
  // nodes/edges 변경 시에도 재계산 (연결 상태 갱신)
  }, [selectedNode?.id, nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedNode || selectedNode.type !== 'verse') return null;
  if (loadingSuggestions) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>🔗 교차 참조 로딩 중…</span>
        </div>
      </div>
    );
  }
  if (suggestions.length === 0) return null;

  const pending = suggestions.filter((s) => !s.existingNode || !s.alreadyConnected);

  const handleOne = async (sugg) => {
    setLoadingKey(sugg.key);
    setErrorMsg('');
    try {
      if (sugg.existingNode && !sugg.alreadyConnected) {
        onConnectExisting(sugg.existingNode.id, selectedNode.id);
      } else if (!sugg.existingNode) {
        await onAddCitation(sugg.source, selectedNode.id, sugg.isCrossref);
      }
    } catch (e) {
      setErrorMsg(e.message || '추가 실패');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleAll = async () => {
    setLoadingKey('__all__');
    setErrorMsg('');
    try {
      await onAddAll(pending, selectedNode.id);
    } catch (e) {
      setErrorMsg(e.message || '일괄 추가 실패');
    } finally {
      setLoadingKey(null);
    }
  };

  // 수동 인용과 crossref 구분
  const manualSuggs = suggestions.filter((s) => !s.isCrossref);
  const crossrefSuggs = suggestions.filter((s) => s.isCrossref);
  const firstNote = manualSuggs[0]?.note;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>
          🔗 교차 참조 ({suggestions.length}건)
        </span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          style={collapseBtnStyle}
          title={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {!collapsed && (
        <>
          {firstNote && (
            <div style={noteStyle}>💡 {firstNote}</div>
          )}

          <div style={listStyle}>
            {/* 수동 인용 */}
            {manualSuggs.map((sugg) => renderItem(sugg, loadingKey, handleOne))}

            {/* crossref 구분선 */}
            {manualSuggs.length > 0 && crossrefSuggs.length > 0 && (
              <div style={dividerStyle}>
                <span>OpenBible 교차 참조</span>
              </div>
            )}

            {/* crossref 항목 */}
            {crossrefSuggs.map((sugg) => renderItem(sugg, loadingKey, handleOne))}
          </div>

          {pending.length > 1 && (
            <button
              onClick={handleAll}
              disabled={loadingKey === '__all__'}
              style={{
                ...allBtnStyle,
                opacity: loadingKey === '__all__' ? 0.6 : 1,
                cursor: loadingKey === '__all__' ? 'default' : 'pointer',
              }}
            >
              {loadingKey === '__all__'
                ? '추가 중...'
                : `✚ 모두 추가하고 자동 연결 (${pending.length}건)`}
            </button>
          )}

          {errorMsg && (
            <div style={errorStyle}>⚠️ {errorMsg}</div>
          )}
        </>
      )}
    </div>
  );
}

function renderItem(sugg, loadingKey, handleOne) {
  const refText = formatReference(sugg.source);
  const isLoading = loadingKey === sugg.key;
  const isDone = sugg.alreadyConnected;

  return (
    <div key={sugg.key} style={itemStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={itemRefStyle}>
          📖 {refText}
          {sugg.part && <span style={partBadgeStyle}>{sugg.part}</span>}
          {sugg.isCrossref && sugg.votes != null && (
            <span style={votesBadgeStyle}>↑{sugg.votes}</span>
          )}
        </div>
        <div style={itemStatusStyle}>
          {isDone && <span style={{ color: '#10b981' }}>✓ 이미 연결됨</span>}
          {!isDone && sugg.existingNode && (
            <span style={{ color: '#f59e0b' }}>⚡ 캔버스에 있음 — 엣지만 연결</span>
          )}
          {!isDone && !sugg.existingNode && (
            <span style={{ color: '#94a3b8' }}>+ 노드 생성 + 엣지 연결</span>
          )}
        </div>
      </div>

      <button
        onClick={() => handleOne(sugg)}
        disabled={isDone || isLoading}
        style={{
          ...actionBtnStyle,
          background: isDone ? '#e5e7eb' : sugg.isCrossref ? '#0ea5e9' : '#6366f1',
          color: isDone ? '#94a3b8' : '#fff',
          cursor: isDone || isLoading ? 'default' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? '...' : isDone ? '완료' : '추가'}
      </button>
    </div>
  );
}

const panelStyle = {
  position: 'absolute',
  top: 96,
  right: 16,
  zIndex: 8,
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

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const titleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: '#1e293b',
};

const collapseBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 11,
  padding: '2px 6px',
};

const noteStyle = {
  fontSize: 11,
  color: '#6366f1',
  background: '#eef2ff',
  padding: '6px 8px',
  borderRadius: 6,
  lineHeight: 1.4,
};

const dividerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 10,
  color: '#94a3b8',
  fontWeight: 600,
  padding: '2px 0',
  borderTop: '1px solid #e2e8f0',
  marginTop: 2,
  paddingTop: 6,
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: 300,
  overflowY: 'auto',
};

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  background: '#f8fafc',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
};

const itemRefStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#1e293b',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const partBadgeStyle = {
  fontSize: 10,
  color: '#6366f1',
  background: '#eef2ff',
  padding: '1px 6px',
  borderRadius: 8,
  fontWeight: 500,
};

const votesBadgeStyle = {
  fontSize: 10,
  color: '#0ea5e9',
  background: '#e0f2fe',
  padding: '1px 6px',
  borderRadius: 8,
  fontWeight: 600,
};

const itemStatusStyle = {
  fontSize: 10,
  marginTop: 2,
  fontWeight: 500,
};

const actionBtnStyle = {
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  border: 'none',
  borderRadius: 5,
  flexShrink: 0,
};

const allBtnStyle = {
  padding: '8px 0',
  fontSize: 12,
  fontWeight: 700,
  background: '#10b981',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
};

const errorStyle = {
  fontSize: 11,
  color: '#ef4444',
  background: '#fef2f2',
  padding: '6px 8px',
  borderRadius: 6,
  lineHeight: 1.4,
};
