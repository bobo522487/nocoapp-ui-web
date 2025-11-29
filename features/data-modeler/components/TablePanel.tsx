
import React, { useState, useMemo } from 'react';
import { Search, Plus, Table, Filter, MoreVertical } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useAppStore } from '../../../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { DbView, DbTable, SchemaField } from '../../../types';
import { Tree } from '../../../components/common/Tree/Tree';
import { TreeItem } from '../../../components/common/Tree/types';
import { CreateTableDrawer } from './CreateTableDrawer';
import { MOCK_DB } from '../../../store/mockData';

const TablePanel: React.FC = () => {
  const navigate = useNavigate();
  const { 
      tables, 
      activeTableId, 
      activeViewId, 
      addTable, 
      updateTable, 
      deleteTable, 
      duplicateTable,
      duplicateView,
      views, 
      setViews,
      addView, 
      updateView,
      deleteView, 
      setActiveViewId,
      setActiveTableId,
      reorderTables
  } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);

  // --- Tree Data Conversion ---
  const treeItems: TreeItem[] = useMemo(() => {
      // 1. Filter tables
      const filteredTables = tables.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.code.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // 2. Build Tree
      return filteredTables.map(table => {
          const tableViews = views.filter(v => v.tableId === table.id);
          return {
              id: table.id,
              type: 'table',
              children: tableViews.map(view => ({
                  id: view.id,
                  type: 'view',
                  children: [],
                  data: { name: view.name, icon: 'view', tableId: table.id }
              })),
              collapsed: false,
              data: { name: table.name, icon: 'table', code: table.code }
          };
      });
  }, [tables, views, searchTerm]);

  const handleTreeChange = (newItems: TreeItem[]) => {
      // Prevent reordering while searching to avoid data loss or inconsistent state
      if (searchTerm) return;

      // 1. Reorder Tables
      const newTables = newItems.map(item => tables.find(t => t.id === item.id)).filter(Boolean) as DbTable[];
      if (newTables.length === tables.length) {
          reorderTables(newTables);
      }

      // 2. Reorder Views
      // We start with the current full list of views to preserve those not in the tree (e.g. if we had some collapsed/hidden logic, though here we generally have them all or none)
      const processedViewIds = new Set<string>();
      const newViewsOrdered: DbView[] = [];

      newItems.forEach(tableItem => {
          if (tableItem.children) {
              tableItem.children.forEach(viewItem => {
                  const originalView = views.find(v => v.id === viewItem.id);
                  if (originalView) {
                      const updatedView = { ...originalView, tableId: tableItem.id as string };
                      newViewsOrdered.push(updatedView);
                      processedViewIds.add(viewItem.id as string);
                  }
              });
          }
      });

      // Keep views that were not involved in the reorder (e.g. if we had hidden logic)
      const remainingViews = views.filter(v => !processedViewIds.has(v.id));
      
      setViews([...newViewsOrdered, ...remainingViews]);
  };

  // --- Actions ---
  const handleSelect = (item: any) => {
      if (item.type === 'table') {
          navigate(`/data/${item.id}`);
          setActiveTableId(item.id);
          setActiveViewId(null);
      } else if (item.type === 'view') {
          const view = views.find(v => v.id === item.id);
          if (view) {
              setActiveTableId(view.tableId);
              setActiveViewId(view.id);
              navigate(`/data/${view.tableId}`);
          }
      }
  };

  const handleCreateView = (tableId: string) => {
      const newView: DbView = {
          id: `view_${Date.now()}`,
          tableId,
          name: `New View`,
          config: { filters: [], sort: null, hiddenFields: [] }
      };
      addView(newView);
      handleSelect({ type: 'view', id: newView.id });
  };

  const handleAddTable = () => {
      setIsCreateTableOpen(true);
  };

  const handleConfirmCreateTable = (tableName: string, columns: SchemaField[]) => {
      const timestamp = Date.now();
      const newId = `table_${timestamp}`;
      
      // In a real app, we would pass 'columns' to the store or backend API to initialize the schema
      // Since our mock store manages data in MOCK_DB separately (in DataPage mainly), 
      // we are just creating the metadata here. 
      // Ideally, addTable should accept schema too. 
      
      // For now, we simulate schema creation by ensuring DataPage will pick up default/empty if not found,
      // but to make it persistent in this mock we would need to write to MOCK_DB.
      // Let's assume DataPage handles initialization if MOCK_DB[newId] is missing, 
      // OR we can export a way to update MOCK_DB from here. 
      
      // We will just create the table definition in store
      addTable({ 
          id: newId, 
          name: tableName, 
          code: tableName.toLowerCase().replace(/\s+/g, '_'),
          kind: 'table'
      });
      
      // Important: In a real app, you'd send `columns` to the backend here.
      // Since we are mocking, we'll initialize MOCK_DB directly so the DataPage picks up the columns
      MOCK_DB[newId] = {
          schema: columns,
          records: []
      };
      
      navigate(`/data/${newId}`);
  };

  const renderIcon = (item: any) => {
      if (item.type === 'table') return <Table size={14} className={activeTableId === item.id ? "text-primary" : ""} />;
      if (item.type === 'view') return <Filter size={12} className={activeViewId === item.id ? "text-primary" : "opacity-70"} />;
      return null;
  };

  const handleRename = (id: string, name: string) => {
      const isTable = tables.some(t => t.id === id);
      if (isTable) updateTable(id, { name });
      else updateView(id, { name });
  };

  const handleRemove = (id: string) => {
      const isTable = tables.some(t => t.id === id);
      if (isTable) deleteTable(id);
      else deleteView(id);
  };

  const handleDuplicate = (id: string) => {
      const isTable = tables.some(t => t.id === id);
      if (isTable) duplicateTable(id);
      else duplicateView(id);
  };

  const getTargetColumns = (tableId: string) => {
      const tableData = MOCK_DB[tableId];
      if (!tableData) return [];
      return tableData.schema.map(f => ({ id: f.id, name: f.name }));
  };

  return (
    <>
        <div className="flex flex-col h-full">
        <div className="h-12 px-4 border-b border-border flex justify-between items-center shrink-0 bg-muted/10">
            <span className="font-medium text-sm text-muted-foreground">Database</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
            
            <div className="mb-4">
                <div className="px-4 py-1 text-xs font-bold text-muted-foreground uppercase mb-2 flex justify-between items-center">
                    <span>Tables</span>
                    <button 
                        onClick={handleAddTable}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors"
                        title="New Table"
                    >
                        <Plus size={14} />
                    </button>
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

                <div className="px-2 mt-2">
                    <Tree 
                        items={treeItems}
                        onItemsChange={handleTreeChange}
                        onSelect={handleSelect}
                        onRename={handleRename}
                        onRemove={handleRemove}
                        onDuplicate={handleDuplicate}
                        // Add View via onAdd on Table items
                        onAdd={(id) => {
                            const table = tables.find(t => t.id === id);
                            if (table) handleCreateView(id);
                        }}
                        activeId={activeViewId || activeTableId}
                        renderIcon={renderIcon}
                        collapsible
                        removable
                        indicator
                        canHaveChildren={(item) => item.type === 'table'}
                        validateParent={(item, parentId) => {
                            // Table Logic: Root only
                            if (item.type === 'table') {
                                return parentId === null;
                            }
                            // View Logic: Must stay under original parent
                            if (item.type === 'view') {
                                return parentId === item.data.tableId;
                            }
                            return true;
                        }}
                    />
                </div>
            </div>
        </div>
        </div>

        <CreateTableDrawer 
            isOpen={isCreateTableOpen} 
            onClose={() => setIsCreateTableOpen(false)} 
            onCreate={handleConfirmCreateTable} 
            tables={tables}
            getTargetColumns={getTargetColumns}
        />
    </>
  );
};

export default TablePanel;
