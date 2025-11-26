

import React, { useState, useEffect } from 'react';
import DataGrid from '../../../components/DataGrid';
import { ColumnDef } from '../../../components/DataTable';
import { useAppStore } from '../../../store/useAppStore';
import { SchemaField, DbTable } from '../../../types';
import { FileKey, Type, Mail, CheckCircle2, Calendar, DollarSign, Package, ShoppingCart, ArrowUpDown, Database, TableIcon, Plus, Hash, Braces, ToggleLeft, Link2, Settings2 } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import ForeignKeyDrawer, { ForeignKeyConfig } from '../components/ForeignKeyDrawer';
import CreateColumnDrawer from '../components/CreateColumnDrawer';

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

const TIMEZONE_OFFSET_MAP: Record<string, string> = {
    'UTC': 'UTC+00:00',
    'America/New_York': 'UTC-05:00',
    'America/Los_Angeles': 'UTC-08:00',
    'Europe/London': 'UTC+00:00',
    'Europe/Paris': 'UTC+01:00',
    'Asia/Tokyo': 'UTC+09:00',
    'Asia/Shanghai': 'UTC+08:00',
    'Australia/Sydney': 'UTC+11:00',
};

const getTypeIcon = (type: string) => {
    const found = DATA_TYPES.find(t => t.id === type);
    return found ? found.icon : Type;
};

