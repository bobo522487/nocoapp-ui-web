import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Heart, Plus, UserPlus, Users } from 'lucide-react';
import { QuickAddFlowNode } from '../types';

export const QuickAddNode: React.FC<NodeProps<QuickAddFlowNode>> = memo(
  ({ data }) => {
    const { kind, label, onAction } = data;

    const Icon =
      kind === 'spouse' ? Heart : kind === 'sibling' ? Users : UserPlus;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        title={`点击直接添加${label}`}
        className="group relative w-[100px] h-[114px] rounded-xl border-[1.5px] border-dashed border-primary/50 hover:border-primary bg-background/75 backdrop-blur-[2px] hover:bg-[hsl(var(--surface-active))] transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer select-none flex flex-col items-center justify-center px-2"
      >
        <Handle
          type="target"
          position={Position.Top}
          id="parent-in"
          className="!w-1.5 !h-1.5 !opacity-0 pointer-events-none"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="spouse-in"
          className="!w-1.5 !h-1.5 !opacity-0 pointer-events-none"
        />

        <div className="relative w-14 h-14 rounded-lg border border-dashed border-primary/40 bg-primary/[0.06] group-hover:bg-primary/12 text-primary flex items-center justify-center transition-colors">
          <Icon size={20} strokeWidth={1.75} />
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
            <Plus size={10} strokeWidth={2.5} />
          </span>
        </div>

        <span className="mt-2.5 text-[12px] font-semibold text-primary whitespace-nowrap">
          {label}
        </span>
      </button>
    );
  }
);

QuickAddNode.displayName = 'QuickAddNode';
