import React from 'react';
import { SchemaField, DbTable } from '../../../types';
import { FileKey, Type, Hash, DollarSign, ToggleLeft, Calendar, Braces, Link2, Settings2, Plus, Trash2, Edit3 } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import { Checkbox } from '../../../components/ui/checkbox';
import { Button } from '../../../components/ui/button';
import Dropdown from '../../../components/common/Dropdown';
import { ForeignKeyConfig } from './ForeignKeyDrawer';

export const TYPE_CONFIG: Record<string, { pk: boolean; fk: boolean; unique: boolean; notNull: boolean }> = {
    'serial':          { pk: true,  fk: false, unique: true,  notNull: true },
    'varchar':         { pk: true,  fk: true,  unique: true,  notNull: true },
    'int':             { pk: true,  fk: true,  unique: true,  notNull: true },
    'bigint':          { pk: true,  fk: true,  unique: true,  notNull: true },
    'float':           { pk: true,  fk: true,  unique: true,  notNull: true },
    'boolean':         { pk: false, fk: false, unique: false, notNull: true },
    'date with time':  { pk: false, fk: false, unique: false, notNull: true },
    'jsonb':           { pk: false, fk: false, unique: false, notNull: true },
};

export const DATA_TYPES = [
    { id: 'varchar', label: 'Varchar', icon: Type },
    { id: 'int', label: 'Integer', icon: Hash },
    { id: 'float', label: 'Float', icon: DollarSign },
    { id: 'boolean', label: 'Boolean', icon: ToggleLeft },
    { id: 'date with time', label: 'Date with Time', icon: Calendar },
    { id: 'jsonb', label: 'JSONB', icon: Braces },
    { id: 'serial', label: 'Serial', icon: FileKey },
];

export const getTypeIcon = (type: string) => {
    const found = DATA_TYPES.find(t => t.id === type);
    return found ? found.icon : Type;
};

interface SchemaModelGridProps {
  schema: SchemaField[];
  tables: DbTable[];
  onAddColumn: () => void;
  onEditColumn: (field: SchemaField) => void;
  onDeleteColumn: (id: string) => void;
  onUpdateField: (fieldId: string, updates: Partial<SchemaField>) => void;
  onOpenRelation: (field: SchemaField) => void;
}