// --- Mock Data Store ---
const MOCK_DB: Record<string, { schema: SchemaField[], records: any[] }> = {
    'users': {
        schema: [
            { id: 'id', name: 'ID', type: 'serial', width: 60, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'name', name: 'Name', type: 'varchar', width: 200, icon: Type, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '', flex: true },
            { id: 'email', name: 'Email', type: 'varchar', width: 250, icon: Mail, isPrimary: false, isUnique: true, isNullable: true, defaultValue: 'null', flex: true },
            { id: 'role', name: 'Role', type: 'varchar', width: 140, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Viewer' },
            { id: 'status', name: 'Status', type: 'varchar', width: 120, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Active' },
            { id: 'created', name: 'Created At', type: 'date with time', width: 180, icon: Calendar, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'now()', timeZone: 'UTC' },
        ],
        records: [
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', created: '2023-10-01' },
            { id: 2, name: 'Jane Smith', email: 'jane@company.com', role: 'Editor', status: 'Active', created: '2023-10-02' },
            { id: 3, name: 'Alice Johnson', email: 'alice@test.co', role: 'Viewer', status: 'Inactive', created: '2023-10-05' },
            { id: 4, name: 'Robert Brown', email: 'bob@domain.net', role: 'Editor', status: 'Active', created: '2023-10-10' },
            { id: 5, name: 'Charlie Davis', email: 'charlie@demo.org', role: 'Viewer', status: 'Active', created: '2023-10-12' },
            { id: 6, name: 'Diana Evans', email: 'diana@corp.com', role: 'Admin', status: 'Inactive', created: '2023-10-15' },
        ]
    },
    'orders': {
        schema: [
            { id: 'id', name: 'Order ID', type: 'serial', width: 80, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'customer', name: 'Customer', type: 'varchar', width: 200, icon: Type, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '', flex: true },
            { id: 'amount', name: 'Amount', type: 'float', width: 120, icon: DollarSign, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0.00' },
            { id: 'status', name: 'Status', type: 'varchar', width: 120, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Pending' },
            { id: 'date', name: 'Order Date', type: 'date with time', width: 160, icon: Calendar, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'now()', timeZone: 'Asia/Shanghai' },
        ],
        records: [
            { id: 1001, customer: 'John Doe', amount: '$120.50', status: 'Completed', date: '2023-11-01' },
            { id: 1002, customer: 'Jane Smith', amount: '$85.00', status: 'Processing', date: '2023-11-02' },
            { id: 1003, customer: 'Alice Johnson', amount: '$240.00', status: 'Pending', date: '2023-11-03' },
            { id: 1004, customer: 'Robert Brown', amount: '$45.99', status: 'Completed', date: '2023-11-04' },
        ]
    },
    'products': {
        schema: [
            { id: 'id', name: 'SKU', type: 'serial', width: 80, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'name', name: 'Product Name', type: 'varchar', width: 250, icon: Package, isPrimary: false, isUnique: true, isNullable: false, defaultValue: '', flex: true },
            { id: 'category', name: 'Category', type: 'varchar', width: 150, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'General' },
            { id: 'price', name: 'Price', type: 'float', width: 100, icon: DollarSign, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0.00' },
            { id: 'stock', name: 'Stock', type: 'int', width: 100, icon: ShoppingCart, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0' },
        ],
        records: [
            { id: 501, name: 'Wireless Mouse', category: 'Electronics', price: '$29.99', stock: 150 },
            { id: 502, name: 'Mechanical Keyboard', category: 'Electronics', price: '$89.99', stock: 45 },
            { id: 503, name: 'Desk Chair', category: 'Furniture', price: '$199.99', stock: 12 },
            { id: 504, name: 'Monitor 27"', category: 'Electronics', price: '$249.50', stock: 30 },
        ]
    },
    'inventory_logs': {
        schema: [
            { id: 'id', name: 'Log ID', type: 'serial', width: 80, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'product', name: 'Product SKU', type: 'varchar', width: 150, icon: Package, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '' },
            { id: 'change', name: 'Quantity Change', type: 'int', width: 150, icon: ArrowUpDown, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0' },
            { id: 'reason', name: 'Reason', type: 'varchar', width: 150, icon: Type, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Restock', flex: true },
            { id: 'timestamp', name: 'Timestamp', type: 'date with time', width: 180, icon: Calendar, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'now()', timeZone: 'America/New_York' },
        ],
        records: [
            { id: 1, product: 'SKU-501', change: '+50', reason: 'Restock', timestamp: '2023-11-01 10:00 AM' },
            { id: 2, product: 'SKU-503', change: '-2', reason: 'Sale', timestamp: '2023-11-01 11:30 AM' },
            { id: 3, product: 'SKU-502', change: '-5', reason: 'Damage', timestamp: '2023-11-02 09:15 AM' },
        ]
    }
}

const DataPage: React.FC = () => {
  const { activeTableId, tables } = useAppStore();
  const [viewMode, setViewMode] = useState<'MODEL' | 'DATA'>('MODEL');
  
  // Use state to manage the data locally since MOCK_DB is just the initial state
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  // Drawers State
  const [isForeignKeyDrawerOpen, setIsForeignKeyDrawerOpen] = useState(false);
  const [isCreateColumnDrawerOpen, setIsCreateColumnDrawerOpen] = useState(false);
  const [currentForeignKeyField, setCurrentForeignKeyField] = useState<SchemaField | null>(null);

  useEffect(() => {
    // Load data based on activeTableId
    const data = MOCK_DB[activeTableId];
    
    // Fallback if table ID doesn't match mock keys (e.g. new table)
    if (!data) {
        setSchema([
             { id: 'id', name: 'ID', type: 'serial', width: 60, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' }
        ]);
        setRecords([]);
    } else {
        setSchema(data.schema);
        setRecords(data.records);
    }
    
    // Reset view mode on table switch
    setViewMode('MODEL');
    setIsForeignKeyDrawerOpen(false);
    setIsCreateColumnDrawerOpen(false);
  }, [activeTableId]);

  // --- Handlers for DataGrid Actions ---

  const handleSchemaChange = (rowId: string | number, colId: string, value: any) => {
      setSchema(prev => prev.map(field => {
          if (field.id === rowId) {
              const updated = { ...field, [colId]: value };

              // If turning off FK, clear config
              if (colId === 'isForeignKey' && value === false) {
                  delete (updated as any).foreignKeyConfig;
              }
              
              // If type changed, validate constraints
              if (colId === 'type') {
                  const config = TYPE_CONFIG[value as string];
                  if (!config.pk && updated.isPrimary) updated.isPrimary = false;
                  if (!config.unique && updated.isUnique) updated.isUnique = false;
                  if (!config.fk && updated.isForeignKey) {
                    updated.isForeignKey = false;
                    delete (updated as any).foreignKeyConfig;
                  }
                  
                  // Update icon based on type
                  updated.icon = getTypeIcon(value as string);
              }

              // Trigger Drawer if Foreign Key is enabled
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
      // Update the schema to reflect the FK setting
      if (currentForeignKeyField) {
          setSchema(prev => prev.map(f => f.id === currentForeignKeyField.id ? { 
              ...f, 
              isForeignKey: true,
              // Store config loosely on the field object for display
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
      
      // If we are closing without saving, check if we need to revert the isForeignKey toggle
      if (currentForeignKeyField) {
          // Look up current state of the field
          const field = schema.find(f => f.id === currentForeignKeyField.id);
          // If isForeignKey is true but no config exists, it means creation was cancelled
          if (field && field.isForeignKey && !(field as any).foreignKeyConfig) {
              setSchema(prev => prev.map(f => f.id === currentForeignKeyField.id ? { ...f, isForeignKey: false } : f));
          }
      }
      setCurrentForeignKeyField(null);
  };

  const getTargetColumns = (tableId: string) => {
      // Since MOCK_DB is local here but we need it for dropdowns, we access it directly
      const tableData = MOCK_DB[tableId];
      if (!tableData) return [];
      return tableData.schema.map(f => ({ id: f.id, name: f.name }));
  };

  const handleSchemaAddClick = () => {
      setIsCreateColumnDrawerOpen(true);
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
      
      // Add foreignKeyConfig if present
      if (fieldConfig.foreignKeyConfig) {
          (newField as any).foreignKeyConfig = fieldConfig.foreignKeyConfig;
      }

      setSchema([...schema, newField]);
  };

  const handleSchemaDelete = (ids: (string | number)[]) => {
      const idsToDelete = new Set(ids.map(String));
      setSchema(prev => prev.filter(col => !idsToDelete.has(String(col.id))));
  };

  const handleDataChange = (rowId: string | number, colId: string, value: any) => {
      setRecords(prev => prev.map(record => 
          record.id === rowId ? { ...record, [colId]: value } : record
      ));
  };

  const handleDataAdd = () => {
      const newId = Math.max(...records.map(r => r.id), 0) + 1;
      const newRecord: any = { id: newId };
      schema.forEach(field => {
          if (field.id !== 'id') {
              newRecord[field.id] = '';
          }
      });
      setRecords([...records, newRecord]);
  };

  const handleDataDelete = (ids: (string | number)[]) => {
      // Ensure we compare strings to avoid number vs string issues
      const idsToDelete = new Set(ids.map(String));
      setRecords(prev => prev.filter(rec => !idsToDelete.has(String(rec.id))));
  };

  // --- Column Definitions ---

  // 1. Model View Columns (Editing Schema)
  const modelColumns: ColumnDef<SchemaField>[] = [
      {
          id: 'name',
          header: 'Column Name',
          accessorKey: 'name',
          width: 180,
          minWidth: 150,
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
                  <Checkbox 
                    checked={row.isPrimary} 
                    onCheckedChange={(checked) => handleSchemaChange(row.id, 'isPrimary', !!checked)}
                    disabled={!TYPE_CONFIG[row.type].pk}
                  />
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
                  <Switch 
                    checked={row.isUnique} 
                    onCheckedChange={(checked) => handleSchemaChange(row.id, 'isUnique', checked)} 
                    className="scale-75"
                    disabled={!TYPE_CONFIG[row.type].unique}
                  />
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
                  <Switch 
                    checked={row.isNullable} 
                    onCheckedChange={(checked) => handleSchemaChange(row.id, 'isNullable', checked)}
                    className="scale-75"
                    disabled={!TYPE_CONFIG[row.type].notNull}
                  />
              </div>
          )
      },
      {
          id: 'isForeignKey',
          header: <div className="text-center w-full text-[10px] font-semibold text-muted-foreground uppercase">Foreign Key</div>,
          accessorKey: 'isForeignKey',
          width: 90,
          renderCell: (row) => (
              <div className="flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                  <Switch 
                    checked={!!row.isForeignKey} 
                    onCheckedChange={(checked) => handleSchemaChange(row.id, 'isForeignKey', checked)}
                    className="scale-75"
                    disabled={!TYPE_CONFIG[row.type].fk}
                  />
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

  // 2. Data View Columns (Generated from Schema)
  const dataColumns: ColumnDef<any>[] = schema.map(field => ({
      id: field.id,
      header: (
          <div className="flex items-center gap-2 w-full">
             {field.icon && <field.icon size={13} className="text-muted-foreground shrink-0" />}
             <span className="truncate">{field.name}</span>
             {field.timeZone && TIMEZONE_OFFSET_MAP[field.timeZone] && (
                 <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1 text-muted-foreground font-normal border-muted-foreground/30 shrink-0">
                     {TIMEZONE_OFFSET_MAP[field.timeZone]}
                 </Badge>
             )}
          </div>
      ),
      accessorKey: field.id,
      width: field.flex ? undefined : field.width,
      flex: field.flex,
      minWidth: 100,
      type: (field.type === 'int' || field.type === 'float' || field.type === 'bigint' || field.type === 'serial') ? 'number' : 'text',
      editable: field.id !== 'id' && field.id !== 'created', // ID and Created read-only (generic rule assumption)
      renderCell: (row, value) => {
          if (field.id === 'status') {
               const variant = value === 'Active' || value === 'Completed' ? 'default' : 
                               value === 'Inactive' || value === 'Damage' ? 'destructive' : 'secondary';
               const className = variant === 'secondary' ? "text-foreground bg-muted" : "";
               return (
                   <Badge variant={variant} className={`text-[10px] h-5 px-1.5 font-normal ${className}`}>
                        {value}
                    </Badge>
               );
          }
          if (field.id === 'role') {
              return (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-muted/30 text-foreground">
                    {value}
                  </Badge>
              );
          }
          return <span className="truncate text-foreground pl-1">{value}</span>;
      }
  }));

  const currentTable = tables.find(t => t.id === activeTableId);
  const title = currentTable ? currentTable.name : activeTableId;

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-background relative min-w-0">
      {/* View Mode Toggle / Header Extension */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20">
          <div className="flex bg-muted/50 p-1 rounded-md">
              <Button 
                variant={viewMode === 'MODEL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('MODEL')}
                className="h-7 text-xs gap-2"
              >
                  <Database size={14} /> Model
              </Button>
              <Button 
                variant={viewMode === 'DATA' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('DATA')}
                className="h-7 text-xs gap-2"
              >
                  <TableIcon size={14} /> Data
              </Button>
          </div>
      </div>
    
      {viewMode === 'MODEL' ? (
          <DataGrid<SchemaField>
            title={`${title} (Model)`}
            columns={modelColumns}
            data={schema}
            onAdd={handleSchemaAddClick}
            onEdit={handleSchemaChange}
            onDelete={handleSchemaDelete}
            keyField="id"
          />
      ) : (
          <DataGrid<any>
            title={`${title} (Data)`}
            columns={dataColumns}
            data={records}
            onAdd={handleDataAdd}
            onEdit={handleDataChange}
            onDelete={handleDataDelete}
            keyField="id"
          />
      )}

      {currentForeignKeyField && (
        <ForeignKeyDrawer
            isOpen={isForeignKeyDrawerOpen}
            onClose={handleFKDrawerClose}
            sourceTableName={activeTableId}
            sourceColumnName={currentForeignKeyField.name}
            tables={tables} // Pass tables from store
            getTargetColumns={getTargetColumns} // Function to resolve columns for selected table
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
    </div>
  );
};

export default DataPage;
