import { lazy, Suspense, useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { applyDagreLayout, applyRadialLayout } from './utils/autoLayout';
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
import PersonNode from './components/PersonNode';
import PlaceNode from './components/PlaceNode';
import PeriodNode from './components/PeriodNode';
import ArcingNode from './components/ArcingNode';
import CustomEdge, { EdgeMarkerDefs, EDGE_CONFIGS } from './components/CustomEdge';
import NodeEditor from './components/NodeEditor';
import MobileWorkspaceDock from './components/MobileWorkspaceDock';
import CitationSuggest from './components/CitationSuggest';
import useHistory from './hooks/useHistory';
import { useDeviceProfile } from './hooks/useMobile';
import { fetchAllTranslations } from './api/bibleApi';
import { formatReference, parseReference } from './utils/citationDetector';
import { isOT } from './data/bibleBooks';
import { getBibleTags, getBiblicalPersonRelationship } from './data/bibleReferences';
import { CanvasContext } from './context/CanvasContext';
import {
  loadWorkspaceRecord,
  migrateLegacyStorage,
  persistCurrentCanvas,
} from './storage/storageCore';
import { ResearchAnnotationsProvider } from './research/ResearchAnnotationsContext';
import { safeLocalStorage } from './utils/safeStorage';

const Sidebar = lazy(() => import('./components/Sidebar'));
const SavePanel = lazy(() => import('./components/SavePanel'));
const DocPanel = lazy(() => import('./components/DocPanel'));
const ArcingPanel = lazy(() => import('./components/ArcingPanel'));
const SyntaxPanel = lazy(() => import('./components/SyntaxPanel'));
const RelatedPassagePopup = lazy(() => import('./components/RelatedPassagePopup'));

const STORAGE_KEY = 'bible-mindmap-v1';
const CANVAS_NODE_TYPES = new Set(['verse', 'note', 'topic', 'person', 'place', 'period', 'arcing']);

// 구절·노트·주제 노드의 저장된 크기를 제거해 디폴트 크기로 로드
// (사용자가 필요 시 리사이저로 자유롭게 재조정)
const RESET_SIZE_TYPES = new Set(['verse', 'note', 'topic']);
function normalizeLoadedNodes(nodes) {
  if (!Array.isArray(nodes)) return nodes;
  return nodes.map((n) => {
    const clone = {
      ...n,
      ...(CANVAS_NODE_TYPES.has(n?.type)
        ? { dragHandle: '.canvas-node-drag-handle' }
        : {}),
    };
    if (!RESET_SIZE_TYPES.has(n?.type)) return clone;
    delete clone.width;
    delete clone.height;
    delete clone.measured;
    if (clone.style && typeof clone.style === 'object') {
      const s = { ...clone.style };
      delete s.width;
      delete s.height;
      delete s.minWidth;
      delete s.minHeight;
      if (Object.keys(s).length === 0) delete clone.style;
      else clone.style = s;
    }
    return clone;
  });
}

function loadFromStorage() {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.nodes) parsed.nodes = normalizeLoadedNodes(parsed.nodes);
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(nodes, edges) {
  const data = { nodes, edges };
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패 시 무시
  }
  persistCurrentCanvas(data, { reason: 'canvas-autosave' }).catch(() => {});
}

const nodeTypes = { verse: VerseNode, note: NoteNode, topic: TopicNode, person: PersonNode, place: PlaceNode, period: PeriodNode, arcing: ArcingNode };
const edgeTypes = {
  citation: CustomEdge,
  parallel: CustomEdge,
  topic: CustomEdge,
  echo: CustomEdge,
  relation: CustomEdge,
  crossref: CustomEdge,
};

const LAYOUT_OPTIONS = [
  { mode: 'genealogy', icon: '→', label: '계보식', title: '좌→우 계보 배열 (인용 흐름)' },
  { mode: 'tree',      icon: '↓', label: '트리식', title: '위→아래 트리 배열 (주제 계층)' },
  { mode: 'radial',   icon: '⊙', label: '방사형', title: '중심 방사형 배열' },
];

const layoutBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  background: '#eff6ff',
  border: '1.5px solid #bfdbfe',
  borderRadius: 6,
  color: '#1d4ed8',
  cursor: 'pointer',
};

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
  const [nodes, setNodes, onNodesChange] = useNodesState(saved?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved?.edges ?? []);
  const [edgeType, setEdgeType] = useState('citation');
  const [edgeThickness, setEdgeThickness] = useState(2);
  const [edgePathType, setEdgePathType] = useState('bezier');
  const [edgeArrow, setEdgeArrow] = useState('end');
  const [edgeDash, setEdgeDash] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const deviceProfile = useDeviceProfile();
  const isMobile = deviceProfile.layout === 'mobile';
  const [savePanelOpen, setSavePanelOpen] = useState(!isMobile);
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const [docSaveKey, setDocSaveKey] = useState(0);
  const [openedDoc, setOpenedDoc] = useState(null);
  const [showEdgeOptions, setShowEdgeOptions] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileEditRequest, setMobileEditRequest] = useState(0);
  const [arcingPanels, setArcingPanels] = useState([]); // 다중 절 구조 분석 창
  const arcingIdRef = useRef(0);
  const [syntaxPanels, setSyntaxPanels] = useState([]); // 다중 구문 분석 창
  const syntaxIdRef = useRef(0);
  const [backgroundBibleRef, setBackgroundBibleRef] = useState(null);
  const idCounter = useRef(100);
  const reactFlowRef = useRef(null);
  const previousLayoutRef = useRef(deviceProfile.layout);

  useEffect(() => {
    const previousLayout = previousLayoutRef.current;
    if (previousLayout === deviceProfile.layout) return;
    previousLayoutRef.current = deviceProfile.layout;

    if (deviceProfile.layout === 'mobile') {
      setSavePanelOpen(false);
      setDocPanelOpen(false);
      setMobileSidebarOpen(false);
      setShowEdgeOptions(false);
    } else {
      setMobileSidebarOpen(false);
      setSavePanelOpen(true);
    }
  }, [deviceProfile.layout]);

  useEffect(() => {
    let cancelled = false;
    migrateLegacyStorage()
      .then(async () => {
        if (cancelled || saved?.nodes?.length) return;
        const record = await loadWorkspaceRecord('current-canvas');
        if (!cancelled && record?.data?.nodes) {
          setNodes(normalizeLoadedNodes(record.data.nodes));
          setEdges(record.data.edges || []);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // 최초 실행 시 레거시 자료를 보존 이관하고, 레거시 현재 맵이 없을 때만 V2 자료를 복구한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { record, undo, redo, canUndo, canRedo } = useHistory(nodes, edges, setNodes, setEdges);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) || null,
    [edges, selectedEdgeId],
  );

  // 문맥 성경(로마서) — 선택된 verse 노드가 로마서면 그 절부터 시작
  const contextBibleInitialRef = useMemo(() => {
    const d = selectedNode?.data;
    if (selectedNode?.type !== 'verse' || d?.bookId !== 'Rom') return null;
    const ch = Number(d.chapter);
    const verse = Number(d.verseStart);
    if (!ch || !verse) return null;
    return { ch, verse };
  }, [selectedNode]);

  // 엣지 선택 시 해당 엣지의 설정을 로드
  useEffect(() => {
    if (selectedEdge) {
      setEdgeType(selectedEdge.type || 'citation');
      setEdgeThickness(selectedEdge.data?.thickness || 2);
      setEdgePathType(selectedEdge.data?.pathType || 'bezier');
      setEdgeArrow(selectedEdge.data?.arrow || 'end');
      setEdgeDash(selectedEdge.data?.dash ?? EDGE_CONFIGS[selectedEdge.type]?.dash ?? '');
    }
  }, [selectedEdgeId, selectedEdge]);

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
        ...(CANVAS_NODE_TYPES.has(type)
          ? { dragHandle: '.canvas-node-drag-handle' }
          : {}),
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        data,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, record],
  );

  // 여러 노드를 한 번에 캔버스에 격자 배치로 추가 (지명 일괄 배치 등)
  const handleAddNodes = useCallback(
    (items) => {
      if (!Array.isArray(items) || items.length === 0) return;
      record();
      const originX = 260;
      const originY = 160;
      const stepX = 240;
      const stepY = 150;
      const perRow = Math.max(3, Math.ceil(Math.sqrt(items.length)));
      setNodes((nds) => {
        const created = items.map(({ type, data }, i) => ({
          id: `${type}-${++idCounter.current}`,
          type,
          ...(CANVAS_NODE_TYPES.has(type) ? { dragHandle: '.canvas-node-drag-handle' } : {}),
          position: {
            x: originX + (i % perRow) * stepX,
            y: originY + Math.floor(i / perRow) * stepY,
          },
          data,
        }));
        return [...nds, ...created];
      });
    },
    [setNodes, record],
  );

  const handleNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    // Auto-resolve bookId from reference for nodes saved without it (e.g. seed data)
    if (node.type === 'verse' && !node.data.bookId && node.data.reference) {
      const parsed = parseReference(node.data.reference);
      if (parsed) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    bookId: parsed.book,
                    chapter: parsed.chapter,
                    verseStart: parsed.verseStart,
                    verseEnd: parsed.verseEnd || parsed.verseStart,
                    translations: n.data.translations || {},
                  },
                }
              : n,
          ),
        );
      }
    }
  }, [setNodes]);

  const handleEdgeClick = useCallback((_, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setShowEdgeOptions(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const openMobileAdd = useCallback(() => {
    setSavePanelOpen(false);
    setMobileSidebarOpen(true);
  }, []);

  const openMobileSave = useCallback(() => {
    setMobileSidebarOpen(false);
    setSavePanelOpen(true);
  }, []);

  const openMobileEditor = useCallback(() => {
    if (!selectedNodeId) return;
    setMobileSidebarOpen(false);
    setSavePanelOpen(false);
    setMobileEditRequest((request) => request + 1);
  }, [selectedNodeId]);

  const fitMobileCanvas = useCallback(() => {
    setMobileSidebarOpen(false);
    setSavePanelOpen(false);
    reactFlowRef.current?.fitView({ padding: 0.18, duration: 260 });
  }, []);

  const handleUpdateNode = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n)),
      );
    },
    [setNodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      record();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges, record],
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
      setNodes(normalizeLoadedNodes(loadedNodes));
      setEdges(loadedEdges);
    },
    [setNodes, setEdges, record],
  );

  const handleAutoLayout = useCallback(
    (mode) => {
      if (nodes.length === 0) return;
      record();
      let layouted;
      if (mode === 'radial') {
        layouted = applyRadialLayout(nodes, edges);
      } else {
        layouted = applyDagreLayout(nodes, edges, mode === 'tree' ? 'TB' : 'LR');
      }
      setNodes(layouted);
      setTimeout(() => reactFlowRef.current?.fitView({ padding: 0.3 }), 60);
    },
    [nodes, edges, setNodes, record],
  );

  // 동시대 인물 캔버스에 추가 — 선택된 person 노드 오른쪽에 새 노드 생성
  const handleAddContemporary = useCallback(
    (personData, sourceNodeId) => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const baseX = sourceNode ? sourceNode.position.x + 340 : 400 + Math.random() * 200;
      const baseY = sourceNode ? sourceNode.position.y + (nodes.filter((n) => n.type === 'person').length % 3 - 1) * 160 : 300;

      record();
      const id = `person-${++idCounter.current}`;
      const newNode = {
        id,
        type: 'person',
        dragHandle: '.canvas-node-drag-handle',
        position: { x: baseX, y: baseY + Math.random() * 40 - 20 },
        data: {
          ...personData,
          bibleTags: personData.bibleTags || getBibleTags(personData.wikidataId),
          category: personData.category || (getBibleTags(personData.wikidataId).length > 0 ? 'biblical' : 'historical'),
        },
      };
      const relationship = getBiblicalPersonRelationship(
        sourceNode?.data?.wikidataId,
        personData.wikidataId,
      );
      const relationEdge = sourceNodeId ? {
        id: `e-${++idCounter.current}`,
        source: sourceNodeId,
        target: id,
        type: 'relation',
        label: relationship.label,
        data: {
          thickness: 2,
          pathType: 'bezier',
          arrow: 'end',
          dash: '',
          note: [relationship.note, relationship.reference].filter(Boolean).join(' · '),
          relationship: relationship.label,
          relationshipReference: relationship.reference,
        },
      } : null;
      setNodes((nds) => [...nds, newNode]);
      if (relationEdge) setEdges((eds) => [...eds, relationEdge]);
    },
    [nodes, setNodes, setEdges, record],
  );

  const handleNewMap = useCallback(() => {
    record();
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    safeLocalStorage.removeItem(STORAGE_KEY);
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

  // 교차 참조 구절을 캔버스에 추가 — 원본 verse 노드 오른쪽에 생성하고 crossref 엣지 연결
  const handleAddCrossRef = useCallback(
    async (refData, sourceNodeId) => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const position = sourceNode
        ? { x: sourceNode.position.x + 380, y: sourceNode.position.y + 80 }
        : { x: 400, y: 300 };

      let translations = { krv: null, esv: null, original: null, lxx: null };
      try {
        translations = await fetchAllTranslations(
          refData.bookId,
          refData.chapter,
          refData.verseStart,
          refData.verseEnd,
        );
      } catch { /* 로드 실패 시 무시 */ }

      const primaryText = translations.krv || '(본문 로드 실패)';
      const color = isOT(refData.bookId) ? '#f59e0b' : '#3b82f6';
      const id = `verse-crossref-${++idCounter.current}`;

      const newNode = {
        id,
        type: 'verse',
        dragHandle: '.canvas-node-drag-handle',
        position,
        data: {
          reference: refData.reference,
          text: primaryText,
          color,
          bookId: refData.bookId,
          chapter: refData.chapter,
          verseStart: refData.verseStart,
          verseEnd: refData.verseEnd,
          translations,
        },
      };
      const newEdge = createCitationEdge(sourceNodeId, id, '', 'crossref');

      record();
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
    },
    [nodes, setNodes, setEdges, record, createCitationEdge],
  );

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
        x: target.position.x + 380,
        y: target.position.y - 40,
      };

      const newNode = {
        id,
        type: 'verse',
        dragHandle: '.canvas-node-drag-handle',
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
            x: target.position.x + 380,
            y: target.position.y - 40 + newIndex * 200,
          };
          newIndex += 1;
          additions.push({
            kind: 'nodeAndEdge',
            node: {
              id,
              type: 'verse',
              dragHandle: '.canvas-node-drag-handle',
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
    <ResearchAnnotationsProvider>
    <CanvasContext.Provider value={{
      onAddVerse: handleAddCrossRef,
      onOpenBible: setBackgroundBibleRef,
      onOpenArcing: (passage) => {
        const id = ++arcingIdRef.current;
        setArcingPanels(prev => [...prev, { id, passage: passage || null }]);
      },
    }}>
    <div
      className={`app-shell app-shell--${deviceProfile.layout}`}
      data-device={deviceProfile.device}
      data-layout={deviceProfile.layout}
      data-orientation={deviceProfile.orientation}
      style={{ display: 'flex',
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
      {(!isMobile || mobileSidebarOpen) && (
        <Suspense fallback={<div className="deferred-feature-loading">입력 도구를 불러오는 중…</div>}>
          <Sidebar
            onAddNode={handleAddNode}
            onAddNodes={handleAddNodes}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
            contextBibleInitialRef={contextBibleInitialRef}
            onOpenSyntax={(p) => {
              const id = ++syntaxIdRef.current;
              setSyntaxPanels(prev => [...prev, { id, passage: p }]);
            }}
          />
        </Suspense>
      )}

      <div className="app-canvas-shell" style={{ flex: 1, position: 'relative' }}>
        <NodeEditor
          isMobile={isMobile}
          mobileVisible={!mobileSidebarOpen && !savePanelOpen}
          mobileExpandRequest={mobileEditRequest}
          onMobileClose={() => setSelectedNodeId(null)}
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onAddContemporary={handleAddContemporary}
          onAddCrossRef={handleAddCrossRef}
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
          onInit={(instance) => { reactFlowRef.current = instance; }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.05}
          maxZoom={4}
          multiSelectionKeyCode="Shift"
          deleteKeyCode={['Backspace', 'Delete']}
          style={{ background: '#f1f5f9' }}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
          {!isMobile && (
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'verse') return n.data.color || '#3b82f6';
                if (n.type === 'note') return '#ca8a04';
                if (n.type === 'topic') return '#7c3aed';
                if (n.type === 'person') return '#059669';
                if (n.type === 'place') return '#d97706';
                if (n.type === 'period') return '#6d28d9';
                return '#94a3b8';
              }}
              pannable
              zoomable
              style={{ border: '1px solid #e2e8f0' }}
            />
          )}

          <Panel position="bottom-center" style={isMobile ? { display: 'none' } : {}}>
            <div style={panelContainerStyle}>
              {/* Row 0: 자동 정렬 */}
              <div style={{ ...panelRowStyle, borderBottom: '1px solid #f1f5f9', paddingBottom: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, color: '#475569', fontSize: 11, flexShrink: 0, marginRight: 4 }}>정렬</span>
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => handleAutoLayout(opt.mode)}
                    disabled={nodes.length === 0}
                    title={opt.title}
                    style={{
                      ...layoutBtnStyle,
                      opacity: nodes.length === 0 ? 0.4 : 1,
                      cursor: nodes.length === 0 ? 'default' : 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 13, marginRight: 3 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>Ctrl+Z로 되돌리기 가능</span>
              </div>

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

        {isMobile && nodes.length === 0 && (
          <section className="mobile-empty-state" aria-label="새 성경 마인드맵 시작">
            <div className="mobile-empty-state__icon" aria-hidden="true">✝️</div>
            <h1>성경 마인드맵</h1>
            <p>구절·인물·장소·시대를 추가해 개인 연구 보드를 시작하세요.</p>
            <div className="mobile-empty-state__actions">
              <button type="button" onClick={openMobileAdd}>
                📖 구절·자료 추가
              </button>
              <button type="button" onClick={openMobileSave}>
                💾 저장소 열기
              </button>
            </div>
          </section>
        )}
      </div>

      {!isMobile && (
        <Suspense fallback={<div className="deferred-feature-loading">저장 도구를 불러오는 중…</div>}>
          <DocPanel
            open={docPanelOpen}
            onToggle={() => setDocPanelOpen((v) => !v)}
            loadedDoc={openedDoc}
            onDocSaved={() => setDocSaveKey((k) => k + 1)}
          />
          <SavePanel
            nodes={nodes}
            edges={edges}
            onLoad={handleLoad}
            onNewMap={handleNewMap}
            open={savePanelOpen}
            onToggle={() => setSavePanelOpen((v) => !v)}
            docSaveKey={docSaveKey}
            onOpenDoc={(item) => { setOpenedDoc({ ...item }); setDocPanelOpen(true); }}
          />
        </Suspense>
      )}

      {arcingPanels.map((panel, idx) => (
        <Suspense key={panel.id} fallback={<div className="deferred-feature-loading">본문 흐름 분석을 불러오는 중…</div>}>
          <ArcingPanel
            passage={panel.passage}
            panelIndex={idx}
            onClose={() => setArcingPanels(prev => prev.filter(p => p.id !== panel.id))}
          />
        </Suspense>
      ))}
      {syntaxPanels.map((panel, idx) => (
        <Suspense key={panel.id} fallback={<div className="deferred-feature-loading">구문 분석을 불러오는 중…</div>}>
          <SyntaxPanel
            passage={panel.passage}
            panelIndex={idx}
            onClose={() => setSyntaxPanels(prev => prev.filter(p => p.id !== panel.id))}
          />
        </Suspense>
      ))}
      {backgroundBibleRef && (
        <Suspense fallback={<div className="deferred-feature-loading">관련 본문을 불러오는 중…</div>}>
          <RelatedPassagePopup
            key={`${backgroundBibleRef.bookId}-${backgroundBibleRef.ch}-${backgroundBibleRef.verse}`}
            initialRef={backgroundBibleRef}
            onClose={() => setBackgroundBibleRef(null)}
          />
        </Suspense>
      )}

      {isMobile && !mobileSidebarOpen && !savePanelOpen && (
        <MobileWorkspaceDock
          activeSurface={selectedNodeId ? 'edit' : null}
          hasSelection={!!selectedNodeId}
          onAdd={openMobileAdd}
          onEdit={openMobileEditor}
          onFit={fitMobileCanvas}
          onSave={openMobileSave}
        />
      )}

      {/* 모바일 저장소 패널 (모달) */}
      {isMobile && savePanelOpen && (
        <section className="momentum-scroll h-screen-safe mobile-workspace-sheet mobile-save-sheet" style={{
            position: 'fixed', inset: 0, zIndex: 1201,
            background: '#fff',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}>
            <div className="mobile-workspace-sheet__header">
              <div>
                <strong>개인 저장소</strong>
                <span>저장·복원·백업을 한 화면에서 관리하세요</span>
              </div>
              <button type="button" onClick={() => setSavePanelOpen(false)} aria-label="저장소 닫기">✕</button>
            </div>
            <div className="mobile-workspace-sheet__body">
              <Suspense fallback={<div className="deferred-feature-loading">저장소를 불러오는 중…</div>}>
                <SavePanel
                  nodes={nodes}
                  edges={edges}
                  onLoad={(d) => { handleLoad(d); setSavePanelOpen(false); }}
                  onNewMap={() => { handleNewMap(); setSavePanelOpen(false); }}
                  open={true}
                  onToggle={() => setSavePanelOpen(false)}
                  mobileInline
                />
              </Suspense>
            </div>
          </section>
      )}
    </div>
    </CanvasContext.Provider>
    </ResearchAnnotationsProvider>
  );
}
