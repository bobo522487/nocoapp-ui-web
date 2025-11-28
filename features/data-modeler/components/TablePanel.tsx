
import React, { useState, useRef, useEffect, memo } from 'react';
import { Search, Plus, Table, MoreVertical, Pencil, Trash2, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useAppStore } from '../../../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { DbTable, DbView } from '../../../types';

interface TableItemProps {
    table: DbTable;
    views: DbView[];
    activeTableId: string;
    activeViewId: string | null;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onSelectView: (view: DbView) => void;
    onCreateView: (tableId: string) => void;
    onDeleteView: (viewId: string) => void;
    onDeleteTable: (tableId: string) => void;
    
    // Rename Props
    renamingId: string | null;
    renameValue: string;
    onStartRename: (id: string, name: string, type: 'table' | 'view') => void;
    onRenameChange: (val: string) => void;
    onRenameSave: () => void;
    onRenameCancel: () => void;
}

const TableItem = memo<TableItemProps>(({
    table,
    views,
    activeTableId,
    activeViewId,
    isExpanded,
    onToggleExpand,
    onSelectView,
    onCreateView,
    onDeleteView,
    onDeleteTable,
    renamingId,
    renameValue,
    onStartRename,
    onRenameChange,
    onRenameSave,
    onRenameCancel
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState<'table' | string | null>(null); // 'table' or viewId
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isRenamingTable = renamingId === table.id;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    // Ensure focus when renaming starts
    useEffect(() => {
        if (isRenamingTable && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isRenamingTable]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onRenameSave();
        if (e.key === 'Escape') onRenameCancel();
        e.stopPropagation();
    };

    return (
        <div className="mb-1">
            {/* Table Row */}
            <div 
                className={`relative px-3 py-1.5 flex items-center gap-2 text-sm cursor-pointer transition-colors group select-none ${
                    activeTableId === table.id && !activeViewId
                    ? 'bg-accent/50 text-accent-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => onToggleExpand(table.id)}
            >
                <span className="opacity-70 w-4 h-4 flex items-center justify-center">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                
                <div className="flex flex-col items-center justify-center pt-0.5">
                    <Table size={14} className={activeTableId === table.id ? 'text-primary' : ''} />
                </div>
                
                {isRenamingTable ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => onRenameChange(e.target.value)}
                        onBlur={onRenameSave}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 w-full h-6 -my-1 bg-background border border-primary rounded-sm px-2 text-xs outline-none text-foreground focus:ring-2 focus:ring-primary/20"
                    />
                ) : (
                    <span className="truncate leading-tight flex-1">{table.name}</span>
                )}
                
                {/* Actions */}
                {!isRenamingTable && (
                    <div className={`flex items-center opacity-0 ${isHovered || menuOpen === 'table' ? 'opacity-100' : ''} transition-opacity gap-1`}>
                        <button 
                            className="p-1 hover:bg-muted rounded"
                            title="Create View"
                            onClick={(e) => { e.stopPropagation(); onCreateView(table.id); }}
                        >
                            <Plus size={14} />
                        </button>
                        <button 
                            className="p-1 hover:bg-muted rounded"
                            onClick={(e) => { e.stopPropagation(); setMenuOpen('table'); }}
                        >
                            <MoreVertical size={14} />
                        </button>
                    </div>
                )}

                {/* Table Context Menu */}
                {menuOpen === 'table' && (
                    <div ref={menuRef} className="absolute right-2 top-8 w-40 bg-popover border border-border rounded-md shadow-lg z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onStartRename(table.id, table.name, 'table'); setMenuOpen(null); }} 
                            className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left transition-colors"
                        >
                            <Pencil size={12} /> Rename
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteTable(table.id); setMenuOpen(null); }} 
                            className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 text-destructive text-left transition-colors"
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Views List (Children) */}
            {isExpanded && (
                <div className="flex flex-col">
                    {views.map(view => {
                        const isRenamingView = renamingId === view.id;
                        return (
                            <div 
                                key={view.id}
                                onClick={() => onSelectView(view)}
                                className={`relative pl-10 pr-3 py-1.5 flex items-center gap-2 text-xs cursor-pointer transition-colors group/view select-none ${
                                    activeViewId === view.id
                                    ? 'bg-accent text-accent-foreground font-medium' 
                                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                                }`}
                            >
                                <Filter size={12} className={activeViewId === view.id ? 'text-primary' : 'opacity-70'} />
                                
                                {isRenamingView ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => onRenameChange(e.target.value)}
                                        onBlur={onRenameSave}
                                        onKeyDown={handleKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 min-w-0 w-full h-5 -my-0.5 bg-background border border-primary rounded-sm px-2 text-[10px] outline-none text-foreground focus:ring-2 focus:ring-primary/20"
                                    />
                                ) : (
                                    <span className="truncate flex-1">{view.name}</span>
                                )}
                                
                                {!isRenamingView && (
                                    <div className={`opacity-0 group-hover/view:opacity-100 transition-opacity ${menuOpen === view.id ? 'opacity-100' : ''}`}>
                                        <button 
                                            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                            onClick={(e) => { e.stopPropagation(); setMenuOpen(view.id); }}
                                        >
                                            <MoreVertical size={12} />
                                        </button>
                                    </div>
                                )}

                                {/* View Context Menu */}
                                {menuOpen === view.id && (
                                    <div ref={menuRef} className="absolute right-2 top-6 w-36 bg-popover border border-border rounded-md shadow-lg z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onStartRename(view.id, view.name, 'view'); setMenuOpen(null); }} 
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left transition-colors text-foreground"
                                        >
                                            <Pencil size={12} /> Rename
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteView(view.id); setMenuOpen(null); }} 
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 text-destructive text-left transition-colors"
                                        >
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

const TablePanel: React.FC = () => {
  const navigate = useNavigate();
  const { 
      tables, 
      activeTableId, 
      activeViewId, 
      addTable, 
      updateTable, 
      deleteTable, 
      views, 
      addView, 
      updateView,
      deleteView, 
      setActiveViewId,
      setActiveTableId
  } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  // Rename State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameType, setRenameType] = useState<'table' | 'view' | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Initialize expanded state
  useEffect(() => {
      if (activeTableId && !expandedTables[activeTableId]) {
          setExpandedTables(prev => ({ ...prev, [activeTableId]: true }));
      }
  }, [activeTableId]);

  const handleToggleExpand = (tableId: string) => {
      setExpandedTables(prev => ({ ...prev, [tableId]: !prev[tableId] }));
  };

  const handleSelectView = (view: DbView) => {
      setActiveTableId(view.tableId);
      setActiveViewId(view.id);
      navigate(`/data/${view.tableId}`);
  };

  const handleCreateView = (tableId: string) => {
      const newView: DbView = {
          id: `view_${Date.now()}`,
          tableId,
          name: `New View`,
          config: { filters: [], sort: null, hiddenFields: [] }
      };
      addView(newView);
      // Auto select new view
      setExpandedTables(prev => ({ ...prev, [tableId]: true }));
      handleSelectView(newView);
  };

  const handleAddTable = () => {
      const timestamp = Date.now();
      const newId = `table_${timestamp}`;
      addTable({ 
          id: newId, 
          name: 'New Table', 
          code: `new_table_${timestamp}`,
          kind: 'table'
      });
      navigate(`/data/${newId}`);
      setExpandedTables(prev => ({ ...prev, [newId]: true }));
  };

  // --- Rename Handlers ---
  const handleStartRename = (id: string, currentName: string, type: 'table' | 'view') => {
      setRenamingId(id);
      setRenameType(type);
      setRenameValue(currentName);
  };

  const handleSaveRename = () => {
      if (renamingId && renameValue.trim()) {
          if (renameType === 'table') {
              updateTable(renamingId, { name: renameValue.trim() });
          } else if (renameType === 'view') {
              updateView(renamingId, { name: renameValue.trim() });
          }
      }
      setRenamingId(null);
      setRenameType(null);
      setRenameValue('');
  };

  const handleCancelRename = () => {
      setRenamingId(null);
      setRenameType(null);
      setRenameValue('');
  };

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 border-b border-border flex justify-between items-center shrink-0 bg-muted/10">
          <span className="font-medium text-sm text-muted-foreground">Database</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddTable}>
             <Plus size={14} className="text-muted-foreground hover:text-foreground"/>
          </Button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
         
         <div className="mb-4">
            <div className="px-4 py-1 text-xs font-bold text-muted-foreground uppercase mb-2 flex justify-between items-center">
               <span>Explorer</span>
            </div>

            {/* Search Box */}
            <div className="px-3 mb-2 relative">
                <Search size={12} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                    placeholder="Search..." 
                    className="h-8 pl-8 text-xs bg-muted/30 focus-visible:ring-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="mt-2">
                {filteredTables.map(table => (
                    <TableItem 
                        key={table.id}
                        table={table}
                        views={views.filter(v => v.tableId === table.id)}
                        activeTableId={activeTableId}
                        activeViewId={activeViewId}
                        isExpanded={!!expandedTables[table.id]}
                        onToggleExpand={handleToggleExpand}
                        onSelectView={handleSelectView}
                        onCreateView={handleCreateView}
                        onDeleteView={deleteView}
                        onDeleteTable={deleteTable}
                        
                        // Rename Props
                        renamingId={renamingId}
                        renameValue={renameValue}
                        onStartRename={handleStartRename}
                        onRenameChange={setRenameValue}
                        onRenameSave={handleSaveRename}
                        onRenameCancel={handleCancelRename}
                    />
                ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default TablePanel;
