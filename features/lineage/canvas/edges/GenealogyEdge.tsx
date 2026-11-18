import React from 'react';
import { BaseEdge, EdgeProps } from '@xyflow/react';

type EdgeRelationship =
  | 'marriage'
  | 'bloodline'
  | 'adoption'
  | 'ghost_marriage'
  | 'ghost_bloodline';

export const GenealogyEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  selected,
  data,
}) => {
  const relationship =
    (data as { relationship?: EdgeRelationship } | undefined)?.relationship ||
    'bloodline';

  const isMarriage =
    relationship === 'marriage' || relationship === 'ghost_marriage';
  const isGhost =
    relationship === 'ghost_marriage' || relationship === 'ghost_bloodline';

  let edgePath: string;
  if (isMarriage) {
    // Direct horizontal marriage line
    edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  } else {
    // Smooth FamilyChart bus curve: drop from parent/couple midpoint to shared horizontal bus above children, then round smoothly down into child top
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    if (Math.abs(dx) < 1) {
      edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    } else {
      // Target bus sits 23px above child top (center of the 46px vertical gap between parent bottom and child top)
      const busY =
        dy > 36 ? targetY - 23 : sourceY + dy / 2;
      const dir = dx > 0 ? 1 : -1;
      const r = Math.min(
        16,
        Math.abs(dx) / 2,
        Math.max(4, Math.abs(busY - sourceY) / 2),
        Math.max(4, Math.abs(targetY - busY) / 2)
      );
      edgePath = [
        `M ${sourceX} ${sourceY}`,
        `L ${sourceX} ${busY - r}`,
        `Q ${sourceX} ${busY} ${sourceX + dir * r} ${busY}`,
        `L ${targetX - dir * r} ${busY}`,
        `Q ${targetX} ${busY} ${targetX} ${busY + r}`,
        `L ${targetX} ${targetY}`,
      ].join(' ');
    }
  }

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        strokeWidth: selected ? 2.25 : 1.5,
        stroke: selected
          ? 'hsl(var(--primary))'
          : isGhost
            ? 'hsl(var(--primary) / 0.55)'
            : 'hsl(var(--border-strong))',
        strokeDasharray: isGhost ? '4 4' : undefined,
        opacity: selected ? 1 : 0.9,
        ...style,
      }}
    />
  );
};
