import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cn } from '../../../../lib/utils';
import { ChevronRight, ChevronDown, Pencil, Trash2, File, Folder, Plus } from 'lucide-react';
import { FlattenedItem } from '../types';

export interface TreeItemProps extends Omit<React.HTMLAttributes<HTMLLIElement>, 'onClick'> {
  childCount?: number;
  clone?: boolean;
  collapsed?: boolean;
  depth: number;
  disableInteraction?: boolean;
  disableSelection?: boolean;
  ghost?: boolean;
  handleProps?: any;
  indicator?: boolean;
  indentationWidth: number;
  item: FlattenedItem;
  onCollapse?: (id: string) => void;
  onRemove?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onAdd?: (id: string) => void;
  renderIcon?: (item: FlattenedItem) => React.ReactNode;
  renderActions?: (item: FlattenedItem) => React.ReactNode;
  activeId?: string | null;
  onClick?: (item: FlattenedItem) => void;
  hideCollapseButton?: boolean;
}

export const TreeItem = forwardRef<HTMLLIElement, TreeItemProps>(
  (
    {
      childCount,
      clone,
      depth,
      disableSelection,
      disableInteraction,
      ghost,
      handleProps,
      indentationWidth,
      indicator,
      collapsed,
      onCollapse,
      onRemove,
      onRename,
      onAdd,
      renderIcon,
      renderActions,
      style,
      item,
      activeId,
      onClick,
      hideCollapseButton,
      ...props
    },
    ref
  ) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item.data?.name || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (onRename && editName.trim()) {
            onRename(item.id as string, editName);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') setIsEditing(false);
    };

    // --- Ghost / Indicator State ---
    if (ghost) {
      return (
        <li
          ref={ref}
          className="list-none fade-in relative"
          style={{
            ...style,
            marginBottom: -1,
            paddingLeft: depth * indentationWidth,
          }}
          {...props}
        >
           <div className="relative py-1 z-50">
               <div className="h-[2px] w-full bg-primary rounded-full shadow-[0_0_4px_rgba(var(--primary),0.6)]" />
               <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 border-2 border-primary bg-background rounded-full" />
           </div>
        </li>
      );
    }

    const isClone = clone;
    const isSelected = activeId === item.id;

    return (
      <li
        ref={ref}
        className={cn(
            "list-none my-0.5",
            disableSelection && "select-none",
            disableInteraction && "pointer-events-none"
        )}
        style={{
          ...style,
          paddingLeft: clone ? undefined : depth * indentationWidth,
        }}
        {...props}
      >
        <div 
            className={cn(
                "group relative flex items-center h-8 px-2 rounded-md transition-colors border border-transparent",
                isSelected && !isClone ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                isClone && "bg-background border-border shadow-xl opacity-90"
            )}
            onClick={(e) => {
                onClick?.(item);
            }}
            {...(!disableInteraction ? handleProps : {})}
        >
            {/* Collapse/Expand Arrow - Only if not hidden */}
            {!hideCollapseButton && (
                <div 
                    className={cn(
                        "flex items-center justify-center w-5 h-5 mr-1 rounded-sm transition-colors cursor-pointer hover:bg-muted-foreground/10",
                        (!childCount && !item.children?.length) && "invisible"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCollapse?.(item.id as string);
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking collapse
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </div>
            )}

            {/* Icon */}
            <div className={cn("text-muted-foreground shrink-0", hideCollapseButton ? "mr-2 ml-1" : "mr-2")}>
                {renderIcon ? renderIcon(item) : (childCount ? <Folder size={16} /> : <File size={16} />)}
            </div>

            {/* Label / Edit Mode */}
            <div className="flex-1 truncate text-sm select-none" onDoubleClick={() => !disableInteraction && onRename && setIsEditing(true)}>
                {isEditing ? (
                    <input 
                        ref={inputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-background border border-input rounded-sm px-1 text-sm h-6 focus:outline-none focus:ring-1 focus:ring-ring"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag on input
                    />
                ) : (
                    <span>{item.data?.name || item.id}</span>
                )}
            </div>

            {/* Actions (Hover) */}
            {!isClone && !disableInteraction && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {renderActions ? renderActions(item) : (
                        <>
                            {onAdd && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onAdd(item.id as string); }}
                                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag
                                    className="p-1 rounded-sm hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
                                >
                                    <Plus size={12} />
                                </button>
                            )}
                            {onRename && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag
                                    className="p-1 rounded-sm hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
                                >
                                    <Pencil size={12} />
                                </button>
                            )}
                            {onRemove && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemove?.(item.id as string); }}
                                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag
                                    className="p-1 rounded-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
            
            {clone && childCount && childCount > 0 ? (
                <span className="ml-auto bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 min-w-[20px] text-center">
                    {childCount}
                </span>
            ) : null}
        </div>
      </li>
    );
  }
);