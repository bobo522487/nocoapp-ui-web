import React, { useState, useMemo } from 'react';
import { Search, Plus, Table, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { DbView, DbTable, SchemaField } from '../../../types';
import { Tree } from '../../../components/common/Tree/Tree';
import { TreeItem } from '../../../components/common/Tree/types';
import { CreateTableDrawer } from './CreateTableDrawer';
import { useRouteContext } from '../../../hooks/useRouteContext';
import { useDataStore } from '../../../store/useDataStore';

const TablePanel: React.FC = () => {
  const navigate = useNavigate();
  const { activeTableId } = useRouteContext();

  const tables = useDataStore((s) => s.tables);
  const views = useDataStore((s) => s.views);
  const activeViewId = useDataStore((s) => s.activeViewId);
  const schemas = useDataStore((s) => s.schemas);
  const addTable = useDataStore((s) => s.addTable);
  const updateTable = useDataStore((s) => s.updateTable);
  const deleteTable = useDataStore((s) => s.deleteTable);
  const duplicateTable = useDataStore((s) => s.duplicateTable);
  const duplicateView = useDataStore((s) => s.duplicateView);
  const setViews = useDataStore((s) => s.setViews);
  const addView = useDataStore((s) => s.addView);
  const updateView = useDataStore((s) => s.updateView);
  const deleteView = useDataStore((s) => s.deleteView);
  const setActiveViewId = useDataStore((s) => s.setActiveViewId);
  const reorderTables = useDataStore((s) => s.reorderTables);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);

  const treeItems: TreeItem[] = useMemo(() => {
    const filteredTables = tables.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filteredTables.map((table) => {
      const tableViews = views.filter((v) => v.tableId === table.id);
      return {
        id: table.id,
        type: 'table',
        children: tableViews.map((view) => ({
          id: view.id,
          type: 'view',
          children: [],
          data: { name: view.name, icon: 'view', tableId: table.id },
        })),
        collapsed: false,
        data: { name: table.name, icon: 'table', code: table.code },
      };
    });
  }, [tables, views, searchTerm]);

  const handleTreeChange = (newItems: TreeItem[]) => {
    if (searchTerm) return;

    const newTables = newItems
      .map((item) => tables.find((t) => t.id === item.id))
      .filter((t): t is DbTable => Boolean(t));
    if (newTables.length === tables.length) {
      reorderTables(newTables);
    }

    const processedViewIds = new Set<string>();
    const newViewsOrdered: DbView[] = [];

    newItems.forEach((tableItem) => {
      if (tableItem.children) {
        tableItem.children.forEach((viewItem) => {
          const originalView = views.find((v) => v.id === viewItem.id);
          if (originalView) {
            newViewsOrdered.push({
              ...originalView,
              tableId: tableItem.id as string,
            });
            processedViewIds.add(viewItem.id as string);
          }
        });
      }
    });

    const remainingViews = views.filter((v) => !processedViewIds.has(v.id));
    setViews([...newViewsOrdered, ...remainingViews]);
  };

  const handleSelect = (item: any) => {
    if (item.type === 'table') {
      setActiveViewId(null);
      navigate(`/data/${item.id}`);
    } else if (item.type === 'view') {
      const view = views.find((v) => v.id === item.id);
      if (view) {
        setActiveViewId(view.id);
        navigate(`/data/${view.tableId}`);
      }
    }
  };

  const handleCreateView = (tableId: string) => {
    const newView: DbView = {
      id: `view_${Date.now()}`,
      tableId,
      name: '新视图',
      config: { filters: [], sort: null, hiddenFields: [] },
    };
    addView(newView);
    navigate(`/data/${tableId}`);
  };

  const handleConfirmCreateTable = (tableName: string, columns: SchemaField[]) => {
    const timestamp = Date.now();
    const newId = `table_${timestamp}`;

    addTable(
      {
        id: newId,
        name: tableName,
        code: tableName.toLowerCase().replace(/\s+/g, '_'),
        kind: 'table',
      },
      columns,
      []
    );

    navigate(`/data/${newId}`);
  };

  const renderIcon = (item: any) => {
    if (item.type === 'table') {
      return (
        <Table size={14} className={activeTableId === item.id ? 'text-primary' : ''} />
      );
    }
    if (item.type === 'view') {
      return (
        <Filter
          size={12}
          className={activeViewId === item.id ? 'text-primary' : 'opacity-70'}
        />
      );
    }
    return null;
  };

  const handleRename = (id: string, name: string) => {
    const isTable = tables.some((t) => t.id === id);
    if (isTable) updateTable(id, { name });
    else updateView(id, { name });
  };

  const handleRemove = (id: string) => {
    const isTable = tables.some((t) => t.id === id);
    if (isTable) {
      const nextTableId = deleteTable(id);
      if (activeTableId === id) {
        navigate(nextTableId ? `/data/${nextTableId}` : '/datasources');
      }
    } else {
      deleteView(id);
    }
  };

  const handleDuplicate = (id: string) => {
    const isTable = tables.some((t) => t.id === id);
    if (isTable) {
      const newId = duplicateTable(id);
      if (newId) navigate(`/data/${newId}`);
    } else {
      duplicateView(id);
    }
  };

  const getTargetColumns = (tableId: string) => {
    const tableCols = schemas[tableId];
    if (!tableCols) return [];
    return tableCols.map((f) => ({ id: f.id, name: f.name }));
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <div className="h-10 px-4 border-b border-border flex justify-between items-center shrink-0 bg-background">
          <span className="font-semibold text-[14px] text-foreground">数据管理</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2.5">
          <div className="mb-4">
            <div className="px-4 py-1 text-[12px] font-semibold text-muted-foreground mb-2 flex justify-between items-center">
              <span>数据表</span>
              <button
                onClick={() => setIsCreateTableOpen(true)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-[hsl(var(--surface-hover))] transition-colors"
                title="新建数据表"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="px-3 mb-2 relative">
              <Search
                size={12}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                placeholder="搜索数据表..."
                className="h-8 pl-8 text-[13px]"
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
                onAdd={(id) => {
                  const table = tables.find((t) => t.id === id);
                  if (table) handleCreateView(id);
                }}
                activeId={activeViewId || activeTableId}
                renderIcon={renderIcon}
                collapsible
                removable
                indicator
                canHaveChildren={(item) => item.type === 'table'}
                validateParent={(item, parentId) => {
                  if (item.type === 'table') {
                    return parentId === null;
                  }
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
