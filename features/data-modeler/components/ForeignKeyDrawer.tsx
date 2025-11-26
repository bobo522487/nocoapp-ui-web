
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Trash2, Save, Check, ChevronDown, Link2, ArrowRight, Settings2, Info, ArrowRightLeft } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { DbTable } from "../../../types";
import Dropdown from "../../../components/common/Dropdown";

interface ForeignKeyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTableName: string;
  sourceColumnName: string;
  tables: DbTable[];
  getTargetColumns: (tableId: string) => { id: string; name: string }[];
  onSave: (config: ForeignKeyConfig) => void;
  onDelete: () => void;
  baseZIndex?: number;
}

export interface ForeignKeyConfig {
  targetTableId: string;
  targetColumnId: string;
  onUpdate: string;
  onDelete: string;
}

const ForeignKeyDrawer: React.FC<ForeignKeyDrawerProps> = ({
  isOpen,
  onClose,
  sourceTableName,
  sourceColumnName,
  tables,
  getTargetColumns,
  onSave,
  onDelete,
  baseZIndex = 60
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [config, setConfig] = useState<ForeignKeyConfig>({
    targetTableId: '',
    targetColumnId: '',
    onUpdate: 'RESTRICT',
    onDelete: 'RESTRICT'
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset config when drawer opens or source changes
  useEffect(() => {
    if (isOpen) {
      // Initialize with defaults or existing values if we had them
      // For now, default to empty/RESTRICT
      setConfig(prev => ({
        ...prev,
        targetTableId: prev.targetTableId || (tables.length > 0 ? tables[0].id : ''),
        targetColumnId: '', // Reset column when opening fresh usually
        onUpdate: 'RESTRICT',
        onDelete: 'RESTRICT'
      }));
    }
  }, [isOpen, tables]);

  // Update target columns when target table changes
  const targetColumns = config.targetTableId ? getTargetColumns(config.targetTableId) : [];
  
  // Auto-select first column if none selected
  useEffect(() => {
      if (config.targetTableId && !config.targetColumnId && targetColumns.length > 0) {
          setConfig(prev => ({ ...prev, targetColumnId: targetColumns[0].id }));
      }
  }, [config.targetTableId, targetColumns, config.targetColumnId]);

  if (!isMounted) return null;

  const ACTION_OPTIONS = [
      { id: 'RESTRICT', label: 'RESTRICT' },
      { id: 'CASCADE', label: 'CASCADE' },
      { id: 'SET NULL', label: 'SET NULL' },
      { id: 'NO ACTION', label: 'NO ACTION' },
  ];

  const content = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ zIndex: baseZIndex }}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-[560px] bg-background shadow-2xl transform transition-transform duration-300 flex flex-col border-l border-border ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ zIndex: baseZIndex + 10 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">Edit foreign key relation</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X size={18} />
            </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* TYPE Section */}
            <div className="mb-8">
                 <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Link2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">TYPE</span>
                 </div>
                 <div className="border border-input rounded-md px-3 py-2 bg-muted/20 text-sm font-medium text-foreground inline-block min-w-[100px] text-center">
                    Single
                 </div>
            </div>

            {/* SOURCE Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                    <ArrowRightLeft size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">SOURCE</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">The current table on which foreign key constraint is being added</p>
                
                <div className="space-y-4 pl-1">
                    {/* Source Table */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-24">Table</span>
                        <div className="flex-1">
                            <div className="w-full border border-input bg-muted/50 text-muted-foreground rounded-md px-3 py-2 text-sm flex justify-between items-center cursor-not-allowed">
                                <span>{sourceTableName}</span>
                                <ChevronDown size={14} className="opacity-50" />
                            </div>
                        </div>
                    </div>

                    {/* Source Column */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-24">Column</span>
                        <div className="flex-1">
                            <div className="w-full border border-input bg-muted/50 text-muted-foreground rounded-md px-3 py-2 text-sm flex justify-between items-center cursor-not-allowed">
                                <span>{sourceColumnName || 'New Column'}</span>
                                <ChevronDown size={14} className="opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TARGET Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                    <ArrowRight size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">TARGET</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">The table that contains foreign key column’s reference</p>

                <div className="space-y-4 pl-1">
                    {/* Target Table */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-24">Table</span>
                        <div className="flex-1 relative">
                             <Dropdown
                                triggerLabel={tables.find(t => t.id === config.targetTableId)?.name || 'Select table'}
                                items={tables.map(t => ({ id: t.id, label: t.name }))}
                                onSelect={(item) => setConfig(prev => ({ ...prev, targetTableId: item.id, targetColumnId: '' }))}
                                selectedId={config.targetTableId}
                                className="w-full justify-between border border-input bg-background rounded-md px-3 py-2 text-sm font-normal hover:bg-accent/50"
                                width={380}
                             />
                        </div>
                    </div>

                    {/* Target Column */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-24">Column</span>
                        <div className="flex-1 relative">
                            <Dropdown
                                triggerLabel={targetColumns.find(c => c.id === config.targetColumnId)?.name || 'Select column'}
                                items={targetColumns.map(c => ({ id: c.id, label: c.name }))}
                                onSelect={(item) => setConfig(prev => ({ ...prev, targetColumnId: item.id }))}
                                selectedId={config.targetColumnId}
                                className="w-full justify-between border border-input bg-background rounded-md px-3 py-2 text-sm font-normal hover:bg-accent/50"
                                width={380}
                                searchPlaceholder="Search columns..."
                             />
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTIONS Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                    <Settings2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">ACTIONS</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">What happens to Source table when Target table is modified</p>

                <div className="space-y-4 pl-1">
                    {/* On Update */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-24">On update</span>
                        <div className="flex-1 relative">
                             <Dropdown
                                triggerLabel={config.onUpdate}
                                items={ACTION_OPTIONS}
                                onSelect={(item) => setConfig(prev => ({ ...prev, onUpdate: item.id }))}
                                selectedId={config.onUpdate}
                                className="w-full justify-between border border-input bg-background rounded-md px-3 py-2 text-sm font-normal hover:bg-accent/50"
                                width={380}
                             />
                        </div>
                    </div>

                    {/* On Remove */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-24">On remove</span>
                        <div className="flex-1 relative">
                            <Dropdown
                                triggerLabel={config.onDelete}
                                items={ACTION_OPTIONS}
                                onSelect={(item) => setConfig(prev => ({ ...prev, onDelete: item.id }))}
                                selectedId={config.onDelete}
                                className="w-full justify-between border border-input bg-background rounded-md px-3 py-2 text-sm font-normal hover:bg-accent/50"
                                width={380}
                             />
                        </div>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex justify-between items-center shrink-0">
             <a href="#" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                 <Info size={14} />
                 Read documentation
             </a>
             
             <div className="flex items-center gap-3">
                 <Button 
                    variant="ghost" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 px-3 text-sm font-medium gap-2"
                    onClick={onDelete}
                 >
                     <Trash2 size={14} /> Delete
                 </Button>
                 <Button 
                    onClick={() => onSave(config)}
                    className="h-9 px-4 text-sm font-medium gap-2"
                 >
                     <Save size={14} /> Save changes
                 </Button>
             </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default ForeignKeyDrawer;
