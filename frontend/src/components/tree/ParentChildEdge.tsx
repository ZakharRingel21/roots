import { memo } from 'react';
import { BaseEdge, useNodes, type EdgeProps } from '@xyflow/react';

// PersonNode visual width is 160px → half-width = 80
const HALF_W = 80;

// Orthogonal path from parent bottom → couple midpoint → bus → child top.
// spouseId in edge data lets us compute the midpoint dynamically even after dragging.
function ParentChildEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, data }: EdgeProps) {
  const nodes = useNodes();

  const spouseId = (data as any)?.spouseId as string | undefined;
  let dropX = sourceX;

  if (spouseId) {
    const spouse = nodes.find(n => n.id === spouseId);
    if (spouse?.position) {
      const spouseCenterX = (spouse.position as { x: number }).x + HALF_W;
      dropX = (sourceX + spouseCenterX) / 2;
    }
  }

  const busY = sourceY + (targetY - sourceY) * 0.5;

  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${dropX} ${sourceY}`,
    `L ${dropX} ${busY}`,
    `L ${targetX} ${busY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ');

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{ stroke: '#6366f1', strokeWidth: 2 }}
    />
  );
}

export default memo(ParentChildEdge);
