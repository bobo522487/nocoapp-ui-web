
import React from 'react';
import { flexRender, HeaderGroup } from '@tanstack/react-table';
import { Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { SchemaField } from '../../../../types';
import Dropdown from '../../../../components/common/Dropdown';

interface GridHeaderProps<T> {
  headerGroups: HeaderGroup<T>[];
  onAddColumn?: () => void;
  onEditColumn?: (field: SchemaField) => void;
  onDeleteColumn?: (id: string) => void;
}

const GridHeader = <T,>({ headerGroups, onAddColumn, onEditColumn, onDeleteColumn }: GridHeaderProps<T>) => {
  return (
    <div className="flex flex-col bg-background shadow-[0_1px_0_hsl(var(--border))]">
      {headerGroups.map((headerGroup) => (
        <div 
            key={headerGroup.id} 
            className="flex w-full"
        >
          {headerGroup.headers.map((header) => {
            const isResizing = header.column.getIsResizing();
            const fieldDef = (header.column.columnDef.meta as any)?.fieldDef as SchemaField;
            const isSelectColumn = header.id === 'select';

            return (
              <div
                key={header.id}
                className={cn(
                    "relative flex items-center border-r border-border bg-muted/20 px-2 h-9 text-xs font-semibold text-muted-foreground select-none group box-border",
                    header.column.getIsPinned() && "sticky left-0 z-10 bg-background shadow-[1px_0_0_hsl(var(--border))]"
                )}
                style={{
                  width: header.getSize(),
                  flex: `0 0 ${header.getSize()}px`, // Force fixed width logic
                }}
              >
                <div className="flex-1 truncate flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
                
                {/* Column Actions (Not for selection column) */}
                {!isSelectColumn && fieldDef && (onEditColumn || onDeleteColumn) && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-muted/20 rounded">
                        <Dropdown
                            triggerLabel=""
                            triggerIcon={MoreVertical}
                            items={[
                                { id: 'edit', label: 'Edit Column', icon: Pencil },
                                { id: 'delete', label: 'Delete Column', icon: Trash2 },
                            ]}
                            onSelect={(item) => {
                                if (item.id === 'edit' && onEditColumn) {
                                    onEditColumn(fieldDef);
                                } else if (item.id === 'delete' && onDeleteColumn) {
                                    onDeleteColumn(fieldDef.id);
                                }
                            }}
                            className="h-6 w-6 p-0 justify-center hover:bg-muted"
                            width={160}
                            align="start"
                            searchPlaceholder=""
                        />
                    </div>
                )}

                {/* Resizer Handle */}
                <div
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className={cn(
                      "absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 hover:bg-primary z-20",
                      isResizing && "bg-primary opacity-100 w-1"
                  )}
                />
              </div>
            );
          })}
          
          {/* Add Column Button */}
          {onAddColumn && (
              <div 
                className="flex items-center justify-center w-10 border-r border-border bg-muted/20 h-9 cursor-pointer hover:bg-muted/50 transition-colors shrink-0"
                onClick={onAddColumn}
                title="Add Column"
              >
                  <Plus size={14} className="text-muted-foreground" />
              </div>
          )}
          
          {/* Spacer to fill remaining width if container is wider than table */}
          <div className="flex-1 bg-muted/20 border-b border-border min-w-0" />
        </div>
      ))}
    </div>
  );
};

export default GridHeader;
