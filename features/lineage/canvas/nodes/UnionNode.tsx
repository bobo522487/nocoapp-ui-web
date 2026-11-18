import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { UnionFlowNode } from '../types';

export const UnionNode: React.FC<NodeProps<UnionFlowNode>> = memo(({ data }) => {
  const { spouseName } = data;

  return (
    <div
      className="relative w-2 h-2 flex items-center justify-center pointer-events-none"
      title={spouseName ? `联姻：${spouseName}` : undefined}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="union-father-in"
        className="!w-1 !h-1 !opacity-0 pointer-events-none"
      />
      <span
        className="w-2 h-2 rounded-full border border-background"
        style={{ backgroundColor: 'hsl(var(--border-strong))' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="union-children-out"
        className="!w-1 !h-1 !opacity-0 pointer-events-none"
      />
    </div>
  );
});

UnionNode.displayName = 'UnionNode';
