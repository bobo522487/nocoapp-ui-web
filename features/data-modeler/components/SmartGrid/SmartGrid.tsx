
import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  Row,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Checkbox } from "../../../../../components/ui/checkbox";
import { Button } from "../../../../../components/ui/button";
import { SchemaField } from '../../../../types';
import GridHeader from './GridHeader';
import { GridToolbar } from './GridToolbar';
import { CellFactory } from './CellFactory';
import { cn } from '../../../../lib/utils';
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, GripVertical } from 'lucide-react';

interface SmartGridProps<T> {
  data: T[];
  schema: SchemaField[]; // Used to generate columns
  onCellEdit?: (rowId: string | number, colId: string, value: any) => void;
  onAddColumn?: () => void;
  onAddRow?: () => void;
  onRowSelect?: (selectedIds: (string | number)[]) => void;
  isLoading?: boolean;
}

// --- Helper to generate React Table columns from Schema ---
const generateColumns = (schema: SchemaField[]): ColumnDef<any>[] => {
    // Selection Column with Row Number / Drag Handle / Checkbox
    const selectCol: ColumnDef<any> = {
        id: 'select',
        header: ({ table }) => {
            const isAllSelected = table.getIsAllRowsSelected();
            const isSomeSelected = table.getIsSomeRowsSelected();
            const isSelectionActive = isAllSelected || isSomeSelected;

            return (
                <div className="flex items-center w-full h-full relative">
                    <span className={cn(
                        "text-[10px] text-muted-foreground/60 font-mono select-none text-left flex-1",
                        isSelectionActive ? "hidden" : "group-hover:hidden"
                    )}>
                        #
                    </span>
                    <div className={cn(
                        "flex items-center justify-end w-full",
                        isSelectionActive ? "flex" : "hidden group-hover:flex"
                    )}>
                        <Checkbox
                            checked={isAllSelected || (isSomeSelected ? "indeterminate" : false)}
                            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
                            aria-label="Select all"
                            className="h-3.5 w-3.5 border-muted-foreground/50 data-[state=checked]:border-primary bg-background/50 ml-auto"
                        />
                    </div>
                </div>
            );
        },
        cell: ({ row }) => (
            <div className="flex items-center w-full h-full relative pl-2 pr-1.5">
                {/* Default: Number (Left Aligned) */}
                <span className={cn(
                    "text-[10px] text-muted-foreground font-mono transition-opacity select-none text-left flex-1",
                    row.getIsSelected() ? "hidden" : "group-hover:hidden"
                )}>
                    {row.index + 1}
                </span>

                {/* Hover/Selected: Controls */}
                <div className={cn(
                    "items-center justify-between w-full",
                    row.getIsSelected() ? "flex" : "hidden group-hover:flex"
                )}>
                    <GripVertical size={12} className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing -ml-1" />
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        className="h-3.5 w-3.5 border-muted-foreground/50 data-[state=checked]:border-primary bg-background/50"
                    />
                </div>
            </div>
        ),
        size: 50,
        enableResizing: false,
    };

    // Data Columns
    const dataCols: ColumnDef<any>[] = schema.map((field) => ({
        accessorKey: field.id,
        header: () => (
            <div className="flex items-center gap-2">
                {field.icon && <field.icon size={13} className="text-muted-foreground shrink-0" />}
                <span className="truncate">{field.name}</span>
            </div>
        ),
        size: field.width || 150,
        minSize: 60,
        maxSize: 800,
        meta: {
            fieldDef: field
        }
    }));

    return [selectCol, ...dataCols];
};

export type DensityState = 'short' | 'medium' | 'tall' | 'extra';

