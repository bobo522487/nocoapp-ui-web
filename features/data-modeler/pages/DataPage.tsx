
import React, { useState, useEffect, useMemo } from 'react';
import { SmartGrid } from '../components/SmartGrid/SmartGrid';
import { useAppStore } from '../../../store/useAppStore';
import { SchemaField, DbTable, ViewConfig, DbView } from '../../../types';
import { FileKey, Type, Mail, CheckCircle2, Calendar, DollarSign, Package, ShoppingCart, ArrowUpDown, Database, TableIcon, Plus, Hash, Braces, ToggleLeft, Link2, Settings2, Save, Filter } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { Input } from "../../../components/ui/input";
import ForeignKeyDrawer, { ForeignKeyConfig } from '../components/ForeignKeyDrawer';
import CreateColumnDrawer from '../components/CreateColumnDrawer';
import EditColumnDrawer from '../components/EditColumnDrawer';
import CreateRowDrawer from '../components/CreateRowDrawer';
import EditRowDrawer from '../components/EditRowDrawer';
import { MOCK_DB } from '../../../store/mockData';
import DataGrid from '../../../components/DataGrid'; // Use legacy for Model View if needed, or replace entirely.
import { ColumnDef } from '../../../components/DataTable'; // Legacy types if needed
import { arrayMove } from '@dnd-kit/sortable';

// --- Configuration ---
const TYPE_CONFIG: Record<string, { pk: boolean; fk: boolean; unique: boolean; notNull: boolean }> = {
    'serial':          { pk: true,  fk: false, unique: true,  notNull: true },
    'varchar':         { pk: true,  fk: true,  unique: true,  notNull: true },
    'int':             { pk: true,  fk: true,  unique: true,  notNull: true },
    'bigint':          { pk: true,  fk: true,  unique: true,  notNull: true },
    'float':           { pk: true,  fk: true,  unique: true,  notNull: true },
    'boolean':         { pk: false, fk: false, unique: false, notNull: true },
    'date with time':  { pk: false, fk: false, unique: false, notNull: true },
    'jsonb':           { pk: false, fk: false, unique: false, notNull: true },
};

const DATA_TYPES = [
    { id: 'varchar', label: 'Varchar', icon: Type },
    { id: 'int', label: 'Integer', icon: Hash },
    { id: 'float', label: 'Float', icon: DollarSign },
    { id: 'boolean', label: 'Boolean', icon: ToggleLeft },
    { id: 'date with time', label: 'Date with Time', icon: Calendar },
    { id: 'jsonb', label: 'JSONB', icon: Braces },
    { id: 'serial', label: 'Serial', icon: FileKey },
];

const getTypeIcon = (type: string) => {
    const found = DATA_TYPES.find(t => t.id === type);
    return found ? found.icon : Type;
};

