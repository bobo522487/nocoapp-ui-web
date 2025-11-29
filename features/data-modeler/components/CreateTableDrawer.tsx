
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, FileKey, Type, Hash, DollarSign, ToggleLeft, Calendar, Braces, Trash2, Link2, Settings2, HelpCircle, Info } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { SchemaField, DbTable } from '../../../types';
import Dropdown from '../../../components/common/Dropdown';
import { cn } from '../../../lib/utils';
import ForeignKeyDrawer, { ForeignKeyConfig } from './ForeignKeyDrawer';

interface CreateTableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (tableName: string, columns: SchemaField[]) => void;
  tables: DbTable[];
  getTargetColumns: (tableId: string) => { id: string; name: string }[];
}

const DATA_TYPES = [
    { id: 'varchar', label: 'Varchar', icon: Type },
    { id: 'int', label: 'Integer', icon: Hash },
    { id: 'float', label: 'Float', icon: DollarSign },
    { id: 'boolean', label: 'Boolean', icon: ToggleLeft },
    { id: 'date with time', label: 'Date with Time', icon: Calendar },
    { id: 'jsonb', label: 'JSONB', icon: Braces },
    { id: 'serial', label: 'Serial', icon: FileKey },
];

export const CreateTableDrawer: React.FC<CreateTableDrawerProps> = ({ 
    isOpen, 
    onClose, 
    onCreate, 
    tables, 
    getTargetColumns 
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [tableName, setTableName] = useState('table1');
  const [columns, setColumns] = useState<SchemaField[]>([]);
  const [showFKDrawer, setShowFKDrawer] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
        // Reset state on open
        setTableName(`table_${Date.now().toString().slice(-4)}`);
        setColumns([
            { 
                id: 'id', 
                name: 'id', 
                type: 'serial', 
                isPrimary: true, 
                isUnique: true, 
                isNullable: false, 
                defaultValue: 'auto-inc',
                width: 100,
                icon: FileKey,
                flex: false
            },
            { 
                id: 'name', 
                name: 'name', 
                type: 'varchar', 
                isPrimary: false, 
                isUnique: false, 
                isNullable: false, 
                defaultValue: '',
                width: 200,
                icon: Type,
                flex: true
            }
        ]);
        setShowFKDrawer(false);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const handleAddColumn = () => {
      const newId = `col_${Date.now()}`;
      setColumns([...columns, {
          id: newId,
          name: '',
          type: 'varchar',
          isPrimary: false,
          isUnique: false,
          isNullable: true,
          defaultValue: '',
          width: 150,
          icon: Type,
          flex: true
      }]);
  };

  const handleColumnChange = (id: string, field: keyof SchemaField, value: any) => {
      setColumns(prev => prev.map(col => {
          if (col.id === id) {
              const updates: any = { [field]: value };
              if (field === 'type') {
                  const typeObj = DATA_TYPES.find(t => t.id === value);
                  if (typeObj) updates.icon = typeObj.icon;
              }
              return { ...col, ...updates };
          }
          return col;
      }));
  };

  const handleRemoveColumn = (id: string) => {
      setColumns(prev => prev.filter(col => col.id !== id));
  };

  const handleCreate = () => {
      if (!tableName.trim()) return;
      // Filter out empty column names or provide defaults
      const finalColumns = columns.map(c => ({
          ...c,
          name: c.name.trim() || `col_${c.id.split('_')[1] || Math.floor(Math.random() * 1000)}`
      }));
      onCreate(tableName, finalColumns);
      onClose();
  };

  const handleFKSave = (config: ForeignKeyConfig) => {
      const targetTable = tables.find(t => t.id === config.targetTableId);
      const targetTableName = targetTable ? targetTable.name.toLowerCase() : 'table';
      // Sanitize name
      const cleanTargetName = targetTableName.replace(/[^a-z0-9_]/g, '_');
      const newColName = `${cleanTargetName}_id`;
      
      // Check if column exists, if so append random
      let finalName = newColName;
      if (columns.some(c => c.name === finalName)) {
          finalName = `${newColName}_${Math.floor(Math.random()*100)}`;
      }

      const newColumn: SchemaField = {
          id: `col_${Date.now()}`,
          name: finalName,
          type: 'int', // Standard for FK
          isPrimary: false,
          isUnique: false,
          isNullable: true,
          defaultValue: '',
          width: 150,
          icon: Hash,
          flex: true,
          isForeignKey: true,
      };
      (newColumn as any).foreignKeyConfig = config;

      setColumns([...columns, newColumn]);
      setShowFKDrawer(false);
  };

  const fkColumns = columns.filter(c => c.isForeignKey);

  const content = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-[600px] bg-background shadow-2xl transform transition-transform duration-300 z-[70] flex flex-col border-l border-border ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">Create a new table</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X size={18} />
            </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
            
            {/* Table Name */}
            <div className="mb-6">
                <div className="text-sm font-medium text-foreground mb-2">Table name</div>
                <Input 
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="Enter table name"
                    className="bg-background border-input h-10"
                    autoFocus
                />
            </div>

            {/* Schema Section */}
            <div className="mb-6">
                <div className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Table schema</div>
                
                {/* Column Headers */}
                <div className="flex items-center mb-2 px-1">
                    <div className="flex items-center w-[30%] text-xs font-medium text-muted-foreground">
                        <Info size={12} className="mr-1.5 opacity-0" /> {/* Spacer */}
                        Column name
                    </div>
                    <div className="flex items-center w-[25%] text-xs font-medium text-muted-foreground pl-2">
                        Type
                    </div>
                    <div className="flex items-center w-[25%] text-xs font-medium text-muted-foreground pl-2">
                        Default value
                    </div>
                    <div className="flex items-center justify-center w-[10%] text-xs font-medium text-muted-foreground">
                        Primary
                    </div>
                    <div className="flex items-center justify-center w-[10%] text-xs font-medium text-muted-foreground">
                        
                    </div>
                </div>

                <div className="space-y-2">
                    {columns.map((col, index) => {
                        const isIdRow = col.id === 'id';
                        const typeObj = DATA_TYPES.find(t => t.id === col.type);

                        return (
                            <div key={col.id} className="flex items-center bg-card border border-border rounded-md p-1.5 group hover:border-primary/50 transition-colors">
                                {/* Name */}
                                <div className="w-[30%] pr-2 flex items-center">
                                    <span className="mr-1 opacity-0">
                                        <Info size={12} />
                                    </span>
                                    <Input 
                                        value={col.name}
                                        onChange={(e) => handleColumnChange(col.id, 'name', e.target.value)}
                                        placeholder="Enter name"
                                        disabled={isIdRow}
                                        className={cn("h-8 text-xs border-transparent bg-transparent focus-visible:bg-muted/50 focus-visible:ring-0 focus-visible:border-input px-2", isIdRow && "opacity-70")}
                                    />
                                </div>

                                {/* Type */}
                                <div className="w-[25%] px-1 relative">
                                    {isIdRow ? (
                                        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground opacity-70">
                                            <FileKey size={14} />
                                            <span>serial</span>
                                        </div>
                                    ) : (
                                        <Dropdown 
                                            triggerLabel={typeObj?.label || col.type}
                                            triggerIcon={typeObj?.icon}
                                            items={DATA_TYPES.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
                                            selectedId={col.type}
                                            onSelect={(item) => handleColumnChange(col.id, 'type', item.id)}
                                            width={140}
                                            className="h-8 w-full justify-start px-2 border-transparent hover:bg-muted/50 text-xs"
                                        />
                                    )}
                                </div>

                                {/* Default Value */}
                                <div className="w-[25%] px-1">
                                    <Input 
                                        value={col.defaultValue}
                                        onChange={(e) => handleColumnChange(col.id, 'defaultValue', e.target.value)}
                                        placeholder={isIdRow ? "Auto-generated" : "Enter value"}
                                        disabled={isIdRow}
                                        className={cn("h-8 text-xs border-transparent bg-transparent focus-visible:bg-muted/50 focus-visible:ring-0 focus-visible:border-input px-2", isIdRow && "opacity-70")}
                                    />
                                </div>

                                {/* Primary Checkbox */}
                                <div className="w-[10%] flex justify-center">
                                    <Checkbox 
                                        checked={col.isPrimary}
                                        disabled
                                        className="h-4 w-4 rounded-sm border-input opacity-50 cursor-not-allowed"
                                    />
                                </div>

                                {/* Actions / Nullable */}
                                <div className="w-[10%] flex items-center justify-center gap-2">
                                    {isIdRow ? (
                                        <div className="flex items-center gap-1">
                                            <Switch checked disabled className="scale-75 opacity-70" />
                                            <span className="text-[10px] text-muted-foreground">NOT NULL</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-1" title="Toggle Nullable">
                                                <Switch 
                                                    checked={!col.isNullable} 
                                                    onCheckedChange={(c) => handleColumnChange(col.id, 'isNullable', !c)}
                                                    className="scale-75"
                                                />
                                                <span className="text-[10px] text-muted-foreground">NOT NULL</span>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveColumn(col.id)}
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all ml-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Button 
                    variant="ghost" 
                    className="mt-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 w-auto h-8 text-xs font-medium px-3 ml-1"
                    onClick={handleAddColumn}
                >
                    <Plus size={14} className="mr-2" /> Add more columns
                </Button>
            </div>

            {/* Foreign Key Relation */}
            <div className="mb-6">
                <div className="mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Foreign key relation</span>
                    <p className="text-xs text-muted-foreground mt-1">A foreign key relation helps to link rows from existing tables with rows in this table based on a common column.</p>
                </div>
                
                {fkColumns.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {fkColumns.map(col => {
                            const config = (col as any).foreignKeyConfig as ForeignKeyConfig;
                            const targetTable = tables.find(t => t.id === config?.targetTableId);
                            return (
                                <div key={col.id} className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded text-sm group">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Link2 size={14} className="text-blue-500 shrink-0" />
                                        <div className="flex flex-col truncate">
                                            <span className="font-medium text-foreground">{col.name}</span>
                                            <span className="text-[10px] text-muted-foreground truncate">
                                                Ref: {targetTable?.name || config.targetTableId}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveColumn(col.id)}>
                                        <Trash2 size={12} />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-4 mt-2 mb-4">
                        <div className="flex items-center text-muted-foreground">
                            <Link2 size={16} className="mr-2 opacity-50" />
                            <span className="text-xs">No relation added yet</span>
                        </div>
                    </div>
                )}

                <Button 
                    variant="ghost" 
                    className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 w-auto h-8 text-xs font-medium px-3"
                    onClick={() => setShowFKDrawer(true)}
                >
                    <Plus size={14} className="mr-2" /> Add relation
                </Button>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex justify-between items-center shrink-0">
             <a href="#" className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                 <HelpCircle size={14} />
                 Read documentation
             </a>
             
             <div className="flex gap-3">
                 <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="h-9 px-4"
                 >
                     Cancel
                 </Button>
                 <Button 
                    onClick={handleCreate}
                    className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!tableName.trim()}
                 >
                     Create
                 </Button>
             </div>
        </div>
      </div>

      <ForeignKeyDrawer
          isOpen={showFKDrawer}
          onClose={() => setShowFKDrawer(false)}
          sourceTableName={tableName}
          sourceColumnName="<New Column>"
          tables={tables}
          getTargetColumns={getTargetColumns}
          onSave={handleFKSave}
          onDelete={() => setShowFKDrawer(false)}
          baseZIndex={80}
      />
    </>
  );

  return createPortal(content, document.body);
};

export default CreateTableDrawer;
