
import React, { forwardRef, useState } from 'react';
import { cn } from '../../../../lib/utils';
import { ChevronRight, ChevronDown, MoreVertical, Pencil, Trash2, Folder, File, GripVertical } from 'lucide-react';
import { FlattenedItem } from '../types';

export interface TreeItemProps extends React.HTMLAttributes<HTMLLIElement> {
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
  onCollapse?(id: string): void;
  onRemove?(id: string): void;
  onRename?(id: string, newName: string): void;
  renderIcon?(item: FlattenedItem): React.ReactNode;
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
      item,
      style,
      renderIcon,
      className,
      ...props
    },
    ref
  ) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(item.name || '');
    const [showMenu, setShowMenu] = useState(false);

    const handleCollapse = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onCollapse?.(item.id as string);
    };

    const handleRenameSubmit = () => {
        if (renameValue.trim()) {
            onRename?.(item.id as string, renameValue);
        }
        setIsRenaming(false);
    };

    const isFolder = !!item.children?.length || item.type === 'folder'; // Support virtual folders via type or children

    return (
      <li
        className={cn(
          "relative list-none box-border mb-[-1px]", // negative margin to collapse borders
          ghost && "opacity-50",
          indicator && "opacity-100 relative z-[1]",
          disableSelection && "select-none",
          disableInteraction && "pointer-events-none",
          className
        )}
        style={{
          paddingLeft: `${indentationWidth * depth}px`,
          ...style,
        }}
        ref={ref}
        {...props}
      >
        <div className={cn(
            "relative flex items-center py-1.5 pr-2 rounded-md border border-transparent transition-all group",
            !clone && "hover:bg-muted/50 hover:border-border/50",
            clone && "bg-background border-primary shadow-lg z-50 opacity-90 rounded-md pr-4"
        )}>
            {/* Drag Handle */}
            <div 
                {...handleProps} 
                className="p-1 mr-1 text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <GripVertical size={14} />
            </div>

            {/* Collapse Toggle */}
            <div 
                className={cn(
                    "flex items-center justify-center w-5 h-5 mr-1 cursor-pointer transition-transform text-muted-foreground hover:text-foreground",
                    !isFolder && "invisible"
                )}
                onClick={handleCollapse}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </div>

            {/* Icon */}
            <div className="mr-2 text-muted-foreground flex-shrink-0">
                {renderIcon ? renderIcon(item) : (isFolder ? <Folder size={16} className="text-yellow-500/80" /> : <File size={16} className="text-blue-500/80" />)}
            </div>

            {/* Content / Rename Input */}
            <div className="flex-1 min-w-0">
                {isRenaming ? (
                    <input 
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit();
                            if (e.key === 'Escape') setIsRenaming(false);
                            e.stopPropagation();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-6 px-1.5 text-sm bg-background border border-primary rounded shadow-sm focus:outline-none"
                    />
                ) : (
                    <div className="text-sm truncate select-none text-foreground font-medium flex items-center gap-2">
                        {item.name}
                        {clone && childCount && childCount > 0 ? (
                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] rounded-full bg-primary text-primary-foreground font-bold">
                                {childCount}
                            </span>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Actions Menu */}
            {!clone && !isRenaming && (
                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button 
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <MoreVertical size={14} />
                    </button>
                    
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsRenaming(true);
                                        setShowMenu(false);
                                    }}
                                >
                                    <Pencil size={12} /> Rename
                                </button>
                                <button 
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 text-destructive text-left transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove?.(item.id as string);
                                        setShowMenu(false);
                                    }}
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
      </li>
    );
  }
);
