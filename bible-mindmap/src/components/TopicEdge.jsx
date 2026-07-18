import { BaseEdge, getStraightPath } from '@xyflow/react';

export default function TopicEdge({ id, sourceX, sourceY, targetX, targetY }) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: '#a78bfa',
        strokeWidth: 1.5,
        strokeDasharray: '4 4',
        opacity: 0.6,
      }}
    />
  );
}
