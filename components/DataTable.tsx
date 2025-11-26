

import React, { useState, useRef, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Checkbox } from "./ui/checkbox";
import Dropdown from './common/Dropdown';

export interface ColumnDef<T> {
  id: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  width?: number | string;
  minWidth?: number;
  flex?: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'select';
  options?: any[]; // Supports strings or rich objects {id, label, icon}
  renderCell?: (row: T, value: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onCellEdit?: (rowId: string | number, colId: string, value: any) => void;
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  rowClassName?: string;
  enableSelection?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
}

const DataTable = <T extends { [key: string]: any }>({
  data,
  columns,
  onCellEdit,
  keyField,
  onRowClick,
  rowClassName = "",
  enableSelection = false,
  selectedIds = [],
  onSelectionChange
}: DataTableProps<T>) => {
  const [editingCell, setEditingCell] = useState<{ rowId: string | number; colId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const handleStartEdit = (row: T, col: ColumnDef<T>) => {
    if (col.editable && onCellEdit) {
      const val = col.accessorKey ? row[col.accessorKey] : '';
      setEditValue(val);
      setEditingCell({ rowId: row[keyField], colId: col.id });
    }
  };

  const handleSaveEdit = () => {
    if (editingCell && onCellEdit) {
      onCellEdit(editingCell.rowId, editingCell.colId, editValue);
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (!onSelectionChange) return;
    if (checked === true) {
      onSelectionChange(data.map(d => d[keyField]));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string | number, checked: boolean | 'indeterminate') => {
    if (!onSelectionChange) return;
    const isSelected = selectedIds.includes(id);
    
    if (checked === true && !isSelected) {
        onSelectionChange([...selectedIds, id]);
    } else if (checked === false && isSelected) {
        onSelectionChange(selectedIds.filter(sid => sid !== id));
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div className="w-full min-w-[800px] border-b border-border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10 backdrop-blur-sm">
          <TableRow className="hover:bg-transparent border-border">
            {enableSelection && (
              <TableHead className="w-10 px-3 text-center align-middle">
                 <Checkbox
                   checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
                   onCheckedChange={handleSelectAll}
                   aria-label="Select all"
                   className="translate-y-[2px]"
                 />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={`h-9 px-3 font-semibold text-xs text-muted-foreground ${col.className || ''}`}
                style={{
                  width: col.flex ? undefined : col.width,
                  minWidth: col.minWidth,
                }}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const rowId = row[keyField];
            const isSelected = selectedIds.includes(rowId);
            
            return (
              <TableRow
                key={String(rowId)}
                onClick={() => onRowClick && onRowClick(row)}
                className={`h-9 border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${rowClassName}`}
                data-state={isSelected ? "selected" : undefined}
              >
                {enableSelection && (
                    <TableCell className="w-10 px-3 py-1 text-center align-middle">
                       <Checkbox
                         checked={isSelected}
                         onCheckedChange={(checked) => handleSelectRow(rowId, checked)}
                         onClick={(e) => e.stopPropagation()}
                         aria-label="Select row"
                         className="translate-y-[2px]"
                       />
                    </TableCell>
                )}
                {columns.map((col) => {
                  const isEditing = editingCell?.rowId === rowId && editingCell?.colId === col.id;
                  const value = col.accessorKey ? row[col.accessorKey] : undefined;

                  return (
                    <TableCell
                      key={col.id}
                      onClick={(e) => {
                         e.stopPropagation(); 
                         handleStartEdit(row, col);
                      }}
                      className={`p-0 relative h-9 align-middle text-sm text-foreground ${col.editable ? 'cursor-pointer' : ''} ${col.className || ''}`}
                      style={{
                        width: col.flex ? undefined : col.width,
                        minWidth: col.minWidth,
                      }}
                    >
                      {isEditing ? (
                        col.type === 'select' ? (
                            <div className="absolute inset-0 w-full h-full z-20">
                                <Dropdown
                                    triggerLabel={
                                        col.options?.find((o: any) => o.id === editValue || o === editValue)?.label || editValue
                                    }
                                    triggerIcon={
                                        col.options?.find((o: any) => o.id === editValue)?.icon
                                    }
                                    items={col.options?.map((o: any) => typeof o === 'string' ? { id: o, label: o } : o) || []}
                                    onSelect={(item) => {
                                        if (onCellEdit && editingCell) {
                                            onCellEdit(editingCell.rowId, editingCell.colId, item.id);
                                            setEditingCell(null);
                                        }
                                    }}
                                    className="w-full h-full border-2 border-primary rounded-none px-2 bg-background flex items-center"
                                    width={200}
                                />
                            </div>
                        ) : (
                            <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type={col.type || 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                className="absolute inset-0 w-full h-full z-20 bg-background text-foreground border-2 border-primary outline-none text-xs px-2"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )
                      ) : (
                        <div className="w-full h-full px-3 flex items-center truncate">
                            {col.renderCell ? col.renderCell(row, value) : (
                                <span className="truncate text-foreground">{value}</span>
                            )}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;