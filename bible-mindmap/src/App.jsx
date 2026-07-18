import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import VerseNode from './components/VerseNode';
import NoteNode from './components/NoteNode';
import TopicNode from './components/TopicNode';
import CustomEdge, { EdgeMarkerDefs, EDGE_CONFIGS } from './components/CustomEdge';
import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import SavePanel from './components/SavePanel';
import CitationSuggest from './components/CitationSuggest';
import useHistory from './hooks/useHistory';
import { sampleNodes, sampleEdges } from './data/sampleData';
import { fetchAllTranslations } from './api/bibleApi';
import { formatReference } from './utils/citationDetector';
import { isOT } from './data/bibleBooks';

const STORAGE_KEY = 'bible-mindmap-v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(nodes, edges) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  } catch {
    // 저장 실패 시 무시
  }
}

const nodeTypes = { verse: VerseNode, note: NoteNode, topic: TopicNode };
const edgeTypes = {
  citation: CustomEdge,
  parallel: CustomEdge,
  topic: CustomEdge,
  echo: CustomEdge,
  relation: CustomEdge,
  crossref: CustomEdge,
};

const EDGE_TYPE_OPTIONS = [
  { value: 'citation', label: '인용', color: '#ef4444' },
  { value: 'parallel', label: '평행', color: '#3b82f6' },
  { value: 'topic', label: '주제', color: '#a78bfa' },
  { value: 'echo', label: '반향', color: '#eab308' },
  { value: 'relation', label: '관계', color: '#1e293b' },
];

const PATH_OPTIONS = [
  { value: 'straight', label: '직선' },
  { value: 'bezier', label: '곡선' },
];

const ARROW_OPTIONS = [
  { value: 'end', label: '→' },
  { value: 'start', label: '←' },
  { value: 'both', label: '↔' },
  { value: 'none', label: '—' },
];

const THICKNESS_OPTIONS = [1, 2, 3, 4, 5];

const DASH_OPTIONS = [
  { value: '', label: '실선' },
  { value: '8 4', label: '점선' },
  { value: '4 4', label: '파선' },
  { value: '12 4 4 4', label: '혼합' },
];

