
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, Columns, MoreHorizontal, Plus, X, Check, MoveVertical, ListTree, Maximize, Minimize, Pencil, Trash2, Upload, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Separator } from "../../../../../components/ui/separator";
import { Table, Column } from '@tanstack/react-table';
import { createPortal } from 'react-dom';
import { cn } from '../../../../../lib/utils';
import { DensityState } from './SmartGrid';

interface GridToolbarProps<T> {
  table: Table<T>;
  onSearch: (value: string) => void;
  onAddRecord?: () => void;
  density: DensityState;
  setDensity: (d: DensityState) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onEditRow?: (id: string | number) => void;
  onDeleteRows?: (ids: (string | number)[]) => void;
  onImport?: (file: File) => void;
  onExport?: (type: 'csv' | 'excel') => void;
}

// --- Helper Components ---

const ToolbarPopover = ({ 
    trigger, 
    children, 
    isOpen, 
    onOpenChange,
    width = 240
}: { 
    trigger: React.ReactNode; 
    children?: React.ReactNode; 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void;
    width?: number;
}) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + 4, left: rect.left });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                contentRef.current && !contentRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                onOpenChange(false);
            }
        };
        const handleScroll = () => { if (isOpen) onOpenChange(false); };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, onOpenChange]);

    return (
        <div className="relative">
            <div ref={triggerRef} onClick={() => onOpenChange(!isOpen)}>
                {trigger}
            </div>
            {isOpen && createPortal(
                <div 
                    ref={contentRef}
                    className="fixed z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: coords.top, left: coords.left, width }}
                >
                    {children}
                </div>,
                document.body
            )}
        </div>
    );
};