export const SchemaModelGrid: React.FC<SchemaModelGridProps> = ({
  schema,
  tables,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onUpdateField,
  onOpenRelation
}) => {
  const handleTypeChange = (field: SchemaField, newType: string) => {
      const config = TYPE_CONFIG[newType] || TYPE_CONFIG['varchar'];
      const updates: Partial<SchemaField> = {
          type: newType as any,
          icon: getTypeIcon(newType)
      };

      if (!config.pk && field.isPrimary) updates.isPrimary = false;
      if (!config.unique && field.isUnique) updates.isUnique = false;
      if (!config.fk && field.isForeignKey) {
          updates.isForeignKey = false;
          (updates as any).foreignKeyConfig = undefined;
      }

      onUpdateField(field.id, updates);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background select-none text-sm font-sans overflow-auto">
      {/* Toolbar header */}
      <div className="h-10 border-b border-border bg-background px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
              <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Table Schema Definition ({schema.length} columns)
              </span>
          </div>
          <Button 
              size="sm" 
              onClick={onAddColumn}
              className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
              <Plus size={13} /> Add Column
          </Button>
      </div>

      {/* Table view */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-muted/40 backdrop-blur-sm z-10 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Column Name</th>
                    <th className="py-2.5 px-4 w-44">Data Type</th>
                    <th className="py-2.5 px-4 w-36">Default Value</th>
                    <th className="py-2.5 px-4 w-24 text-center">Primary</th>
                    <th className="py-2.5 px-4 w-24 text-center">Unique</th>
                    <th className="py-2.5 px-4 w-24 text-center">Nullable</th>
                    <th className="py-2.5 px-4 min-w-[180px]">Relation (FK)</th>
                    <th className="py-2.5 px-4 w-24 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {schema.map((field, idx) => {
                    const FieldIcon = field.icon || getTypeIcon(field.type);
                    const config = TYPE_CONFIG[field.type] || TYPE_CONFIG['varchar'];
                    const fkConfig = (field as any).foreignKeyConfig as ForeignKeyConfig | undefined;
                    const targetTable = fkConfig?.targetTableId ? tables.find(t => t.id === fkConfig.targetTableId) : null;

                    return (
                        <tr 
                            key={field.id}
                            className="hover:bg-muted/30 transition-colors group h-10 text-xs"
                        >
                            <td className="py-2 px-4 text-center text-muted-foreground/60 font-mono">
                                {idx + 1}
                            </td>
                            <td className="py-2 px-4 font-medium text-foreground">
                                <div 
                                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => onEditColumn(field)}
                                >
                                    <FieldIcon size={14} className="text-muted-foreground shrink-0" />
                                    <span className="truncate">{field.name}</span>
                                    {field.isPrimary && (
                                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono px-1.5 py-0.2 rounded border border-amber-500/20">
                                            PK
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="py-2 px-4">
                                <Dropdown
                                    triggerLabel={DATA_TYPES.find(t => t.id === field.type)?.label || field.type}
                                    triggerIcon={FieldIcon}
                                    items={DATA_TYPES.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
                                    selectedId={field.type}
                                    onSelect={(item) => handleTypeChange(field, item.id)}
                                    className="h-7 text-xs border border-transparent hover:border-border rounded px-2 w-full justify-between"
                                    width={180}
                                />
                            </td>
                            <td className="py-2 px-4 font-mono text-muted-foreground">
                                {field.defaultValue || <span className="text-muted-foreground/40 italic">none</span>}
                            </td>
                            <td className="py-2 px-4 text-center">
                                <div className="flex justify-center">
                                    <Checkbox 
                                        checked={field.isPrimary}
                                        disabled={!config.pk}
                                        onCheckedChange={(checked) => onUpdateField(field.id, { isPrimary: Boolean(checked) })}
                                        className="h-3.5 w-3.5"
                                    />
                                </div>
                            </td>
                            <td className="py-2 px-4 text-center">
                                <div className="flex justify-center">
                                    <Switch 
                                        checked={field.isUnique}
                                        disabled={!config.unique}
                                        onCheckedChange={(checked) => onUpdateField(field.id, { isUnique: Boolean(checked) })}
                                        className="scale-75"
                                    />
                                </div>
                            </td>
                            <td className="py-2 px-4 text-center">
                                <div className="flex justify-center">
                                    <Switch 
                                        checked={field.isNullable}
                                        disabled={!config.notNull}
                                        onCheckedChange={(checked) => onUpdateField(field.id, { isNullable: Boolean(checked) })}
                                        className="scale-75"
                                    />
                                </div>
                            </td>
                            <td className="py-2 px-4">
                                {field.isForeignKey && fkConfig ? (
                                    <div 
                                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                        onClick={() => onOpenRelation(field)}
                                    >
                                        <Link2 size={11} />
                                        <span>{targetTable?.name || fkConfig.targetTableId}</span>
                                    </div>
                                ) : (
                                    <div 
                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors"
                                        onClick={() => onOpenRelation(field)}
                                    >
                                        <Settings2 size={11} />
                                        <span className="italic">Configure</span>
                                    </div>
                                )}
                            </td>
                            <td className="py-2 px-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => onEditColumn(field)}
                                        title="Edit Column"
                                    >
                                        <Edit3 size={13} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => onDeleteColumn(field.id)}
                                        title="Delete Column"
                                    >
                                        <Trash2 size={13} />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>

        {/* Append Column Ghost Row */}
        <div 
            className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 text-xs text-muted-foreground hover:text-primary hover:bg-muted/20 cursor-pointer transition-colors"
            onClick={onAddColumn}
        >
            <Plus size={14} className="text-primary" />
            <span className="font-medium">Add new column to schema...</span>
        </div>
      </div>
    </div>
  );
};

export default SchemaModelGrid;