export default function App() {
  const saved = loadFromStorage();
  const [nodes, setNodes, onNodesChange] = useNodesState(saved?.nodes ?? sampleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved?.edges ?? sampleEdges);
  const [edgeType, setEdgeType] = useState('citation');
  const [edgeThickness, setEdgeThickness] = useState(2);
  const [edgePathType, setEdgePathType] = useState('bezier');
  const [edgeArrow, setEdgeArrow] = useState('end');
  const [edgeDash, setEdgeDash] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [savePanelOpen, setSavePanelOpen] = useState(true);
  const [showEdgeOptions, setShowEdgeOptions] = useState(false);
  const idCounter = useRef(100);

  const { record, undo, redo, canUndo, canRedo } = useHistory(nodes, edges, setNodes, setEdges);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) || null,
    [edges, selectedEdgeId],
  );

  // 엣지 선택 시 해당 엣지의 설정을 로드
  useEffect(() => {
    if (selectedEdge) {
      setEdgeType(selectedEdge.type || 'citation');
      setEdgeThickness(selectedEdge.data?.thickness || 2);
      setEdgePathType(selectedEdge.data?.pathType || 'straight');
      setEdgeArrow(selectedEdge.data?.arrow || 'end');
      setEdgeDash(selectedEdge.data?.dash ?? EDGE_CONFIGS[selectedEdge.type]?.dash ?? '');
    }
  }, [selectedEdgeId]);

  // 선택된 엣지 스타일 업데이트
  const updateSelectedEdge = useCallback(
    (patch) => {
      if (!selectedEdgeId) return;
      record();
      setEdges((eds) =>
        eds.map((e) =>
          e.id === selectedEdgeId
            ? { ...e, ...patch, data: { ...e.data, ...patch.data } }
            : e
        ),
      );
    },
    [selectedEdgeId, setEdges, record],
  );

  const onConnect = useCallback(
    (params) => {
      record();
      const config = EDGE_CONFIGS[edgeType];
      const newEdge = {
        ...params,
        id: `e-${++idCounter.current}`,
        type: edgeType,
        label: config?.label || '',
        data: {
          thickness: edgeThickness,
          pathType: edgePathType,
          arrow: edgeArrow,
          dash: edgeDash || config?.dash || '',
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [edgeType, edgeThickness, edgePathType, edgeArrow, edgeDash, setEdges, record],
  );

  const handleAddNode = useCallback(
    ({ type, data }) => {
      record();
      const id = `${type}-${++idCounter.current}`;
      const newNode = {
        id,
        type,
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        data,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, record],
  );

  const handleNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const handleEdgeClick = useCallback((_, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setShowEdgeOptions(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleUpdateNode = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...newData } } : n)),
      );
    },
    [setNodes],
  );

  const handleNodesChange = useCallback(
    (changes) => {
      const hasMoved = changes.some((c) => c.type === 'position' && c.dragging === false);
      const hasRemoved = changes.some((c) => c.type === 'remove');
      if (hasMoved || hasRemoved) record();
      onNodesChange(changes);
    },
    [onNodesChange, record],
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      const hasRemoved = changes.some((c) => c.type === 'remove');
      if (hasRemoved) record();
      onEdgesChange(changes);
    },
    [onEdgesChange, record],
  );

  const handleLoad = useCallback(
    (loadedNodes, loadedEdges) => {
      record();
      setNodes(loadedNodes);
      setEdges(loadedEdges);
    },
    [setNodes, setEdges, record],
  );

  const handleNewMap = useCallback(() => {
    record();
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [setNodes, setEdges, record]);

  const createCitationEdge = useCallback((sourceId, targetId, note, edgeTypeName = 'citation') => {
    const config = EDGE_CONFIGS[edgeTypeName] || EDGE_CONFIGS.citation;
    return {
      id: `e-${++idCounter.current}`,
      source: sourceId,
      target: targetId,
      type: edgeTypeName,
      label: config?.label || '인용',
      data: {
        thickness: 2,
        pathType: 'bezier',
        arrow: 'end',
        dash: config?.dash || '',
        note: note || '',
      },
    };
  }, []);

  const handleConnectExistingCitation = useCallback(
    (sourceNodeId, targetNodeId) => {
      record();
      setEdges((eds) => [...eds, createCitationEdge(targetNodeId, sourceNodeId, '')]);
    },
    [setEdges, record, createCitationEdge],
  );

  const handleAddCitationNode = useCallback(
    async (source, targetNodeId, isCrossref = false) => {
      const target = nodes.find((n) => n.id === targetNodeId);
      if (!target) return null;

      const reference = formatReference(source);
      let translations = { krv: null, esv: null, original: null, lxx: null };
      try {
        translations = await fetchAllTranslations(
          source.book,
          source.chapter,
          source.verseStart,
          source.verseEnd,
        );
      } catch { /* translations stay null */ }

      const primaryText = translations.krv || '(본문 로드 실패)';
      const color = isOT(source.book) ? '#f59e0b' : '#3b82f6';
      const id = `verse-cite-${++idCounter.current}`;
      const position = {
        x: target.position.x - 360,
        y: target.position.y - 40,
      };

      const newNode = {
        id,
        type: 'verse',
        position,
        data: {
          reference,
          text: primaryText,
          color,
          bookId: source.book,
          chapter: source.chapter,
          verseStart: source.verseStart,
          verseEnd: source.verseEnd,
          translations,
        },
      };
      const edgeTypeName = isCrossref ? 'crossref' : 'citation';
      const newEdge = createCitationEdge(targetNodeId, id, source.part || '', edgeTypeName);

      record();
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
      return id;
    },
    [nodes, setNodes, setEdges, record, createCitationEdge],
  );

  const handleAddAllCitations = useCallback(
    async (pending, targetNodeId) => {
      const target = nodes.find((n) => n.id === targetNodeId);
      if (!target) return;

      let newIndex = 0;
      const additions = [];

      for (const sugg of pending) {
        const edgeTypeName = sugg.isCrossref ? 'crossref' : 'citation';
        if (sugg.existingNode) {
          additions.push({
            kind: 'edge',
            edge: createCitationEdge(targetNodeId, sugg.existingNode.id, sugg.part || '', edgeTypeName),
          });
        } else {
          const reference = formatReference(sugg.source);
          let translations = { krv: null, esv: null, original: null, lxx: null };
          try {
            translations = await fetchAllTranslations(
              sugg.source.book,
              sugg.source.chapter,
              sugg.source.verseStart,
              sugg.source.verseEnd,
            );
          } catch { /* translations stay null */ }
          const primaryText = translations.krv || '(본문 로드 실패)';
          const color = isOT(sugg.source.book) ? '#f59e0b' : '#3b82f6';
          const id = `verse-cite-${++idCounter.current}`;
          const position = {
            x: target.position.x - 360,
            y: target.position.y - 40 + newIndex * 200,
          };
          newIndex += 1;
          additions.push({
            kind: 'nodeAndEdge',
            node: {
              id,
              type: 'verse',
              position,
              data: {
                reference,
                text: primaryText,
                color,
                bookId: sugg.source.book,
                chapter: sugg.source.chapter,
                verseStart: sugg.source.verseStart,
                verseEnd: sugg.source.verseEnd,
                translations,
              },
            },
            edge: createCitationEdge(targetNodeId, id, sugg.part || '', edgeTypeName),
          });
        }
      }

      record();
      const newNodes = additions
        .filter((a) => a.kind === 'nodeAndEdge')
        .map((a) => a.node);
      const newEdges = additions.map((a) => a.edge);
      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    },
    [nodes, setNodes, setEdges, record, createCitationEdge],
  );

  // 노드/엣지 변경 시 자동 저장 (디바운스 500ms)
  useEffect(() => {
    const timer = setTimeout(() => saveToStorage(nodes, edges), 500);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
      <Sidebar onAddNode={handleAddNode} />

      <div style={{ flex: 1, position: 'relative' }}>
        <NodeEditor
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <CitationSuggest
          selectedNode={selectedNode}
          nodes={nodes}
          edges={edges}
          onAddCitation={handleAddCitationNode}
          onConnectExisting={handleConnectExistingCitation}
          onAddAll={handleAddAllCitations}
        />

        <EdgeMarkerDefs />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={['Backspace', 'Delete']}
          style={{ background: '#f1f5f9' }}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'verse') return n.data.color || '#3b82f6';
              if (n.type === 'note') return '#ca8a04';
              if (n.type === 'topic') return '#7c3aed';
              return '#94a3b8';
            }}
            style={{ border: '1px solid #e2e8f0' }}
          />

          <Panel position="bottom-center">
            <div style={panelContainerStyle}>
              {/* Row 1: 연결 타입 선택 */}
              <div style={panelRowStyle}>
                <span style={{ fontWeight: 600, color: '#475569', fontSize: 12, flexShrink: 0 }}>연결:</span>
                {EDGE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setEdgeType(opt.value);
                      const config = EDGE_CONFIGS[opt.value];
                      setEdgeDash(config?.dash || '');
                      if (selectedEdgeId) {
                        updateSelectedEdge({
                          type: opt.value,
                          label: config?.label || '',
                          data: { dash: config?.dash || '' },
                        });
                      }
                    }}
                    style={{
                      ...edgeBtnStyle,
                      background: edgeType === opt.value ? opt.color : '#f1f5f9',
                      color: edgeType === opt.value ? '#fff' : '#64748b',
                      fontWeight: edgeType === opt.value ? 700 : 400,
                      border: `2px solid ${edgeType === opt.value ? opt.color : 'transparent'}`,
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: 8, height: 8, borderRadius: '50%',
                      background: opt.color,
                      marginRight: 4,
                      border: opt.color === '#eab308' ? '1px solid #ca8a04' : 'none',
                    }} />
                    {opt.label}
                  </button>
                ))}

                <button
                  onClick={() => setShowEdgeOptions(!showEdgeOptions)}
                  style={{
                    ...edgeBtnStyle,
                    background: showEdgeOptions ? '#475569' : '#e2e8f0',
                    color: showEdgeOptions ? '#fff' : '#475569',
                    fontSize: 13,
                    padding: '4px 8px',
                  }}
                  title="스타일 옵션"
                >
                  ⚙️
                </button>
              </div>

              {/* Row 2: 스타일 옵션 (토글) */}
              {showEdgeOptions && (
                <div style={{ ...panelRowStyle, flexWrap: 'wrap', gap: 8 }}>
                  {/* 경로 타입 */}
                  <div style={optGroupStyle}>
                    <span style={optLabelStyle}>경로</span>
                    {PATH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setEdgePathType(opt.value);
                          if (selectedEdgeId) updateSelectedEdge({ data: { pathType: opt.value } });
                        }}
                        style={{
                          ...optBtnStyle,
                          background: edgePathType === opt.value ? '#3b82f6' : '#f1f5f9',
                          color: edgePathType === opt.value ? '#fff' : '#64748b',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* 화살표 방향 */}
                  <div style={optGroupStyle}>
                    <span style={optLabelStyle}>화살표</span>
                    {ARROW_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setEdgeArrow(opt.value);
                          if (selectedEdgeId) updateSelectedEdge({ data: { arrow: opt.value } });
                        }}
                        style={{
                          ...optBtnStyle,
                          background: edgeArrow === opt.value ? '#3b82f6' : '#f1f5f9',
                          color: edgeArrow === opt.value ? '#fff' : '#64748b',
                          fontSize: 14,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* 두께 */}
                  <div style={optGroupStyle}>
                    <span style={optLabelStyle}>두께</span>
                    {THICKNESS_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setEdgeThickness(t);
                          if (selectedEdgeId) updateSelectedEdge({ data: { thickness: t } });
                        }}
                        style={{
                          ...optBtnStyle,
                          background: edgeThickness === t ? '#3b82f6' : '#f1f5f9',
                          color: edgeThickness === t ? '#fff' : '#64748b',
                          width: 28,
                          padding: '3px 0',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* 선 스타일 */}
                  <div style={optGroupStyle}>
                    <span style={optLabelStyle}>선 스타일</span>
                    {DASH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setEdgeDash(opt.value);
                          if (selectedEdgeId) updateSelectedEdge({ data: { dash: opt.value } });
                        }}
                        style={{
                          ...optBtnStyle,
                          background: edgeDash === opt.value ? '#3b82f6' : '#f1f5f9',
                          color: edgeDash === opt.value ? '#fff' : '#64748b',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* 앵커 관리 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={optLabelStyle}>앵커</span>
                    <button
                      onClick={() => {
                        if (!selectedEdgeId) return;
                        const edge = edges.find((e) => e.id === selectedEdgeId);
                        if (!edge) return;
                        const src = nodes.find((n) => n.id === edge.source);
                        const tgt = nodes.find((n) => n.id === edge.target);
                        if (!src || !tgt) return;
                        const existing = edge.data?.anchors || [];
                        const sx = src.position.x + 80;
                        const sy = src.position.y + 30;
                        const tx = tgt.position.x + 80;
                        const ty = tgt.position.y + 30;
                        const allPts = [{ x: sx, y: sy }, ...existing, { x: tx, y: ty }];
                        const lastSeg = allPts.length - 2;
                        const mx = (allPts[lastSeg].x + allPts[lastSeg + 1].x) / 2;
                        const my = (allPts[lastSeg].y + allPts[lastSeg + 1].y) / 2;
                        const offset = (existing.length % 2 === 0 ? 1 : -1) * 40;
                        updateSelectedEdge({ data: { anchors: [...existing, { x: mx + offset, y: my - offset }] } });
                      }}
                      disabled={!selectedEdgeId}
                      style={{
                        ...anchorBtnStyle,
                        background: selectedEdgeId ? '#10b981' : '#e5e7eb',
                        color: selectedEdgeId ? '#fff' : '#9ca3af',
                        cursor: selectedEdgeId ? 'pointer' : 'default',
                      }}
                    >
                      📌 앵커 추가
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedEdgeId) return;
                        const edge = edges.find((e) => e.id === selectedEdgeId);
                        const existing = edge?.data?.anchors || [];
                        if (existing.length > 0) {
                          updateSelectedEdge({ data: { anchors: existing.slice(0, -1) } });
                        }
                      }}
                      disabled={!selectedEdgeId || !(selectedEdge?.data?.anchors?.length > 0)}
                      style={{
                        ...anchorBtnStyle,
                        background: (selectedEdgeId && selectedEdge?.data?.anchors?.length > 0) ? '#f59e0b' : '#e5e7eb',
                        color: (selectedEdgeId && selectedEdge?.data?.anchors?.length > 0) ? '#fff' : '#9ca3af',
                        cursor: (selectedEdgeId && selectedEdge?.data?.anchors?.length > 0) ? 'pointer' : 'default',
                      }}
                    >
                      ↩ 마지막 삭제
                    </button>
                    <button
                      onClick={() => {
                        if (selectedEdgeId) updateSelectedEdge({ data: { anchors: [] } });
                      }}
                      disabled={!selectedEdgeId || !(selectedEdge?.data?.anchors?.length > 0)}
                      style={{
                        ...anchorBtnStyle,
                        background: (selectedEdgeId && selectedEdge?.data?.anchors?.length > 0) ? '#ef4444' : '#e5e7eb',
                        color: (selectedEdgeId && selectedEdge?.data?.anchors?.length > 0) ? '#fff' : '#9ca3af',
                        cursor: (selectedEdgeId && selectedEdge?.data?.anchors?.length > 0) ? 'pointer' : 'default',
                      }}
                    >
                      ✕ 전체 초기화
                    </button>
                    {selectedEdge?.data?.anchors?.length > 0 && (
                      <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>
                        앵커 {selectedEdge.data.anchors.length}개
                      </span>
                    )}
                  </div>

                  {selectedEdgeId ? (
                    <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>
                      ✏️ 연결선 선택됨 — 앵커를 추가하고 드래그해서 곡선을 만드세요
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      연결선을 클릭하면 편집할 수 있습니다
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <SavePanel
        nodes={nodes}
        edges={edges}
        onLoad={handleLoad}
        onNewMap={handleNewMap}
        open={savePanelOpen}
        onToggle={() => setSavePanelOpen((v) => !v)}
      />
    </div>
  );
}

const panelContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  background: '#fff',
  padding: '8px 14px',
  borderRadius: 10,
  boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
  marginBottom: 8,
  maxWidth: 620,
};

const panelRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const edgeBtnStyle = {
  padding: '4px 10px',
  fontSize: 12,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

const optGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
};

const optLabelStyle = {
  fontSize: 10,
  color: '#94a3b8',
  fontWeight: 600,
  marginRight: 2,
  flexShrink: 0,
};

const optBtnStyle = {
  padding: '3px 7px',
  fontSize: 11,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const anchorBtnStyle = {
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  border: 'none',
  borderRadius: 5,
};
