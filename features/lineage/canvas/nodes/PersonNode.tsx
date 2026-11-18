import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { PersonFlowNode } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatGivenName } from '../../utils/nameUtils';
import { InlineNodeNameInput } from '../components/InlineNodeNameInput';

const PortraitSilhouette: React.FC<{
  gender: 'male' | 'female';
  deceased: boolean;
}> = ({ gender, deceased }) => {
  const isMale = gender !== 'female';
  return (
    <svg
      viewBox="0 0 48 48"
      className={`w-10 h-10 ${deceased ? 'opacity-65' : 'opacity-90'}`}
      aria-hidden="true"
    >
      <circle cx="24" cy="17.5" r="7.5" fill="currentColor" opacity="0.85" />
      {isMale ? (
        <path
          d="M10 41c0-7.2 6.2-12 14-12s14 4.8 14 12"
          fill="currentColor"
          opacity="0.72"
        />
      ) : (
        <path
          d="M11 41c0-6.8 5.8-11.5 13-11.5S37 34.2 37 41M15.5 17c0-5 3.8-8.8 8.5-8.8s8.5 3.8 8.5 8.8"
          fill="currentColor"
          opacity="0.72"
        />
      )}
    </svg>
  );
};

export const PersonNode: React.FC<NodeProps<PersonFlowNode>> = memo(
  ({ data, selected }) => {
    const {
      person,
      clanSurname = '',
      isEditingName = false,
      onSelect,
      hasChildren,
      isCollapsed,
      childrenCount = 0,
      onToggleCollapse,
      onCommitName,
      onCancelEditing,
    } = data;

    const editingActive =
      isEditingName && Boolean(onCommitName) && Boolean(onCancelEditing);

    const isMale = person.gender !== 'female';
    const isSpouseNode = Boolean(person.spouseOfId);
    const isDeceased = person.status === 'deceased';
    const effectiveSurname = isSpouseNode
      ? person.surname?.trim() || ''
      : person.surname?.trim() || clanSurname.trim();

    const displayName = isSpouseNode
      ? [
          effectiveSurname && !person.name.startsWith(effectiveSurname)
            ? effectiveSurname
            : '',
          person.name,
        ].join('') || '配偶'
      : (() => {
          const given = formatGivenName(person.name, effectiveSurname);
          if (effectiveSurname && given && !given.startsWith(effectiveSurname)) {
            return `${effectiveSurname}${given}`;
          }
          return given || effectiveSurname || '未命名';
        })();

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!editingActive) {
            onSelect?.(person.id);
          }
        }}
        title={
          editingActive
            ? '输入姓名后按回车确认，按 Esc 取消'
            : `${displayName} · 第${person.generation}世${isDeceased ? ' · 已故' : ''}`
        }
        className={`group relative w-[100px] h-[114px] rounded-xl border transition-[transform,box-shadow,border-color,background-color] duration-150 select-none flex flex-col items-center justify-center px-2 ${
          editingActive
            ? 'bg-[hsl(var(--surface-active))] border-2 border-primary ring-2 ring-primary/25 shadow-md'
            : selected
              ? 'cursor-pointer bg-[hsl(var(--surface-active))] border-2 border-primary ring-2 ring-primary/25 shadow-md -translate-y-0.5'
              : 'cursor-pointer bg-background/85 backdrop-blur-[2px] border-border/85 hover:bg-[hsl(var(--surface-subtle)/0.6)] hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)]'
        }`}
      >
        {/* Top Target Handle (Incoming parent bloodline) */}
        <Handle
          type="target"
          position={Position.Top}
          id="parent-in"
          className="!w-2 !h-2 !bg-primary !border !border-background opacity-0 group-hover:opacity-80 transition-opacity -top-1"
        />

        {/* Left / Right Marriage Handles */}
        <Handle
          type="source"
          position={Position.Right}
          id="spouse-out"
          className="!w-1.5 !h-1.5 !opacity-0 pointer-events-none"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="spouse-in"
          className="!w-1.5 !h-1.5 !opacity-0 pointer-events-none"
        />

        {/* Quiet Deceased Corner Mark (non-pill) */}
        {isDeceased && (
          <span className="absolute top-1.5 right-2 text-[10px] leading-none text-muted-foreground/80 font-medium">
            殁
          </span>
        )}

        {/* Centered Portrait Frame */}
        <div
          className={`w-14 h-14 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 ${
            isMale
              ? 'bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-400'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400'
          } ${isDeceased ? 'opacity-85' : ''}`}
        >
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover ${
                isDeceased ? 'grayscale opacity-85' : ''
              }`}
            />
          ) : (
            <PortraitSilhouette gender={person.gender} deceased={isDeceased} />
          )}
        </div>

        {/* Centered Name or Inline Input */}
        {editingActive && onCommitName && onCancelEditing ? (
          <InlineNodeNameInput
            personId={person.id}
            onCommit={onCommitName}
            onCancel={onCancelEditing}
            placeholder="输入姓名"
            className="mt-1.5 w-full h-6 px-1.5 text-center text-[12px] leading-tight"
          />
        ) : (
          <div
            className={`mt-2 w-full text-center font-semibold text-[13px] leading-tight truncate ${
              isDeceased ? 'text-foreground/80' : 'text-foreground'
            }`}
          >
            {displayName}
          </div>
        )}

        {/* Subtree Collapse/Expand Corner Button */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(person.id);
            }}
            className={`nodrag nopan absolute -bottom-2 right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium tabular-nums flex items-center gap-0.5 border shadow-2xs z-30 transition-colors cursor-pointer ${
              isCollapsed
                ? 'bg-primary text-primary-foreground border-primary font-semibold'
                : 'bg-[hsl(var(--surface-subtle))] text-muted-foreground border-border hover:text-foreground'
            }`}
            title={
              isCollapsed
                ? `展开后代 (${childrenCount}人)`
                : '折叠后代分支'
            }
          >
            <span>{childrenCount}</span>
            {isCollapsed ? <ChevronDown size={9} /> : <ChevronUp size={9} />}
          </button>
        )}

        {/* Bottom Source Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="child-out"
          className="!w-2 !h-2 !bg-primary !border !border-background opacity-0 group-hover:opacity-80 transition-opacity -bottom-1"
        />
      </div>
    );
  }
);

PersonNode.displayName = 'PersonNode';
