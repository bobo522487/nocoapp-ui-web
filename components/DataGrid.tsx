
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Plus, ArrowUpDown, Table as TableIcon, 
  Trash2, CheckSquare, ChevronLeft, ChevronRight, 
  Columns, EyeOff, ArrowUpAZ, ArrowDownAZ, ListFilter, 
  X, ChevronDown, PlusCircle
} from 'lucide-react';
import DataTable, { ColumnDef } from './DataTable';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FilterRule, SortRule, ViewConfig } from '../types';

// --- Types ---

export interface DataGridProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    onAdd?: () => void;
    addItemLabel?: string;
    onAddColumn?: () => void; // New prop for adding columns
    onEdit?: (rowId: string | number, colId: string, value: any) => void;
    onDelete?: (ids: (string | number)[]) => void;
    title?: string;
    keyField?: keyof T;
    // View Config Props
    viewConfig?: ViewConfig;
    onViewConfigChange?: (config: ViewConfig) => void;
    // New prop to hide the top toolbar
    hideToolbar?: boolean;
}

// --- Internal Portal Component for Dropdowns ---
interface ToolbarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  width?: number;
  className?: string;
  placement?: 'bottom-start' | 'top-start';
}

const ToolbarPopover: React.FC<ToolbarPopoverProps> = ({ isOpen, onClose, triggerRef, children, width = 240, className = "", placement = 'bottom-start' }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      if (placement === 'top-start') {
          setStyle({
              bottom: window.innerHeight - rect.top + 4,
              left: rect.left,
              width: width,
              maxHeight: '400px'
          });
      } else {
          setStyle({
              top: rect.bottom + 4,
              left: rect.left,
              width: width,
              maxHeight: '400px'
          });
      }
    }
  }, [isOpen, triggerRef, placement, width]);

  useEffect(() => {
    const handleScroll = () => { if (isOpen) onClose(); };
    const handleResize = () => { if (isOpen) onClose(); };
    
    if (isOpen) {
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);
    }
    return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[40]" onClick={onClose} />
      <div 
        className={`fixed z-[50] bg-popover text-popover-foreground border border-border rounded-lg shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-100 ${className}`}
        style={style}
      >
        {children}
      </div>
    </>,
    document.body
  );
};

