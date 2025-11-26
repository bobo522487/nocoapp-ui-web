import React, { useState, useRef, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Input } from "../../../components/ui/input";

export interface ColumnDef<T> {
  id: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  width?: number | string;
  minWidth?: number;
  flex?: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'select';
  options?: string[];
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
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data.map(d => d[keyField]));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (!onSelectionChange) return;
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter(sid => sid !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelected);
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div className="w-full min-w-[800px] border-b border-border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10 backdrop-blur-sm">
          <TableRow className="hover:bg-transparent border-border">
            {enableSelection && (
              <TableHead className="w-10 px-3 text-center">
                 <input
                   type="checkbox"
                   className="appearance-none h-4 w-4 rounded border border-input bg-background checked:bg-primary checked:border-primary checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2.5-2.5a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] bg-center bg-no-repeat focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                   checked={isAllSelected}
                   ref={input => {
                       if (input) input.indeterminate = isIndeterminate;
                   }}
                   onChange={handleSelectAll}
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
                    <TableCell className="w-10 px-3 py-1 text-center">
                       <input
                         type="checkbox"
                         className="appearance-none h-4 w-4 rounded border border-input bg-background checked:bg-primary checked:border-primary checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2.5-2.5a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] bg-center bg-no-repeat focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                         checked={isSelected}
                         onChange={(e) => {
                             e.stopPropagation();
                             handleSelectRow(rowId);
                         }}
                         onClick={(e) => e.stopPropagation()}
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
                      className={`p-0 relative h-9 align-middle ${col.editable ? 'cursor-pointer' : ''} ${col.className || ''}`}
                      style={{
                        width: col.flex ? undefined : col.width,
                        minWidth: col.minWidth,
                      }}
                    >
                      {isEditing ? (
                        col.type === 'select' ? (
                            <select
                                ref={inputRef as React.RefObject<HTMLSelectElement>}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                className="absolute inset-0 w-full h-full z-20 bg-background text-foreground border-2 border-primary outline-none text-xs px-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
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