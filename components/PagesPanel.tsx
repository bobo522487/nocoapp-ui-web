import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, File, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import ComponentsPanel from './ComponentsPanel';

const PagesPanel = () => {
  const [activeMenuPage, setActiveMenuPage] = useState<string | null>(null);
  const [showComponents, setShowComponents] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Menu Logic
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuPage(null);
      }
      
      // Components Panel Logic: Close if clicking outside the panel when it's open
      if (showComponents && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowComponents(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showComponents, activeMenuPage]);

  if (showComponents) {
    return (
        <div ref={panelRef} className="h-full">
            <ComponentsPanel onClose={() => setShowComponents(false)} />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 border-b border-ide-border flex justify-between items-center shrink-0">
          <span className="font-medium text-sm text-gray-500 dark:text-gray-300">Application</span>
          <div className="flex gap-2">
             <Plus size={14} className="text-gray-400 cursor-pointer hover:text-ide-text"/>
          </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
         
         {/* Add Component Button */}
         <div className="px-3 mb-4">
            <button 
                onClick={() => setShowComponents(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-transparent text-xs font-medium rounded transition-all shadow-sm"
            >
               <Plus size={14} /> Add Component
            </button>
         </div>

         <div className="mb-4">
            <div className="px-4 py-1 text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between items-center">
               <span>Pages</span>
               <span className="text-[10px] bg-ide-hover px-1.5 rounded-full text-gray-500">7</span>
            </div>

            {/* Search Box */}
            <div className="px-3 mb-2">
              <div className="relative group">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input 
                      type="text" 
                      placeholder="Search pages..." 
                      className="w-full pl-8 pr-2 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text placeholder-gray-500 focus:border-blue-500 outline-none transition-all"
                  />
              </div>
            </div>

            {['Dashboard', 'Orders', 'Customers', 'Analytics', 'Login', 'Settings', '404 Error'].map(page => (
                <div key={page} className="relative px-4 py-1.5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-ide-hover hover:text-ide-text cursor-pointer transition-colors group">
                    <File size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="flex-1 truncate">{page}</span>
                    
                    {/* Action Menu Button */}
                    <div 
                      className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all ${activeMenuPage === page ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuPage(activeMenuPage === page ? null : page);
                      }}
                    >
                      <MoreVertical size={14} />
                    </div>

                    {/* Context Menu */}
                    {activeMenuPage === page && (
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
            ))}
         </div>
      </div>
    </div>
  );
};

export default PagesPanel;