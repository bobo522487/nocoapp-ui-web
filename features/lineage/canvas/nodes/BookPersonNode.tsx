import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { PersonFlowNode } from '../types';
import {
  Plus,
  Trash2,
  Heart,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { formatGivenName } from '../../utils/nameUtils';
import { InlineNodeNameInput } from '../components/InlineNodeNameInput';

export const BookPersonNode: React.FC<NodeProps<PersonFlowNode>> = memo(
  ({ data, selected }) => {
    const {
      person,
      clanSurname = '',
      isEditingName = false,
      onSelect,
      onAddChild,
      onAddSpouse,
      onDelete,
      hasChildren,
      isCollapsed,
      childrenCount = 0,
      onToggleCollapse,
      onCommitName,
      onCancelEditing,
    } = data;

    const editingActive =
      isEditingName && Boolean(onCommitName) && Boolean(onCancelEditing);

    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
      if (!confirmDelete) return;
      const timer = setTimeout(() => setConfirmDelete(false), 2500);
      return () => clearTimeout(timer);
    }, [confirmDelete]);

    const isSpouseNode = Boolean(person.spouseOfId);
    const isRoot = person.generation === 1 && !isSpouseNode;
    const displayLabel = isSpouseNode
      ? [
          person.surname && !person.name.startsWith(person.surname)
            ? person.surname
            : '',
          person.name,
        ].join('') || '配偶'
      : formatGivenName(person.name, clanSurname);

    return (
      <div
        onClick={() => {
          if (!editingActive) {
            onSelect?.(person.id);
          }
        }}
        className={`group relative w-[112px] flex flex-col items-center justify-center text-center select-none transition-[background-color,box-shadow] duration-150 py-1 px-1 rounded-md ${
          editingActive
            ? 'ring-2 ring-primary bg-primary/10 shadow-xs'
            : selected
              ? 'cursor-pointer ring-2 ring-primary bg-primary/10 shadow-xs'
              : 'cursor-pointer hover:bg-muted/60'
        }`}
      >
        {/* 1. Left Target Handle (Bloodline incoming from Left / Father) */}
        {!isRoot && !isSpouseNode && (
          <Handle
            type="target"
            position={Position.Left}
            id="parent-in-ltr"
            className="!w-2 !h-2 !bg-primary !border-2 !border-background -left-1 !top-[14px] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}

        {/* Top/Bottom Handles for Spouse Marriage Links */}
        <Handle
          type="target"
          position={Position.Top}
          id="spouse-in-ltr"
          className="!w-1.5 !h-1.5 !bg-primary/60 !border !border-background -top-1 opacity-0 pointer-events-none"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="spouse-out-ltr"
          className="!w-1.5 !h-1.5 !bg-primary/60 !border !border-background -bottom-1 opacity-0 pointer-events-none"
        />

        {/* Main Row: Bullet Dot / Heart + Person Name */}
        <div className="flex items-center justify-center gap-1.5 w-full">
          {isSpouseNode ? (
            <Heart
              size={10}
              className="shrink-0 text-primary fill-primary/20"
              aria-hidden="true"
            />
          ) : (
            <span
              className={`shrink-0 flex items-center justify-center transition-transform group-hover:scale-125 ${
                isRoot
                  ? 'w-3.5 h-3.5 rounded-full border-2 border-primary bg-background shadow-xs'
                  : 'w-2.5 h-2.5 rounded-full bg-primary'
              }`}
              title={isRoot ? '始祖' : `第 ${person.generation} 世`}
            />
          )}

          {editingActive && onCommitName && onCancelEditing ? (
            <InlineNodeNameInput
              personId={person.id}
              onCommit={onCommitName}
              onCancel={onCancelEditing}
              placeholder="输入姓名"
              className="w-[84px] h-6 px-1.5 text-center text-xs"
            />
          ) : (
            <>
              <span className="font-semibold text-sm tracking-wide text-foreground whitespace-nowrap truncate max-w-[82px]">
                {displayLabel}
              </span>

              {isSpouseNode ? (
                <span className="text-[11px] text-muted-foreground shrink-0">
                  配
                </span>
              ) : (
                person.rank &&
                !isRoot && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {person.rank.replace('子', '').replace('女', '')}
                  </span>
                )
              )}
            </>
          )}
        </div>

        {/* Sub Row: Subtree Collapse Toggle */}
        {hasChildren && (
          <div className="flex items-center justify-center gap-1 mt-0.5 w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.(person.id);
              }}
              className={`px-1 py-0.5 rounded text-[10px] font-medium tabular-nums flex items-center gap-0.5 border shadow-2xs transition-colors cursor-pointer ${
                isCollapsed
                  ? 'bg-primary/15 text-primary border-primary/30 font-bold'
                  : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
              title={
                isCollapsed ? `展开后代 (${childrenCount}人)` : '折叠后代'
              }
            >
              {isCollapsed ? (
                <ChevronRight size={9} />
              ) : (
                <ChevronLeft size={9} />
              )}
              <span>{childrenCount}</span>
            </button>
          </div>
        )}

        {/* Floating Action Menu on Hover / Selection */}
        {!editingActive && (
          <div
            className={`absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-popover/95 border border-border backdrop-blur text-popover-foreground rounded-full shadow-md px-1.5 py-0.5 z-40 transition-all whitespace-nowrap ${
              selected
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto'
            }`}
          >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild?.(person.spouseOfId || person.id);
            }}
            title="添子女"
            className="p-1 hover:bg-muted rounded-full transition-colors flex items-center gap-0.5 text-[10px] font-medium cursor-pointer"
          >
            <Plus size={10} /> 添子
          </button>
          {!isSpouseNode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSpouse?.(person.id);
              }}
              title="添配偶"
              className="p-1 hover:bg-muted rounded-full transition-colors text-pink-500 cursor-pointer"
            >
              <Heart size={10} />
            </button>
          )}
          {onDelete && (!isRoot || isSpouseNode) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirmDelete) {
                  setConfirmDelete(false);
                  onDelete(person.id);
                } else {
                  setConfirmDelete(true);
                }
              }}
              title={confirmDelete ? '再次点击确认删除' : '删除'}
              className={`p-1 rounded-full transition-colors cursor-pointer flex items-center gap-0.5 text-[10px] ${
                confirmDelete
                  ? 'bg-destructive text-destructive-foreground px-1.5'
                  : 'hover:bg-destructive/20 text-destructive'
              }`}
            >
              {confirmDelete ? <Check size={10} /> : <Trash2 size={10} />}
              {confirmDelete && <span>删</span>}
            </button>
          )}
          </div>
        )}

        {/* 2. Right Source Handle (Bloodline outgoing to Right / Children) */}
        {!isSpouseNode && (
          <Handle
            type="source"
            position={Position.Right}
            id="child-out-ltr"
            className="!w-2 !h-2 !bg-primary !border-2 !border-background -right-1 !top-[14px] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
    );
  }
);

BookPersonNode.displayName = 'BookPersonNode';
