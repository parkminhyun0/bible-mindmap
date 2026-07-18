import { BaseEdge, EdgeLabelRenderer, getStraightPath } from '@xyflow/react';

export default function ParallelEdge({ id, sourceX, sourceY, targetX, targetY, label }) {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#3b82f6',
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 11,
            fontWeight: 600,
            background: '#eff6ff',
            color: '#2563eb',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #93c5fd',
          }}
        >
          {label || '평행'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