const DataPage: React.FC = () => {
  const { activeTableId, tables, activeViewId, views, setActiveViewId, updateView, addView, dataViewMode } = useAppStore();
  
  // Local Data State
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  // Drawers State
  const [isForeignKeyDrawerOpen, setIsForeignKeyDrawerOpen] = useState(false);
  const [isCreateColumnDrawerOpen, setIsCreateColumnDrawerOpen] = useState(false);
  const [isEditColumnDrawerOpen, setIsEditColumnDrawerOpen] = useState(false);
  const [isCreateRowDrawerOpen, setIsCreateRowDrawerOpen] = useState(false);
  const [isEditRowDrawerOpen, setIsEditRowDrawerOpen] = useState(false);
  
  const [currentForeignKeyField, setCurrentForeignKeyField] = useState<SchemaField | null>(null);
  const [editingField, setEditingField] = useState<SchemaField | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  // View Management
  const activeView = views.find(v => v.id === activeViewId);
  const currentTable = tables.find(t => t.id === activeTableId);

  // Auto-switch to default view if none active for this table
  useEffect(() => {
      if (activeTableId && (!activeView || activeView.tableId !== activeTableId)) {
          const defaultView = views.find(v => v.tableId === activeTableId && v.isDefault) || views.find(v => v.tableId === activeTableId);
          if (defaultView) {
              setActiveViewId(defaultView.id);
          }
      }
  }, [activeTableId, activeView, views, setActiveViewId]);

  useEffect(() => {
    const data = MOCK_DB[activeTableId];
    if (!data) {
        setSchema([
             { id: 'id', name: 'ID', type: 'serial', width: 60, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' }
        ]);
        setRecords([]);
    } else {
        setSchema(data.schema);
        setRecords(data.records);
    }
    
    setIsForeignKeyDrawerOpen(false);
    setIsCreateColumnDrawerOpen(false);
    setIsEditColumnDrawerOpen(false);
    setIsCreateRowDrawerOpen(false);
    setIsEditRowDrawerOpen(false);
  }, [activeTableId]);

  // Handlers
  const handleViewConfigChange = (newConfig: ViewConfig) => {
      if (activeView) {
          updateView(activeView.id, { config: newConfig });
      }
  };

  const handleSchemaChange = (rowId: string | number, colId: string, value: any) => {
      setSchema(prev => prev.map(field => {
          if (field.id === rowId) {
              const updated = { ...field, [colId]: value };
              if (colId === 'isForeignKey' && value === false) delete (updated as any).foreignKeyConfig;
              if (colId === 'type') {
                  const config = TYPE_CONFIG[value as string];
                  if (!config.pk && updated.isPrimary) updated.isPrimary = false;
                  if (!config.unique && updated.isUnique) updated.isUnique = false;
                  if (!config.fk && updated.isForeignKey) {
                    updated.isForeignKey = false;
                    delete (updated as any).foreignKeyConfig;
                  }
                  updated.icon = getTypeIcon(value as string);
              }
              if (colId === 'isForeignKey' && value === true) {
                  setCurrentForeignKeyField(updated);
                  setIsForeignKeyDrawerOpen(true);
              }
              return updated;
          }
          return field;
      }));
  };

  const handleOpenRelationDrawer = (field: SchemaField) => {
      setCurrentForeignKeyField(field);
      setIsForeignKeyDrawerOpen(true);
  };

  const handleFKDrawerSave = (config: ForeignKeyConfig) => {
      if (currentForeignKeyField) {
          setSchema(prev => prev.map(f => f.id === currentForeignKeyField.id ? { 
              ...f, 
              isForeignKey: true,
              foreignKeyConfig: config
          } as any : f));
      }
      setIsForeignKeyDrawerOpen(false);
      setCurrentForeignKeyField(null);
  };

  const handleFKDrawerDelete = () => {
      if (currentForeignKeyField) {
          setSchema(prev => prev.map(f => f.id === currentForeignKeyField.id ? { 
              ...f, 
              isForeignKey: false,
              foreignKeyConfig: undefined
          } as any : f));
      }
      setIsForeignKeyDrawerOpen(false);
      setCurrentForeignKeyField(null);
  };

  const handleFKDrawerClose = () => {
      setIsForeignKeyDrawerOpen(false);
      if (currentForeignKeyField) {
          const field = schema.find(f => f.id === currentForeignKeyField.id);
          if (field && field.isForeignKey && !(field as any).foreignKeyConfig) {
              setSchema(prev => prev.map(f => f.id === currentForeignKeyField.id ? { ...f, isForeignKey: false } : f));
          }
      }
      setCurrentForeignKeyField(null);
  };

  const getTargetColumns = (tableId: string) => {
      const tableData = MOCK_DB[tableId];
      if (!tableData) return [];
      return tableData.schema.map(f => ({ id: f.id, name: f.name }));
  };

  const handleSchemaAddClick = () => {
      setIsCreateColumnDrawerOpen(true);
  };

  const handleEditColumn = (field: SchemaField) => {
      setEditingField(field);
      setIsEditColumnDrawerOpen(true);
  };

  const handleColumnUpdate = (updatedField: SchemaField) => {
      setSchema(prev => prev.map(f => f.id === updatedField.id ? updatedField : f));
  };

  const handleColumnCreate = (fieldConfig: Partial<SchemaField> & { targetTableId?: string, foreignKeyConfig?: ForeignKeyConfig }) => {
      const icon = getTypeIcon(fieldConfig.type || 'varchar');
      const newField: SchemaField = {
          id: `col_${Date.now()}`,
          name: fieldConfig.name || 'New Column',
          type: fieldConfig.type || 'varchar',
          defaultValue: fieldConfig.defaultValue || '',
          isPrimary: fieldConfig.isPrimary || false,
          isForeignKey: fieldConfig.isForeignKey || false,
          isUnique: fieldConfig.isUnique || false,
          isNullable: fieldConfig.isNullable !== undefined ? fieldConfig.isNullable : true,
          description: '',
          flex: true,
          icon: icon,
          width: 150,
          timeZone: fieldConfig.timeZone,
      };
      if (fieldConfig.foreignKeyConfig) {
          (newField as any).foreignKeyConfig = fieldConfig.foreignKeyConfig;
      }
      setSchema([...schema, newField]);
  };

  // Supports single string ID or array of IDs (legacy)
  const handleSchemaDelete = (idOrIds: string | (string | number)[]) => {
      const idsToDelete = new Set(Array.isArray(idOrIds) ? idOrIds.map(String) : [String(idOrIds)]);
      setSchema(prev => prev.filter(col => !idsToDelete.has(String(col.id))));
  };

  const handleDataChange = (rowId: string | number, colId: string, value: any) => {
      setRecords(prev => prev.map(record => 
          record.id === rowId ? { ...record, [colId]: value } : record
      ));
  };

  const handleAddRowClick = () => {
      setIsCreateRowDrawerOpen(true);
  };

  const handleEditRow = (id: string | number) => {
      const record = records.find(r => r.id === id);
      if (record) {
          setEditingRecord(record);
          setIsEditRowDrawerOpen(true);
      }
  };

  const handleConfirmCreateRow = (recordData: Record<string, any>) => {
      const newId = Math.max(...records.map(r => Number(r.id) || 0), 0) + 1;
      const newRecord = { id: newId, ...recordData };
      setRecords([...records, newRecord]);
  };

  const handleConfirmEditRow = (recordData: Record<string, any>) => {
      if (!editingRecord) return;
      // Merge updates
      const updatedRecord = { ...editingRecord, ...recordData };
      setRecords(prev => prev.map(r => r.id === editingRecord.id ? updatedRecord : r));
      setEditingRecord(null);
  };

  const handleDataDelete = (ids: (string | number)[]) => {
      const idsToDelete = new Set(ids.map(String));
      setRecords(prev => prev.filter(rec => !idsToDelete.has(String(rec.id))));
  };

  const handleRowReorder = (activeId: string, overId: string) => {
      setRecords((items) => {
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === overId);
          return arrayMove(items, oldIndex, newIndex);
      });
  };

  // --- Legacy Model Columns Definition (Kept for Model View if using legacy grid) ---
  const modelColumns: ColumnDef<SchemaField>[] = [
      {
          id: 'name',
          header: 'Column Name',
          accessorKey: 'name',
          minWidth: 200,
          flex: true,
          editable: true,
          renderCell: (row) => (
              <div className="flex items-center gap-2 font-medium text-foreground pl-1 h-full">
                  {row.name}
                  {row.isPrimary && <FileKey size={12} className="text-yellow-500 ml-1" />}
              </div>
          )
      },
      {
          id: 'type',
          header: 'Data Type',
          accessorKey: 'type',
          width: 150,
          minWidth: 140,
          editable: true,
          type: 'select',
          options: DATA_TYPES.map(t => ({ id: t.id, label: t.label, icon: t.icon })),
          renderCell: (row) => {
              const typeObj = DATA_TYPES.find(t => t.id === row.type) || DATA_TYPES[0];
              const Icon = typeObj.icon;
              return (
                 <div className="flex items-center gap-2 text-foreground pl-1">
                     <Icon size={14} className="text-muted-foreground" />
                     <span className="text-sm">{typeObj.label}</span>
                 </div>
              );
          }
      },
      {
          id: 'defaultValue',
          header: 'Default Value',
          accessorKey: 'defaultValue',
          width: 120,
          minWidth: 100,
          editable: true,
          renderCell: (row) => <span className="text-foreground font-mono text-xs pl-1">{row.defaultValue}</span>
      },
      {
          id: 'isPrimary',
          header: <div className="text-center w-full text-[10px] font-semibold text-muted-foreground uppercase">Primary</div>,
          accessorKey: 'isPrimary',
          width: 70,
          renderCell: (row) => (
              <div className="flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={row.isPrimary} onCheckedChange={(checked) => handleSchemaChange(row.id, 'isPrimary', !!checked)} disabled={!TYPE_CONFIG[row.type].pk} />
              </div>
          )
      },
      {
          id: 'isUnique',
          header: <div className="text-center w-full text-[10px] font-semibold text-muted-foreground uppercase">Unique</div>,
          accessorKey: 'isUnique',
          width: 70,
          renderCell: (row) => (
              <div className="flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                  <Switch checked={row.isUnique} onCheckedChange={(checked) => handleSchemaChange(row.id, 'isUnique', checked)} className="scale-75" disabled={!TYPE_CONFIG[row.type].unique} />
              </div>
          )
      },
      {
          id: 'isNullable',
          header: <div className="text-center w-full text-[10px] font-semibold text-muted-foreground uppercase">Nullable</div>,
          accessorKey: 'isNullable',
          width: 70,
          renderCell: (row) => (
              <div className="flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                  <Switch checked={row.isNullable} onCheckedChange={(checked) => handleSchemaChange(row.id, 'isNullable', checked)} className="scale-75" disabled={!TYPE_CONFIG[row.type].notNull} />
              </div>
          )
      },
      {
          id: 'fkInfo',
          header: 'Relation',
          width: 150,
          flex: true,
          renderCell: (row) => {
              if (!row.isForeignKey) return <span className="text-muted-foreground/30 text-xs pl-1">-</span>;
              const fkConfig = (row as any).foreignKeyConfig as ForeignKeyConfig;
              if (fkConfig && fkConfig.targetTableId) {
                  const targetTable = tables.find(t => t.id === fkConfig.targetTableId);
                  const targetTableDisplay = targetTable ? targetTable.name : fkConfig.targetTableId;
                  return (
                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenRelationDrawer(row); }}>
                           <Link2 size={10} />
                           <span>{targetTableDisplay}</span>
                      </div>
                  );
              }
               return (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground pl-1" onClick={(e) => { e.stopPropagation(); handleOpenRelationDrawer(row); }}>
                       <Settings2 size={10} />
                       <span className="italic">Configure</span>
                  </div>
              );
          }
      }
  ];

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-background relative min-w-0">
      
      {dataViewMode === 'MODEL' ? (
          // Keeping Legacy DataGrid for Model View for now
          <DataGrid<SchemaField>
            columns={modelColumns}
            data={schema}
            onAdd={handleSchemaAddClick}
            addItemLabel="Add Column"
            onEdit={handleSchemaChange}
            onDelete={handleSchemaDelete}
            keyField="id"
            hideToolbar={true} 
          />
      ) : (
          // Using new SmartGrid for Data View
          <SmartGrid<any>
            data={records}
            schema={schema}
            onCellEdit={handleDataChange}
            onAddColumn={handleSchemaAddClick}
            onEditColumn={handleEditColumn}
            onDeleteColumn={handleSchemaDelete}
            onAddRow={handleAddRowClick}
            onRowSelect={() => {}} // Internal state used in toolbar
            onRowReorder={handleRowReorder}
            onEditRow={handleEditRow}
            onDeleteRows={handleDataDelete}
          />
      )}

      {currentForeignKeyField && (
        <ForeignKeyDrawer
            isOpen={isForeignKeyDrawerOpen}
            onClose={handleFKDrawerClose}
            sourceTableName={activeTableId}
            sourceColumnName={currentForeignKeyField.name}
            tables={tables} 
            getTargetColumns={getTargetColumns} 
            onSave={handleFKDrawerSave}
            onDelete={handleFKDrawerDelete}
        />
      )}

      <CreateColumnDrawer
        isOpen={isCreateColumnDrawerOpen}
        onClose={() => setIsCreateColumnDrawerOpen(false)}
        onCreate={handleColumnCreate}
        tables={tables}
        activeTableName={currentTable?.name || activeTableId}
        getTargetColumns={getTargetColumns}
      />

      <EditColumnDrawer
        isOpen={isEditColumnDrawerOpen}
        onClose={() => setIsEditColumnDrawerOpen(false)}
        initialField={editingField}
        onSave={handleColumnUpdate}
        onDelete={handleSchemaDelete}
        tables={tables}
        activeTableName={currentTable?.name || activeTableId}
        getTargetColumns={getTargetColumns}
      />

      <CreateRowDrawer
        isOpen={isCreateRowDrawerOpen}
        onClose={() => setIsCreateRowDrawerOpen(false)}
        onCreate={handleConfirmCreateRow}
        schema={schema}
      />

      <EditRowDrawer
        isOpen={isEditRowDrawerOpen}
        onClose={() => { setIsEditRowDrawerOpen(false); setEditingRecord(null); }}
        initialData={editingRecord}
        onSave={handleConfirmEditRow}
        schema={schema}
      />
    </div>
  );
};

export default DataPage;
