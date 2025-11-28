import React from 'react';
import DataTable, { ColumnDef } from './DataTable';
import { Button } from "./ui/button";
import { Plus, Trash2, Search, Table as TableIcon } from 'lucide-react';
import { Input } from "./ui/input";
import { ViewConfig } from '../types';

// Legacy DataGrid interface kept for Model View and other parts of the app
export interface DataGridProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    onAdd?: () => void;
    addItemLabel?: string;
    onAddColumn?: () => void;
    onEdit?: (rowId: string | number, colId: string, value: any) => void;
    onDelete?: (ids: (string | number)[]) => void;
    title?: string;
    keyField?: keyof T;
    viewConfig?: ViewConfig;
    onViewConfigChange?: (config: ViewConfig) => void;
    hideToolbar?: boolean;
}

function DataGrid<T>({ 
    data,
    columns,
    onAdd,
    addItemLabel = "Add Item",
    onEdit,
    onDelete,
    title,
    keyField = "id" as keyof T,
    hideToolbar = false
}: DataGridProps<T>) {
  const [selectedIds, setSelectedIds] = React.useState<(string | number)[]>([]);

  const handleBulkDelete = () => {
      if (!onDelete || selectedIds.length === 0) return;
      onDelete(selectedIds);
      setSelectedIds([]);
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-full min-w-0 overflow-hidden font-sans text-sm transition-colors">
      {!hideToolbar && (
        <div className="relative h-12 border-b border-border flex items-center px-4 bg-background shrink-0 z-10 transition-colors">
            {title && (
                <div className="flex items-center gap-2 mr-4 text-sm font-semibold text-foreground">
                    <TableIcon size={16} className="text-muted-foreground"/>
                    <span>{title}</span>
                </div>
            )}
            <div className="ml-auto relative group hidden lg:block z-20">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input type="text" placeholder="Search records..." className="pl-8 h-8 w-48 text-xs bg-muted/20" />
            </div>
        </div>
      )}

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
          </div>
      )}

      <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] scrollbar-track-transparent">
        <DataTable
            data={data}
            columns={columns}
            onCellEdit={onEdit}
            keyField={keyField}
            rowClassName="h-10"
            enableSelection={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
        />
      </div>
    </div>
  );
};

export default DataGrid;