export const SmartGrid = <T extends { id: string | number }>({ 
    data, 
    schema,
    onCellEdit,
    onAddColumn,
    onAddRow,
    onRowSelect
}: SmartGridProps<T>) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [density, setDensity] = useState<DensityState>('short');
  
  // Cell Navigation & Editing State
  const [focusedCell, setFocusedCell] = useState<{ rowId: string, colId: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string, colId: string } | null>(null);

  const columns = useMemo(() => generateColumns(schema), [schema]);

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      sorting,
      columnFilters,
      pagination,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    defaultColumn: {
        size: 150,
        minSize: 50,
        maxSize: 800,
    }
  });

  // Notify parent of selection changes
  useEffect(() => {
      if (onRowSelect) {
          const selectedRows = table.getSelectedRowModel().rows.map(row => row.original.id);
          onRowSelect(selectedRows);
      }
  }, [rowSelection, onRowSelect, table]);

  const getRowHeight = () => {
      switch(density) {
          case 'short': return 32;
          case 'medium': return 40;
          case 'tall': return 56;
          case 'extra': return 80;
          default: return 32;
      }
  };
  const rowHeight = getRowHeight();

  // Virtualization
  const { rows } = table.getRowModel(); // These are the paginated rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 20,
  });

  // Effect to force remeasure when rowHeight changes
  useEffect(() => {
      rowVirtualizer.measure();
  }, [rowHeight, rowVirtualizer]);

  // --- Interaction Handlers ---

  const handleCellClick = (rowId: string, colId: string) => {
      setFocusedCell({ rowId, colId });
      setEditingCell(null); 
  };

  const handleCellDoubleClick = (rowId: string, colId: string) => {
      setFocusedCell({ rowId, colId });
      setEditingCell({ rowId, colId });
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (!focusedCell) return;
      if (editingCell) {
          if (e.key === 'Escape') {
              setEditingCell(null);
              tableContainerRef.current?.focus(); 
          } else if (e.key === 'Enter' && !e.shiftKey) {
              setEditingCell(null);
              const currentRowIdx = rows.findIndex(r => String(r.original.id) === String(focusedCell.rowId));
              if (currentRowIdx < rows.length - 1) {
                  setFocusedCell({ rowId: String(rows[currentRowIdx + 1].original.id), colId: focusedCell.colId });
              }
          }
          return;
      }

      const currentRowIdx = rows.findIndex(r => String(r.original.id) === String(focusedCell.rowId));
      const visibleCols = table.getVisibleLeafColumns();
      const currentColIdx = visibleCols.findIndex(c => c.id === focusedCell.colId);

      let nextRowIdx = currentRowIdx;
      let nextColIdx = currentColIdx;

      switch(e.key) {
          case 'ArrowUp':
              nextRowIdx = Math.max(0, currentRowIdx - 1);
              break;
          case 'ArrowDown':
              nextRowIdx = Math.min(rows.length - 1, currentRowIdx + 1);
              break;
          case 'ArrowLeft':
              nextColIdx = Math.max(1, currentColIdx - 1); // Skip select column 0
              break;
          case 'ArrowRight':
              nextColIdx = Math.min(visibleCols.length - 1, currentColIdx + 1);
              break;
          case 'Enter':
              setEditingCell(focusedCell);
              e.preventDefault(); 
              return;
          default:
              if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  setEditingCell(focusedCell);
              }
              return; 
      }

      if (nextRowIdx !== currentRowIdx || nextColIdx !== currentColIdx) {
          e.preventDefault();
          const nextRow = rows[nextRowIdx];
          const nextCol = visibleCols[nextColIdx];
          if (nextRow && nextCol) {
              setFocusedCell({ rowId: String(nextRow.original.id), colId: nextCol.id });
          }
      }
  }, [focusedCell, editingCell, rows, table]);

  return (
    <div className="flex flex-col h-full w-full bg-background select-none text-sm font-sans relative" tabIndex={0} onKeyDown={handleKeyDown}>
        
        {/* Toolbar */}
        <GridToolbar 
            table={table} 
            onSearch={setGlobalFilter} 
            onAddRecord={onAddRow} 
            density={density}
            setDensity={setDensity}
        />

        {/* Scrollable Area (Header + Body) */}
        <div 
            ref={tableContainerRef} 
            className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
        >
            <div style={{ width: table.getTotalSize() }} className="min-w-full">
                {/* Sticky Header */}
                <div className="sticky top-0 z-20">
                    <GridHeader headerGroups={table.getHeaderGroups()} onAddColumn={onAddColumn} />
                </div>

                {/* Virtualized Rows */}
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        const isRowSelected = row.getIsSelected();
                        
                        return (
                            <div
                                key={row.id}
                                data-index={virtualRow.index}
                                className={cn(
                                    "absolute left-0 top-0 flex w-full border-b border-border transition-colors hover:bg-muted/20 box-border group",
                                    isRowSelected && "bg-muted/40"
                                )}
                                style={{
                                    transform: `translateY(${virtualRow.start}px)`,
                                    height: `${virtualRow.size}px`,
                                }}
                            >
                                {row.getVisibleCells().map((cell) => {
                                    const isFocused = focusedCell?.rowId === String(row.original.id) && focusedCell?.colId === cell.column.id;
                                    const isEditing = editingCell?.rowId === String(row.original.id) && editingCell?.colId === cell.column.id;
                                    const fieldDef = (cell.column.columnDef.meta as any)?.fieldDef;

                                    return (
                                        <div
                                            key={cell.id}
                                            className={cn(
                                                "flex items-center border-r border-border h-full relative outline-none",
                                                cell.column.getIsPinned() && "sticky left-0 bg-background z-10 shadow-[1px_0_0_hsl(var(--border))]",
                                                isFocused && "ring-2 ring-primary z-10 inset-0"
                                            )}
                                            style={{
                                                width: cell.column.getSize(),
                                            }}
                                            onClick={() => handleCellClick(String(row.original.id), cell.column.id)}
                                            onDoubleClick={() => handleCellDoubleClick(String(row.original.id), cell.column.id)}
                                        >
                                            {fieldDef ? (
                                                <CellFactory
                                                    value={cell.getValue()}
                                                    columnDef={fieldDef}
                                                    isEditing={isEditing}
                                                    autoFocus={isEditing}
                                                    onValueChange={(val) => onCellEdit?.(row.original.id, fieldDef.id, val)}
                                                    onBlur={() => setEditingCell(null)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            setEditingCell(null);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                flexRender(cell.column.columnDef.cell, cell.getContext())
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Append Row (Ghost Row) */}
                <div 
                    className="flex w-full border-b border-border/50 transition-colors cursor-pointer group relative"
                    style={{ height: `${rowHeight}px` }}
                    onClick={onAddRow}
                >
                    {/* Sticky Button Cell - Matches Select Column behavior */}
                    <div 
                        className={cn(
                            "sticky left-0 z-10 flex items-center justify-center border-r border-border/50 h-full transition-colors",
                            "bg-background group-hover:bg-muted" // Solid background to cover scrolled content
                        )}
                        style={{ width: '50px', flex: '0 0 50px' }}
                    >
                        <Plus size={16} className="text-muted-foreground/70 group-hover:text-primary transition-colors" />
                    </div>
                    
                    {/* Placeholder content for the rest of the row */}
                    <div className="flex-1 flex items-center px-2 text-xs text-muted-foreground/50 group-hover:text-primary/80 italic group-hover:bg-muted/20 transition-colors">
                        Click to add row
                    </div>
                </div>
            </div>
        </div>
        
        {/* Floating Add New Record Button (Bottom Left) - Kept as alternative access */}
        <div className="absolute bottom-12 left-4 z-30">
            <div className="flex shadow-lg rounded-md overflow-hidden bg-background border border-border">
                <Button 
                    variant="secondary" 
                    className="h-9 px-3 rounded-none border-r border-border/50 text-xs font-medium gap-2 bg-background hover:bg-muted"
                    onClick={onAddRow}
                >
                    <Plus size={14} className="text-primary" />
                    New record
                </Button>
                <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-9 w-9 rounded-none bg-background hover:bg-muted"
                >
                    <MoreHorizontal size={14} />
                </Button>
            </div>
        </div>

        {/* Pagination Footer */}
        <div className="h-10 border-t border-border bg-background flex items-center justify-between px-4 text-xs text-muted-foreground shrink-0 select-none z-30">
            <div className="flex items-center gap-4 pl-1">
                <span className="text-foreground font-medium">
                    {Object.keys(rowSelection).length > 0 ? `${Object.keys(rowSelection).length} selected` : `Total ${table.getFilteredRowModel().rows.length} records`}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={e => {
                            table.setPageSize(Number(e.target.value))
                        }}
                        className="h-6 rounded border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {[10, 20, 30, 40, 50, 100].map(pageSize => (
                            <option key={pageSize} value={pageSize}>
                                {pageSize}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1">
                    <span className="mr-2">
                        {table.getState().pagination.pageIndex + 1} of{' '}
                        {table.getPageCount()}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronsLeft size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronsRight size={14} />
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
};
