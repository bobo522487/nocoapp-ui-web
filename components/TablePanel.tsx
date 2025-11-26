import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Table, MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface TablePanelProps {
  activeTable?: string;
  onTableSelect?: (tableId: string) => void;
}

const TablePanel: React.FC<TablePanelProps> = ({ activeTable, onTableSelect }) => {
  const [activeMenuTable, setActiveMenuTable] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuTable(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTableClick = (table: string) => {
    if (onTableSelect) {
      onTableSelect(table);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 border-b border-ide-border flex justify-between items-center shrink-0">
          <span className="font-medium text-sm text-gray-500 dark:text-gray-300">Database</span>
          <div className="flex gap-2">
             <Plus size={14} className="text-gray-400 cursor-pointer hover:text-ide-text"/>
          </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
         
         {/* New Table Button */}
         <div className="px-3 mb-4">
            <button className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-ide-hover border border-ide-border hover:border-gray-400 dark:hover:border-gray-500 text-ide-text text-xs font-medium rounded transition-all">
               <Plus size={14} /> New Table
            </button>
         </div>

         <div className="mb-4">
            <div className="px-4 py-1 text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between items-center">
               <span>Tables</span>
               <span className="text-[10px] bg-ide-hover px-1.5 rounded-full text-gray-500">4</span>
            </div>

            {/* Search Box */}
            <div className="px-3 mb-2">
              <div className="relative group">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input 
                      type="text" 
                      placeholder="Search tables..." 
                      className="w-full pl-8 pr-2 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text placeholder-gray-500 focus:border-blue-500 outline-none transition-all"
                  />
              </div>
            </div>

            {['users', 'orders', 'products', 'inventory_logs'].map(table => {
                const isActive = activeTable === table;
                return (
                    <div 
                        key={table} 
                        onClick={() => handleTableClick(table)}
                        className={`relative px-4 py-1.5 flex items-center gap-2 text-sm cursor-pointer transition-colors group ${
                            isActive 
                            ? 'bg-accent text-accent-foreground font-medium' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-ide-hover hover:text-ide-text'
                        }`}
                    >
                        <Table size={14} className={`${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-blue-500'} transition-colors`} />
                        <span className="flex-1 truncate">{table}</span>
                        
                        {/* Action Menu Button */}
                        <div 
                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all ${activeMenuTable === table ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTable(activeMenuTable === table ? null : table);
                        }}
                        >
                        <MoreVertical size={14} />
                        </div>

                        {/* Context Menu */}
                        {activeMenuTable === table && (
                        <div 
                            ref={menuRef}
                            className="absolute right-2 top-8 w-32 bg-ide-panel border border-ide-border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col py-1"
                        >
                            <button className="flex items-center gap-2 px-3 py-2 text-xs text-ide-text hover:bg-ide-hover w-full text-left transition-colors">
                                <Pencil size={12} /> Rename
                            </button>
                            <button className="flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-ide-hover w-full text-left transition-colors">
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                        )}
                    </div>
                );
            })}
         </div>
      </div>
    </div>
  );
};

export default TablePanel;