export const GridToolbar = <T extends { id: string | number }>({ 
    table, 
    onSearch, 
    onAddRecord, 
    density, 
    setDensity, 
    isFullscreen, 
    onToggleFullscreen,
    onEditRow,
    onDeleteRows,
    onImport,
    onExport
}: GridToolbarProps<T>) => {
  const [activePopover, setActivePopover] = useState<'fields' | 'filter' | 'sort' | 'height' | 'group' | 'export' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleToggleColumn = (columnId: string) => {
      const col = table.getColumn(columnId);
      col?.toggleVisibility();
  };

  const handleAddSort = (columnId: string, desc: boolean) => {
      table.setSorting([{ id: columnId, desc }]);
      setActivePopover(null);
  };

  const handleRemoveSort = () => {
      table.setSorting([]);
  };

  const handleAddFilter = (columnId: string, value: string) => {
      table.setColumnFilters([{ id: columnId, value }]);
  };

  const handleRemoveFilter = (columnId: string) => {
      table.setColumnFilters(prev => prev.filter(f => f.id !== columnId));
  };

  const clearAllFilters = () => {
      table.setColumnFilters([]);
      setActivePopover(null);
  };

  const handleAddGroup = (columnId: string) => {
      const current = table.getState().grouping;
      if (!current.includes(columnId)) {
          table.setGrouping([...current, columnId]);
      }
      setActivePopover(null);
  };

  const handleRemoveGroup = (columnId: string) => {
      const current = table.getState().grouping;
      table.setGrouping(current.filter(c => c !== columnId));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImport) {
          onImport(file);
      }
      if (e.target) {
          e.target.value = ''; // Reset
      }
  };

  // Selection Logic
  const selectedRows = table.getSelectedRowModel().rows;
  const selectionCount = selectedRows.length;
  const isSelectionActive = selectionCount > 0;

  // Helper to extract string label from column metadata
  const getColumnLabel = (col: Column<T, unknown>) => {
      const meta = col.columnDef.meta as any;
      return meta?.fieldDef?.name || col.id;
  };

  // --- Derived State ---
  const allColumns = table.getAllLeafColumns().filter(c => c.id !== 'select'); // Exclude selection column
  const visibleColumns = table.getVisibleLeafColumns().filter(c => c.id !== 'select');
  const sortState = table.getState().sorting;
  const filterState = table.getState().columnFilters;
  const groupState = table.getState().grouping;

  const densityOptions: { id: DensityState, label: string, iconPath1: string, iconPath2: string }[] = [
    { 
        id: 'short', 
        label: 'Short', 
        iconPath1: "M3 6H12.75M3 6V5H12.75V6M3 6V7H12.75V6M3 10.5H12.75M3 15H12.75M3 19.5H12.75", 
        iconPath2: "M18.5 5V19.5M18.5 5L15.5 8M18.5 5L21.5 8M18.5 19.5L15.5 16.5M18.5 19.5L21.5 16.5" 
    },
    { 
        id: 'medium', 
        label: 'Medium', 
        iconPath1: "M3 6H12.75M3 6V5H12.75V6M3 6V7M12.75 6V7M3 15H12.75M3 19.5H12.75M3 7H12.75M3 7V7.875M12.75 7V7.875M12.75 8.75H3M12.75 8.75V7.875M12.75 8.75V9.625M3 8.75V7.875M3 8.75V9.625M3 7.875H12.75M12.75 9.625V10.5H3V9.625M12.75 9.625H3", 
        iconPath2: "M18.5 5V19.5M18.5 5L15.5 8M18.5 5L21.5 8M18.5 19.5L15.5 16.5M18.5 19.5L21.5 16.5" 
    },
    { 
        id: 'tall', 
        label: 'Tall', 
        iconPath1: "M3 6H12.75M3 6V5H12.75V6M3 6V7M12.75 6V7M3 10.5H12.75M3 10.5V9.625M3 10.5V11.625M12.75 10.5V9.625M12.75 10.5V11.625M3 19.5H12.75M3 7H12.75M3 7V7.875M12.75 7V7.875M12.75 8.75H3M12.75 8.75V7.875M12.75 8.75V9.625M3 8.75V7.875M3 8.75V9.625M3 7.875H12.75M12.75 9.625V10.5H3V9.625M12.75 9.625H3M12.75 12.75H3M12.75 12.75V11.625M12.75 12.75V13.875M3 12.75V11.625M3 12.75V14M3 11.625H12.75M12.75 13.875L3 14", 
        iconPath2: "M18.5 5V19.5M18.5 5L15.5 8M18.5 5L21.5 8M18.5 19.5L15.5 16.5M18.5 19.5L21.5 16.5" 
    },
    { 
        id: 'extra', 
        label: 'Extra', 
        iconPath1: "M3 6H12.75M3 6V5H12.75V6M3 6V7M12.75 6V7M3 10.5H12.75M3 10.5V9.625M3 10.5V11.625M12.75 10.5V9.625M12.75 10.5V11.625M3 15H12.75M3 15V14M3 15V16.125M12.75 15V13.875M12.75 15V16.125M3 7H12.75M3 7V7.875M12.75 7V7.875M12.75 8.75H3M12.75 8.75V7.875M12.75 8.75V9.625M3 8.75V7.875M3 8.75V9.625M3 7.875H12.75M12.75 9.625H3M12.75 12.75H3M12.75 12.75V11.625M12.75 12.75V13.875M3 12.75V11.625M3 12.75V14M3 11.625H12.75M12.75 13.875L3 14M12.75 17.25H3M12.75 17.25V16.125M12.75 17.25V18.375M3 17.25V16.125M3 17.25V18.375M3 16.125H12.75M12.75 18.375V19.5H3V18.375M12.75 18.375H3", 
        iconPath2: "M18.5 5V19.5M18.5 5L15.5 8M18.5 5L21.5 8M18.5 19.5L15.5 16.5M18.5 19.5L21.5 16.5" 
    }
  ];

  return (
    <div className={cn(
        "h-10 border-b border-border bg-background flex items-center justify-between px-2 shrink-0 select-none z-30 transition-colors",
        isSelectionActive && "bg-primary/5 border-primary/20"
    )}>
      <div className="flex items-center gap-1">
        
        {isSelectionActive ? (
            // Selection Mode Actions
            <div className="flex items-center gap-2">
                {/* Edit (Single Selection Only) */}
                {selectionCount === 1 && onEditRow && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs font-medium text-foreground hover:bg-background/80 gap-1.5"
                        onClick={() => {
                            const rowId = selectedRows[0].original.id;
                            onEditRow(rowId);
                        }}
                    >
                        <Pencil size={14} />
                        Edit Row
                    </Button>
                )}

                {/* Delete (Single or Multi) */}
                {onDeleteRows && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                        onClick={() => {
                            const ids = selectedRows.map(r => r.original.id);
                            onDeleteRows(ids);
                            table.resetRowSelection();
                        }}
                    >
                        <Trash2 size={14} />
                        Delete Row{selectionCount > 1 ? 's' : ''}
                    </Button>
                )}
            </div>
        ) : (
            // Standard Toolbar Tools
            <>
                {/* Fields Menu */}
                <ToolbarPopover
                    isOpen={activePopover === 'fields'}
                    onOpenChange={(open) => setActivePopover(open ? 'fields' : null)}
                    trigger={
                        <Button variant={activePopover === 'fields' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5">
                            <Columns size={14} />
                            <span>Fields</span>
                            {allColumns.length > visibleColumns.length && (
                                <span className="bg-primary/10 text-primary text-[10px] px-1 rounded-sm">{visibleColumns.length}</span>
                            )}
                        </Button>
                    }
                >
                    <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Toggle Columns</div>
                        {allColumns.map(col => (
                            <div 
                                key={col.id} 
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleToggleColumn(col.id)}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                    col.getIsVisible() ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                                )}>
                                    {col.getIsVisible() && <Check size={10} />}
                                </div>
                                <span className="text-xs text-foreground">{getColumnLabel(col)}</span>
                            </div>
                        ))}
                    </div>
                </ToolbarPopover>

                {/* Filter Menu */}
                <ToolbarPopover
                    isOpen={activePopover === 'filter'}
                    onOpenChange={(open) => setActivePopover(open ? 'filter' : null)}
                    width={300}
                    trigger={
                        <Button variant={(activePopover === 'filter' || filterState.length > 0) ? 'secondary' : 'ghost'} size="sm" className={cn("h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5", filterState.length > 0 && "text-primary")}>
                            <Filter size={14} />
                            <span>Filter</span>
                            {filterState.length > 0 && (
                                <span className="bg-primary/10 text-primary text-[10px] px-1 rounded-sm">{filterState.length}</span>
                            )}
                        </Button>
                    }
                >
                    <div className="p-3 space-y-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase flex justify-between items-center">
                            <span>Active Filters</span>
                            {filterState.length > 0 && (
                                <button onClick={clearAllFilters} className="text-[10px] text-destructive hover:underline">Clear all</button>
                            )}
                        </div>
                        
                        {filterState.length === 0 && (
                            <div className="text-xs text-muted-foreground italic py-2 text-center">No filters applied</div>
                        )}

                        {filterState.map((filter) => (
                            <div key={filter.id} className="flex items-center gap-2 bg-muted/30 p-1.5 rounded border border-border">
                                <span className="text-xs font-medium text-foreground px-1">{filter.id}</span>
                                <span className="text-xs text-muted-foreground">contains</span>
                                <span className="text-xs font-medium bg-background px-1.5 py-0.5 rounded border border-border text-foreground">{filter.value as string}</span>
                                <button onClick={() => handleRemoveFilter(filter.id)} className="ml-auto text-muted-foreground hover:text-foreground">
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        <Separator />
                        
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-foreground">Add Filter</div>
                            <div className="flex gap-2">
                                <select 
                                    className="h-7 w-1/3 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    id="new-filter-col"
                                >
                                    {allColumns.map(c => <option key={c.id} value={c.id}>{getColumnLabel(c)}</option>)}
                                </select>
                                <Input 
                                    className="h-7 flex-1 text-xs text-foreground" 
                                    placeholder="Value..." 
                                    id="new-filter-val"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const col = (document.getElementById('new-filter-col') as HTMLSelectElement).value;
                                            const val = e.currentTarget.value;
                                            if (col && val) {
                                                handleAddFilter(col, val);
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                                <Button 
                                    size="sm" 
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                        const col = (document.getElementById('new-filter-col') as HTMLSelectElement).value;
                                        const val = (document.getElementById('new-filter-val') as HTMLInputElement).value;
                                        if (col && val) {
                                            handleAddFilter(col, val);
                                            (document.getElementById('new-filter-val') as HTMLInputElement).value = '';
                                        }
                                    }}
                                >
                                    <Plus size={14} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </ToolbarPopover>

                {/* Sort Menu */}
                <ToolbarPopover
                    isOpen={activePopover === 'sort'}
                    onOpenChange={(open) => setActivePopover(open ? 'sort' : null)}
                    trigger={
                        <Button variant={(activePopover === 'sort' || sortState.length > 0) ? 'secondary' : 'ghost'} size="sm" className={cn("h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5", sortState.length > 0 && "text-primary")}>
                            <ArrowUpDown size={14} />
                            <span>Sort</span>
                            {sortState.length > 0 && (
                                <span className="bg-primary/10 text-primary text-[10px] px-1 rounded-sm">{sortState.length}</span>
                            )}
                        </Button>
                    }
                >
                    <div className="p-2 space-y-1">
                        {sortState.length > 0 && (
                            <div className="mb-2 space-y-1">
                                {sortState.map(sort => (
                                    <div key={sort.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-muted/50 rounded-sm text-foreground">
                                        <span>{sort.id} ({sort.desc ? 'Desc' : 'Asc'})</span>
                                        <button onClick={handleRemoveSort}><X size={12} /></button>
                                    </div>
                                ))}
                                <Separator className="my-2"/>
                            </div>
                        )}
                        
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Sort by</div>
                        {allColumns.map(col => (
                            <div 
                                key={col.id} 
                                className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer group"
                                onClick={() => handleAddSort(col.id, false)}
                            >
                                <span className="text-xs text-foreground">{getColumnLabel(col)}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                    <span className="text-[10px] text-muted-foreground bg-background border px-1 rounded">A-Z</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ToolbarPopover>

                {/* Separator */}
                <div className="h-4 w-px bg-border mx-1" />

                {/* Group */}
                <ToolbarPopover
                    isOpen={activePopover === 'group'}
                    onOpenChange={(open) => setActivePopover(open ? 'group' : null)}
                    width={240}
                    trigger={
                        <Button variant={(activePopover === 'group' || groupState.length > 0) ? 'secondary' : 'ghost'} size="sm" className={cn("h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 hidden sm:flex", groupState.length > 0 && "text-primary")}>
                            <ListTree size={14} />
                            <span>Group</span>
                            {groupState.length > 0 && (
                                <span className="bg-primary/10 text-primary text-[10px] px-1 rounded-sm">{groupState.length}</span>
                            )}
                        </Button>
                    }
                >
                    <div className="p-3 space-y-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">Group by</div>
                        
                        {groupState.length > 0 ? (
                            <div className="space-y-1">
                                {groupState.map((groupId) => (
                                    <div key={groupId} className="flex items-center justify-between bg-muted/30 p-1.5 rounded border border-border">
                                        <span className="text-xs font-medium text-foreground px-1">{groupId}</span>
                                        <button onClick={() => handleRemoveGroup(groupId)} className="text-muted-foreground hover:text-foreground">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic text-center py-1">No active groupings</div>
                        )}

                        <Separator />

                        <div className="space-y-1">
                            <div className="px-2 py-1 text-xs text-muted-foreground">Select column to group</div>
                            {allColumns.filter(c => !groupState.includes(c.id)).map(col => (
                                <div 
                                    key={col.id} 
                                    className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer"
                                    onClick={() => handleAddGroup(col.id)}
                                >
                                    <span className="text-xs text-foreground">{getColumnLabel(col)}</span>
                                    <Plus size={12} className="text-muted-foreground" />
                                </div>
                            ))}
                        </div>
                    </div>
                </ToolbarPopover>

                {/* Import / Export */}
                <div className="h-4 w-px bg-border mx-1" />
                
                {onImport && (
                    <>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".csv,.xlsx,.xls" 
                            onChange={handleFileChange}
                        />
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
                            onClick={() => fileInputRef.current?.click()}
                            title="Import CSV/Excel"
                        >
                            <Upload size={14} />
                            <span className="hidden xl:inline">Import</span>
                        </Button>
                    </>
                )}

                {onExport && (
                    <ToolbarPopover
                        isOpen={activePopover === 'export'}
                        onOpenChange={(open) => setActivePopover(open ? 'export' : null)}
                        width={160}
                        trigger={
                            <Button variant={activePopover === 'export' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5">
                                <Download size={14} />
                                <span className="hidden xl:inline">Export</span>
                            </Button>
                        }
                    >
                        <div className="p-1 space-y-0.5">
                            <div 
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer text-xs"
                                onClick={() => { onExport('csv'); setActivePopover(null); }}
                            >
                                <FileText size={14} className="text-blue-500" />
                                <span>Download CSV</span>
                            </div>
                            <div 
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer text-xs"
                                onClick={() => { onExport('excel'); setActivePopover(null); }}
                            >
                                <FileSpreadsheet size={14} className="text-green-600" />
                                <span>Download Excel</span>
                            </div>
                        </div>
                    </ToolbarPopover>
                )}

                {/* Height (Density) */}
                <ToolbarPopover
                    isOpen={activePopover === 'height'}
                    onOpenChange={(open) => setActivePopover(open ? 'height' : null)}
                    width={160}
                    trigger={
                        <Button variant={activePopover === 'height' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                            <MoveVertical size={14} />
                        </Button>
                    }
                >
                    <div className="flex flex-col w-full text-sm">
                        <div className="text-xs text-muted-foreground px-3 pt-2 pb-1 select-none font-semibold">Record Height</div>
                        {densityOptions.map(opt => (
                            <div 
                                key={opt.id}
                                onClick={() => { setDensity(opt.id); setActivePopover(null); }}
                                className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d={opt.iconPath1} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d={opt.iconPath2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="text-foreground">{opt.label}</span>
                                </div>
                                {density === opt.id && (
                                    <Check size={14} className="text-primary" />
                                )}
                            </div>
                        ))}
                    </div>
                </ToolbarPopover>

                {/* More Actions */}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal size={14} />
                </Button>
            </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Search..." 
                className="h-7 w-48 pl-8 text-xs bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary border-transparent focus:border-input focus:bg-background transition-all"
                onChange={(e) => onSearch(e.target.value)}
            />
        </div>
        <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </Button>
      </div>
    </div>
  );
};
