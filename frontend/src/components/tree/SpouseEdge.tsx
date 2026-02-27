import { memo } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';

// Z-shaped elbow connector between spouses (or siblings).
// Works correctly even when one node is dragged to a different Y level.
function SpouseEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const isSibling = (data as any)?.style === 'sibling';
  const midX = (sourceX + targetX) / 2;
  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${midX} ${sourceY}`,
    `L ${midX} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ');

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke:          isSibling ? '#94a3b8' : '#374151',
        strokeWidth:     isSibling ? 1.5 : 2,
        strokeDasharray: isSibling ? '4 3' : undefined,
      }}
    />
  );
}

export default memo(SpouseEdge);
