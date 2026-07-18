import { useCallback, useState } from 'react';
import { EdgeLabelRenderer, useReactFlow } from '@xyflow/react';

const EDGE_CONFIGS = {
  citation: { color: '#ef4444', label: '인용', bg: '#fef2f2', border: '#fca5a5', dash: '8 4' },
  parallel: { color: '#3b82f6', label: '평행', bg: '#eff6ff', border: '#93c5fd', dash: '' },
  topic:    { color: '#a78bfa', label: '주제', bg: '#f5f3ff', border: '#c4b5fd', dash: '4 4' },
  echo:     { color: '#eab308', label: '반향', bg: '#fefce8', border: '#fde047', dash: '6 3' },
  relation: { color: '#1e293b', label: '관계', bg: '#f1f5f9', border: '#94a3b8', dash: '' },
  crossref: { color: '#0ea5e9', label: '참조', bg: '#e0f2fe', border: '#7dd3fc', dash: '5 3' },
};

function catmullRomToBezier(points, tension = 0.5) {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function buildPath(sourceX, sourceY, targetX, targetY, anchors, pathType) {
  const allPoints = [{ x: sourceX, y: sourceY }, ...(anchors || []), { x: targetX, y: targetY }];
  if (pathType === 'straight') {
    return allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }
  if (!anchors || anchors.length === 0) {
    const dx = Math.abs(targetX - sourceX) * 0.4;
    return `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY}, ${targetX - dx} ${targetY}, ${targetX} ${targetY}`;
  }
  return catmullRomToBezier(allPoints);
}

function getLabelPoint(sourceX, sourceY, targetX, targetY, anchors) {
  const pts = [{ x: sourceX, y: sourceY }, ...(anchors || []), { x: targetX, y: targetY }];
  const midIdx = Math.floor(pts.length / 2);
  if (pts.length % 2 === 0) {
    return { x: (pts[midIdx - 1].x + pts[midIdx].x) / 2, y: (pts[midIdx - 1].y + pts[midIdx].y) / 2 };
  }
  return pts[midIdx];
}

// 점이 노드 bbox 안(padding 포함)에 있는지 검사
function isPointInsideNode(pt, node, padding = 10) {
  const nx = node.position?.x ?? 0;
  const ny = node.position?.y ?? 0;
  const nw = node.measured?.width ?? node.width ?? 280;
  const nh = node.measured?.height ?? node.height ?? 90;
  return (
    pt.x >= nx - padding &&
    pt.x <= nx + nw + padding &&
    pt.y >= ny - padding &&
    pt.y <= ny + nh + padding
  );
}

// 라벨이 노드와 겹치면 엣지 방향의 수직으로 자동 오프셋
function getSafeLabelPoint(basePt, sourceX, sourceY, targetX, targetY, nodes) {
  const nodesArr = Array.isArray(nodes) ? nodes : [];
  if (!nodesArr.some((n) => isPointInsideNode(basePt, n))) return basePt;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  const offsets = [40, -40, 70, -70, 100, -100, 140, -140];
  for (const o of offsets) {
    const cand = { x: basePt.x + perpX * o, y: basePt.y + perpY * o };
    if (!nodesArr.some((n) => isPointInsideNode(cand, n))) return cand;
  }
  return basePt;
}

export default function CustomEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, label, data, type, selected } = props;
  const { setEdges, getNodes } = useReactFlow();
  const edgeType = type || 'citation';
  const config = EDGE_CONFIGS[edgeType] || EDGE_CONFIGS.citation;

  const thickness = data?.thickness || 2;
  const pathType = data?.pathType || 'bezier';
  const arrow = data?.arrow || 'end';
  const dash = data?.dash ?? config.dash;
  const anchors = data?.anchors || [];

  const edgePath = buildPath(sourceX, sourceY, targetX, targetY, anchors, pathType);
  const baseLabelPt = getLabelPoint(sourceX, sourceY, targetX, targetY, anchors);
  // 사용자가 앵커를 놓았으면 그 위치 존중; 아니면 노드 겹침 자동 회피
  const labelPt = anchors.length > 0
    ? baseLabelPt
    : getSafeLabelPoint(baseLabelPt, sourceX, sourceY, targetX, targetY, getNodes());

  const markerEnd = (arrow === 'end' || arrow === 'both') ? `url(#arrow-${edgeType})` : undefined;
  const markerStart = (arrow === 'start' || arrow === 'both') ? `url(#arrow-${edgeType}-start)` : undefined;

  const updateAnchors = useCallback((newAnchors) => {
    setEdges((eds) => eds.map((e) =>
      e.id === id ? { ...e, data: { ...e.data, anchors: newAnchors } } : e
    ));
  }, [id, setEdges]);

  return (
    <g>
      {/* 넓은 히트 영역 */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(thickness + 20, 24)}
        style={{ cursor: 'pointer' }}
      />

      {/* 선택 하이라이트 */}
      {selected && (
        <path d={edgePath} fill="none" stroke={config.color} strokeWidth={thickness + 8} opacity={0.12} />
      )}

      {/* 메인 엣지 */}
      <path
        d={edgePath}
        fill="none"
        stroke={config.color}
        strokeWidth={thickness}
        strokeDasharray={dash || undefined}
        opacity={edgeType === 'topic' ? 0.7 : 1}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{ cursor: 'pointer' }}
      />

      {/* 앵커 포인트 (항상 표시) */}
      {anchors.map((anchor, i) => (
        <AnchorPoint
          key={`anchor-${i}`}
          index={i}
          x={anchor.x}
          y={anchor.y}
          color={config.color}
          anchors={anchors}
          updateAnchors={updateAnchors}
        />
      ))}

      {/* 라벨 */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelPt.x}px,${labelPt.y}px)`,
            pointerEvents: 'all',
            fontSize: 11,
            fontWeight: 600,
            background: config.bg,
            color: config.color,
            padding: '2px 8px',
            borderRadius: 4,
            border: `1px solid ${config.border}`,
            cursor: 'default',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.15)',
          }}
          className="nodrag nopan"
          title={data?.note || ''}
        >
          {label || config.label}
          {data?.note && <span style={{ marginLeft: 4, fontSize: 10 }}>💬</span>}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

function AnchorPoint({ index, x, y, color, anchors, updateAnchors }) {
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((evt) => {
    if (evt.button !== 0) return;
    evt.stopPropagation();
    evt.preventDefault();
    setDragging(true);
    const svg = evt.target.closest('svg');
    if (!svg) return;

    const onMove = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      const next = [...anchors];
      next[index] = { x: svgP.x, y: svgP.y };
      updateAnchors(next);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [index, anchors, updateAnchors]);

  return (
    <g style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
      <circle
        cx={x} cy={y} r={14}
        fill="transparent"
        style={{ pointerEvents: 'all', cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
      />
      <circle
        cx={x} cy={y}
        r={dragging ? 8 : 7}
        fill="white"
        stroke={color}
        strokeWidth={2.5}
        style={{
          pointerEvents: 'all',
          cursor: dragging ? 'grabbing' : 'grab',
          filter: dragging
            ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
        }}
        onMouseDown={handleMouseDown}
      />
      <circle
        cx={x} cy={y}
        r={dragging ? 4 : 3.5}
        fill={color}
        style={{ pointerEvents: 'none' }}
      />
      <text
        x={x + 11} y={y - 9}
        fontSize={9}
        fontWeight={700}
        fill={color}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {index + 1}
      </text>
    </g>
  );
}

export function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {Object.entries(EDGE_CONFIGS).map(([key, cfg]) => (
          <marker
            key={`end-${key}`}
            id={`arrow-${key}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={cfg.color} />
          </marker>
        ))}
        {Object.entries(EDGE_CONFIGS).map(([key, cfg]) => (
          <marker
            key={`start-${key}`}
            id={`arrow-${key}-start`}
            viewBox="0 0 10 10"
            refX="0"
            refY="5"
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill={cfg.color} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

export { EDGE_CONFIGS };