function DataGrid<T>({ 
    data,
    columns,
    onAdd,
    addItemLabel = "Add Item",
    onAddColumn,
    onEdit,
    onDelete,
    title,
    keyField = "id" as keyof T,
    viewConfig,
    onViewConfigChange,
    hideToolbar = false
}: DataGridProps<T>) {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  
  // Menu States
  const [showFieldsMenu, setShowFieldsMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);

  // Local State fallback (if viewConfig not provided)
  const [localHiddenFields, setLocalHiddenFields] = useState<string[]>([]);
  const [localFilters, setLocalFilters] = useState<FilterRule[]>([]);
  const [localSort, setLocalSort] = useState<SortRule | null>(null);

  // Derived State (controlled vs uncontrolled)
  const hiddenFields = viewConfig ? viewConfig.hiddenFields : localHiddenFields;
  const filters = viewConfig ? viewConfig.filters : localFilters;
  const sort = viewConfig ? viewConfig.sort : localSort;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Reset local state when title changes (implies context switch), but if controlled, parent handles it
  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
    if (!viewConfig) {
        setLocalFilters([]);
        setLocalSort(null);
        setLocalHiddenFields([]);
    }
  }, [title]);

  // Helpers to update config
  const updateConfig = (updates: Partial<ViewConfig>) => {
      if (viewConfig && onViewConfigChange) {
          onViewConfigChange({ ...viewConfig, ...updates });
      } else {
          if (updates.hiddenFields !== undefined) setLocalHiddenFields(updates.hiddenFields);
          if (updates.filters !== undefined) setLocalFilters(updates.filters);
          if (updates.sort !== undefined) setLocalSort(updates.sort);
      }
  };

  // Refs
  const fieldsBtnRef = useRef<HTMLButtonElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const pageSizeBtnRef = useRef<HTMLDivElement>(null);

  // --- Processing Data (Filter & Sort) ---
  const processedRecords = useMemo(() => {
    let result = [...data];

    // 1. Filter
    if (filters.length > 0) {
        result = result.filter(record => {
            return filters.every(filter => {
                const val = String((record as any)[filter.fieldId] || '').toLowerCase();
                const filterVal = filter.value.toLowerCase();
                
                switch (filter.operator) {
                    case 'contains': return val.includes(filterVal);
                    case 'equals': return val === filterVal;
                    case 'startsWith': return val.startsWith(filterVal);
                    case 'endsWith': return val.endsWith(filterVal);
                    default: return true;
                }
            });
        });
    }

    // 2. Sort
    if (sort) {
        result.sort((a, b) => {
            if (!sort) return 0;
            const valA = (a as any)[sort.fieldId];
            const valB = (b as any)[sort.fieldId];
            
            if (valA === valB) return 0;
            
            const comparison = valA > valB ? 1 : -1;
            return sort.direction === 'asc' ? comparison : -comparison;
        });
    }

    return result;
  }, [data, filters, sort]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  // --- Pagination Logic ---
  const totalRecords = processedRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const displayedData = useMemo(() => {
      return processedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [processedRecords, currentPage, pageSize]);


  // --- Handlers ---
  const handleBulkDelete = () => {
      if (!onDelete || selectedIds.length === 0) return;
      
      onDelete(selectedIds);
      setSelectedIds([]);
  };

  const toggleFieldVisibility = (fieldId: string) => {
    const newHidden = hiddenFields.includes(fieldId) 
        ? hiddenFields.filter(id => id !== fieldId) 
        : [...hiddenFields, fieldId];
    updateConfig({ hiddenFields: newHidden });
  };

  // Filter Actions
  const addFilter = () => {
      const firstField = columns[0]?.id || 'id';
      const newFilter: FilterRule = { id: `f_${Date.now()}`, fieldId: firstField, operator: 'contains', value: '' };
      updateConfig({ filters: [...filters, newFilter] });
  };

  const updateFilter = (id: string, updates: Partial<FilterRule>) => {
      const newFilters = filters.map(f => f.id === id ? { ...f, ...updates } : f);
      updateConfig({ filters: newFilters });
  };

  const removeFilter = (id: string) => {
      const newFilters = filters.filter(f => f.id !== id);
      updateConfig({ filters: newFilters });
  };

  const visibleColumns = useMemo(() => columns.filter(col => !hiddenFields.includes(col.id)), [columns, hiddenFields]);

  return (
    <div className="flex-1 flex flex-col bg-background h-full min-w-0 overflow-hidden font-sans text-sm transition-colors">
      {/* Top Toolbar - Hidden if hideToolbar is true */}
      {!hideToolbar && (
        <div className="relative h-12 border-b border-border flex items-center px-4 bg-background shrink-0 z-10 transition-colors">
            
            {/* Title / Label */}
            {title && (
                <div className="flex items-center gap-2 mr-4 text-sm font-semibold text-foreground">
                    <TableIcon size={16} className="text-muted-foreground"/>
                    <span>{title}</span>
                </div>
            )}

            {/* Right Side - Search */}
            <div className="ml-auto relative group hidden lg:block z-20">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input type="text" placeholder="Search records..." className="pl-8 h-8 w-48 text-xs bg-muted/20" />
            </div>
        </div>
      )}

      {/* Secondary Toolbar - Contextual */}
      {selectedIds.length > 0 ? (
           <div className="h-10 border-b border-border bg-red-50 dark:bg-red-900/20 flex items-center px-4 gap-4 shrink-0 transition-colors animate-in slide-in-from-top-2 duration-200">
               <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 font-medium">
                   <div className="w-5 h-5 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center text-xs font-bold">
                       {selectedIds.length}
                   </div>
                   <span>Selected</span>
               </div>
               
               <Button 
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-7 gap-1.5 text-xs"
               >
                   <Trash2 size={14} />
                   Delete Selected
               </Button>
           </div>
      ) : (
          <div className="h-10 border-b border-border bg-muted/20 flex items-center px-4 gap-2 shrink-0 overflow-visible transition-colors z-0">
            
            {onAdd && (
                <Button 
                    size="sm"
                    onClick={onAdd}
                    variant="default"
                    className="h-7 gap-1.5 text-xs"
                >
                    <Plus size={14} strokeWidth={2.5} /> {addItemLabel}
                </Button>
            )}

            {onAddColumn && (
                <Button 
                    size="sm"
                    onClick={onAddColumn}
                    variant="outline"
                    className="h-7 gap-1.5 text-xs bg-background hover:bg-accent"
                >
                    <PlusCircle size={14} /> Add Column
                </Button>
            )}

            <div className="w-px h-4 bg-border mx-1"></div>

            {/* Filter Button */}
            <Button 
                ref={filterBtnRef}
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                variant={showFilterMenu || filters.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
            >
                <ListFilter size={14} /> 
                Filter 
                {filters.length > 0 && <span className="bg-primary text-primary-foreground text-[9px] px-1 rounded-full">{filters.length}</span>}
            </Button>
            
            <ToolbarPopover 
                isOpen={showFilterMenu} 
                onClose={() => setShowFilterMenu(false)} 
                triggerRef={filterBtnRef} 
                width={320}
            >
                <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Filters</span>
                        {filters.length > 0 && (
                            <button onClick={() => updateConfig({ filters: [] })} className="text-[10px] text-primary hover:underline">Clear all</button>
                        )}
                    </div>
                    
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                        {filters.length === 0 ? (
                            <div className="text-xs text-muted-foreground italic py-2 text-center">No active filters</div>
                        ) : (
                            filters.map((filter) => (
                                <div key={filter.id} className="flex items-center gap-2 text-xs">
                                    <select 
                                        value={filter.fieldId}
                                        onChange={(e) => updateFilter(filter.id, { fieldId: e.target.value })}
                                        className="bg-muted border border-border rounded px-2 py-1 outline-none w-24 text-foreground"
                                    >
                                        {columns.map(f => <option key={f.id} value={f.accessorKey as string}>{f.header as string}</option>)}
                                    </select>
                                    <select 
                                        value={filter.operator}
                                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                                        className="bg-muted border border-border rounded px-2 py-1 outline-none w-24 text-foreground"
                                    >
                                        <option value="contains">contains</option>
                                        <option value="equals">equals</option>
                                        <option value="startsWith">starts with</option>
                                        <option value="endsWith">ends with</option>
                                    </select>
                                    <Input 
                                        type="text" 
                                        value={filter.value}
                                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                        className="flex-1 h-7 min-w-0"
                                        placeholder="Value"
                                    />
                                    <button onClick={() => removeFilter(filter.id)} className="text-muted-foreground hover:text-destructive">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <Button 
                        variant="ghost"
                        size="sm"
                        onClick={addFilter}
                        className="h-7 gap-1 text-xs text-primary hover:text-primary"
                    >
                        <Plus size={12} /> Add filter
                    </Button>
                </div>
            </ToolbarPopover>

            {/* Sort Button */}
            <Button 
                ref={sortBtnRef}
                onClick={() => setShowSortMenu(!showSortMenu)}
                variant={showSortMenu || sort ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
            >
                <ArrowUpDown size={14} /> 
                Sort
                {sort && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
            </Button>

            <ToolbarPopover 
                isOpen={showSortMenu} 
                onClose={() => setShowSortMenu(false)} 
                triggerRef={sortBtnRef} 
                width={200}
            >
                <div className="p-1 flex flex-col">
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Sort by</div>
                    {columns.map(field => (
                        <div 
                            key={field.id}
                            onClick={() => {
                                if (sort && sort.fieldId === field.accessorKey) {
                                    updateConfig({ sort: sort?.direction === 'asc' ? { ...sort, direction: 'desc' } : null });
                                } else if (field.accessorKey) {
                                    updateConfig({ sort: { fieldId: field.accessorKey as string, direction: 'asc' } });
                                }
                            }}
                            className={`flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-xs transition-colors ${sort?.fieldId === field.accessorKey ? 'text-primary font-medium' : 'text-foreground'} ${!field.accessorKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <span>{field.header}</span>
                            </div>
                            {sort && sort.fieldId === field.accessorKey && (
                                sort?.direction === 'asc' ? <ArrowUpAZ size={14} /> : <ArrowDownAZ size={14} />
                            )}
                        </div>
                    ))}
                    {sort && (
                        <div className="border-t border-border mt-1 pt-1">
                            <div 
                                onClick={() => updateConfig({ sort: null })}
                                className="px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-xs text-muted-foreground text-center"
                            >
                                Clear Sort
                            </div>
                        </div>
                    )}
                </div>
            </ToolbarPopover>
            
            {/* Fields Button */}
            <div className="relative">
            <Button 
                ref={fieldsBtnRef}
                onClick={() => setShowFieldsMenu(!showFieldsMenu)}
                variant={showFieldsMenu ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
            >
                <Columns size={14} /> 
                Fields
            </Button>
            <ToolbarPopover isOpen={showFieldsMenu} onClose={() => setShowFieldsMenu(false)} triggerRef={fieldsBtnRef} width={200}>
                <div className="p-1 flex flex-col">
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Visible Fields</div>
                    {columns.map(field => (
                        <div 
                            key={field.id}
                            onClick={() => toggleFieldVisibility(field.id)}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-xs transition-colors"
                        >
                            {hiddenFields.includes(field.id) ? (
                                <div className="w-4 h-4 border border-input rounded flex items-center justify-center"></div>
                            ) : (
                                <div className="w-4 h-4 bg-primary rounded flex items-center justify-center text-primary-foreground">
                                    <CheckSquare size={10} />
                                </div>
                            )}
                            <span className={hiddenFields.includes(field.id) ? 'text-muted-foreground line-through' : 'text-foreground'}>{field.header}</span>
                            {hiddenFields.includes(field.id) && <EyeOff size={12} className="ml-auto text-muted-foreground" />}
                        </div>
                    ))}
                </div>
            </ToolbarPopover>
            </div>
          </div>
      )}

      <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] scrollbar-track-transparent">
        <DataTable
            data={displayedData}
            columns={visibleColumns}
            onCellEdit={onEdit}
            keyField={keyField}
            rowClassName="h-10"
            enableSelection={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Footer / Pagination */}
      <div className="h-10 border-t border-border bg-muted/20 flex items-center justify-between px-4 shrink-0 transition-colors text-xs text-muted-foreground">
        
        {/* Left: Keyboard Hints (Visual only) */}
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                 <div className="flex gap-1">
                     <div className="w-5 h-5 bg-background border border-border rounded flex items-center justify-center shadow-sm">
                        <ChevronLeft size={10} />
                     </div>
                     <div className="w-5 h-5 bg-background border border-border rounded flex items-center justify-center shadow-sm">
                        <ChevronRight size={10} />
                     </div>
                 </div>
                 <span>Navigate</span>
             </div>
        </div>

        {/* Center: Pagination Controls */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
             <Button 
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
             >
                 <ChevronLeft size={14} />
             </Button>
             
             <div className="flex items-center gap-1 font-medium text-foreground">
                 <Input 
                    type="text" 
                    value={currentPage}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) setCurrentPage(val);
                    }}
                    className="h-6 w-8 text-center px-0 text-xs"
                 />
                 <span className="text-muted-foreground">/ {totalPages}</span>
             </div>

             <Button 
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
             >
                 <ChevronRight size={14} />
             </Button>
        </div>

        {/* Right: Record Count & Page Size */}
        <div className="flex items-center gap-4">
            <span>{startRecord} - {endRecord} of {totalRecords} Records</span>
            
            <div className="relative">
                <div 
                    ref={pageSizeBtnRef}
                    onClick={() => setShowPageSizeMenu(!showPageSizeMenu)}
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                >
                    <span>{pageSize} records</span>
                    <ChevronDown size={12} />
                </div>
                
                <ToolbarPopover
                    isOpen={showPageSizeMenu}
                    onClose={() => setShowPageSizeMenu(false)}
                    triggerRef={pageSizeBtnRef}
                    width={120}
                    placement="top-start"
                >
                    <div className="p-1">
                        {[10, 25, 50, 100].map(size => (
                            <div 
                                key={size}
                                onClick={() => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                    setShowPageSizeMenu(false);
                                }}
                                className={`px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-muted flex justify-between items-center ${pageSize === size ? 'text-primary font-medium' : 'text-foreground'}`}
                            >
                                <span>{size} records</span>
                                {pageSize === size && <CheckSquare size={10} />}
                            </div>
                        ))}
                    </div>
                </ToolbarPopover>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DataGrid;
