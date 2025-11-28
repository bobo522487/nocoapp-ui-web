import React from 'react';
import { SchemaField } from '../../../../types';
import { Checkbox } from "../../../../../components/ui/checkbox";
import { Badge } from "../../../../../components/ui/badge";
import { Calendar, Clock, Link2 } from 'lucide-react';

interface CellRendererProps {
  value: any;
  columnDef: SchemaField;
  isEditing: boolean;
  onValueChange: (val: any) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}

// --- Specific Cell Renderers ---

const TextCell = ({ value, isEditing, onValueChange, onBlur, onKeyDown, autoFocus }: CellRendererProps) => {
  if (isEditing) {
    return (
      <input
        autoFocus={autoFocus}
        className="w-full h-full px-2 bg-background text-foreground border-none outline-none text-xs"
        value={value ?? ''}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    );
  }
  return <span className="truncate px-2">{value}</span>;
};

const NumberCell = ({ value, isEditing, onValueChange, onBlur, onKeyDown, autoFocus }: CellRendererProps) => {
  if (isEditing) {
    return (
      <input
        type="number"
        autoFocus={autoFocus}
        className="w-full h-full px-2 bg-background text-foreground border-none outline-none text-xs text-right"
        value={value ?? ''}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    );
  }
  return <span className="truncate w-full text-right px-2 font-mono text-xs opacity-90">{value}</span>;
};

const BooleanCell = ({ value, isEditing, onValueChange }: CellRendererProps) => {
  // Boolean cells are typically toggle-able directly without entering "edit mode" in the traditional sense,
  // or we can use edit mode to show a checkbox vs true/false text.
  // Here we'll just render a checkbox that toggles immediately.
  const isChecked = Boolean(value);
  return (
    <div className="flex items-center justify-center w-full h-full pointer-events-auto">
      <Checkbox 
        checked={isChecked} 
        onCheckedChange={(checked) => onValueChange(!!checked)}
        className="h-4 w-4"
        onClick={(e) => e.stopPropagation()} // Prevent focus capture
      />
    </div>
  );
};

const SelectCell = ({ value, isEditing, onValueChange, onBlur, onKeyDown, autoFocus }: CellRendererProps) => {
    // For simplicity using native select, ideally a custom popover
    if (isEditing) {
        return (
            <select
                autoFocus={autoFocus}
                value={value ?? ''}
                onChange={(e) => { onValueChange(e.target.value); onBlur(); }}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                className="w-full h-full px-1 bg-background text-foreground border-none outline-none text-xs"
            >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
                <option value="Draft">Draft</option>
            </select>
        );
    }
    
    // Status Logic Mock
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    if (value === 'Active' || value === 'Published') variant = "default";
    else if (value === 'Inactive' || value === 'Archived') variant = "secondary";
    else if (value === 'Deleted' || value === 'Banned') variant = "destructive";

    return (
        <div className="px-2">
            <Badge variant={variant} className="text-[10px] h-5 px-1.5 font-normal">{value}</Badge>
        </div>
    );
};

const DateCell = ({ value, isEditing, onValueChange, onBlur, onKeyDown, autoFocus }: CellRendererProps) => {
    if (isEditing) {
        return (
            <input
                type="datetime-local"
                autoFocus={autoFocus}
                className="w-full h-full px-1 bg-background text-foreground border-none outline-none text-xs"
                value={value ?? ''}
                onChange={(e) => onValueChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
            />
        );
    }
    return (
        <div className="flex items-center gap-1.5 px-2 text-muted-foreground">
            {value && <Calendar size={12} />}
            <span className="truncate text-foreground">{value}</span>
        </div>
    );
};

// --- Factory ---

export const CellFactory: React.FC<CellRendererProps> = (props) => {
  const { columnDef } = props;

  // Custom logic based on column name for mock purposes (e.g. 'status', 'role')
  if (columnDef.name.toLowerCase() === 'status' || columnDef.name.toLowerCase() === 'role') {
      return <SelectCell {...props} />;
  }

  switch (columnDef.type) {
    case 'int':
    case 'float':
    case 'bigint':
    case 'serial':
      return <NumberCell {...props} />;
    case 'boolean':
      return <BooleanCell {...props} />;
    case 'date with time':
      return <DateCell {...props} />;
    case 'varchar':
    default:
      return <TextCell {...props} />;
  }
};