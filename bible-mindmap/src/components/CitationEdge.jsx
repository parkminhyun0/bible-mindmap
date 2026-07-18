import { BaseEdge, EdgeLabelRenderer, getStraightPath } from '@xyflow/react';

export default function CitationEdge({ id, sourceX, sourceY, targetX, targetY, label, data }) {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#ef4444',
          strokeWidth: 2,
          strokeDasharray: '8 4',
        }}
        markerEnd="url(#citation-arrow)"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            fontSize: 11,
            fontWeight: 600,
            background: '#fef2f2',
            color: '#dc2626',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #fca5a5',
            cursor: 'default',
          }}
          className="nodrag nopan"
          title={data?.note || ''}
        >
          {label || '인용'}
          {data?.note && <span style={{ marginLeft: 4, fontSize: 10 }}>💬</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
