import { create } from 'zustand';
import { ViewMode, Page, GridItemData, DbTable, UserProfile, DbView, SchemaField, FileSystemNode, FileType, Tab } from '../types';
import { INITIAL_SCHEMAS, INITIAL_RECORDS, MOCK_DB } from './mockData';
import { INITIAL_FILES } from '../constants';
import { arrayMove } from '@dnd-kit/sortable';
import { FileKey } from 'lucide-react';

export type AppTheme = 'vercel' | 'supabase' | 'slack' | 'vscode';
export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface AppState {
  isDarkMode: boolean;
  theme: AppTheme;
  activeView: ViewMode;
  activeDevice: DeviceType;
  toggleTheme: () => void;
  setAppTheme: (theme: AppTheme) => void;
  setActiveView: (view: ViewMode) => void;
  setActiveDevice: (device: DeviceType) => void;
  
  // User State
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  
  // Page State
  pages: Page[];
  activePageId: string;
  setPages: (pages: Page[]) => void;
  setActivePageId: (id: string) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  addPage: (page: Page) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  togglePageFolder: (id: string) => void;
  reorderPages: (pages: Page[]) => void;

  // Data State - Single Source of Truth
  tables: DbTable[];
  activeTableId: string;
  dataViewMode: 'DATA' | 'MODEL';
  schemas: Record<string, SchemaField[]>;
  records: Record<string, any[]>;
  
  setTables: (tables: DbTable[]) => void;
  setActiveTableId: (id: string) => void;
  setDataViewMode: (mode: 'DATA' | 'MODEL') => void;
  addTable: (table: DbTable, schema?: SchemaField[], initialRecords?: any[]) => void;
  duplicateTable: (id: string) => void;
  updateTable: (id: string, updates: Partial<DbTable>) => void;
  deleteTable: (id: string) => void;
  reorderTables: (tables: DbTable[]) => void;

  // Schema & Field Operations
  setTableSchema: (tableId: string, schema: SchemaField[]) => void;
  addTableColumn: (tableId: string, column: SchemaField) => void;
  updateTableColumn: (tableId: string, columnId: string, updates: Partial<SchemaField>) => void;
  deleteTableColumn: (tableId: string, columnId: string | (string | number)[]) => void;

  // Record Operations
  setTableRecords: (tableId: string, records: any[]) => void;
  addTableRecord: (tableId: string, record: Record<string, any>) => void;
  updateTableRecord: (tableId: string, recordId: string | number, updates: Record<string, any>) => void;
  updateTableCell: (tableId: string, rowId: string | number, colId: string, value: any) => void;
  deleteTableRecords: (tableId: string, recordIds: (string | number)[]) => void;
  reorderTableRecords: (tableId: string, activeId: string, overId: string) => void;

  // View State
  views: DbView[];
  activeViewId: string | null;
  setViews: (views: DbView[]) => void;
  addView: (view: DbView) => void;
  updateView: (id: string, updates: Partial<DbView>) => void;
  deleteView: (id: string) => void;
  duplicateView: (id: string) => void;
  setActiveViewId: (id: string | null) => void;

  // App Builder / Layout State
  pageLayouts: Record<string, Record<string, GridItemData[]>>;
  selectedComponentId: string | null;
  draggedWidget: any | null;
  droppedWidget: any | null;
  
  setLayouts: (layouts: Record<string, GridItemData[]>) => void;
  setSelectedComponentId: (id: string | null) => void;
  updateLayoutItem: (id: string, updates: Partial<GridItemData>) => void;
  setDraggedWidget: (widget: any | null) => void;
  setDroppedWidget: (widget: any | null) => void;

  // Editor Subsystem State
  files: FileSystemNode[];
  tabs: Tab[];
  editorActiveTabId: string | null;
  toggleFolder: (id: string) => void;
  selectFile: (node: FileSystemNode) => void;
  closeTab: (tabId: string) => void;
  updateFileContent: (content: string) => void;
  setEditorActiveTabId: (id: string | null) => void;
}

const INITIAL_PAGES: Page[] = [
  { id: 'page-1', name: 'Dashboard', type: 'page', icon: 'LayoutGrid', isHome: true, isHidden: false, isDisabled: false, height: '800' },
  { id: 'page-2', name: 'Orders', type: 'page', icon: 'ShoppingCart', isHome: false, isHidden: false, isDisabled: false, height: '1000' },
  { id: 'page-3', name: 'Settings', type: 'page', icon: 'Settings', isHome: false, isHidden: false, isDisabled: false, height: '600' },
];

const INITIAL_TABLES: DbTable[] = [
    { id: 'users', name: 'Users', code: 'users', kind: 'table', description: 'System users' },
    { id: 'orders', name: 'Orders', code: 'orders', kind: 'table', description: 'Customer orders' },
    { id: 'products', name: 'Products', code: 'products', kind: 'table', description: 'Product catalog' },
    { id: 'inventory_logs', name: 'Inventory Logs', code: 'inventory_logs', kind: 'table', description: 'Stock changes' }
];

// Generate default views for initial tables
const INITIAL_VIEWS: DbView[] = INITIAL_TABLES.map(table => ({
    id: `view_${table.id}_default`,
    tableId: table.id,
    name: table.name,
    isDefault: true,
    config: {
        filters: [],
        sort: null,
        hiddenFields: []
    }
}));

const INITIAL_LAYOUT: GridItemData[] = [
  { i: 'stat1', x: 0, y: 0, w: 3, h: 3, type: 'stat', title: 'Total Revenue', content: { value: '$45,231.89', trend: '+20.1%' } },
  { i: 'stat2', x: 3, y: 0, w: 3, h: 3, type: 'stat', title: 'Subscriptions', content: { value: '+2350', trend: '+180.1%' } },
  { i: 'stat3', x: 6, y: 0, w: 3, h: 3, type: 'stat', title: 'Sales', content: { value: '+12,234', trend: '+19%' } },
  { i: 'chart1', x: 0, y: 3, w: 8, h: 8, type: 'chart', title: 'Revenue Overview', content: { _query: { definition: { tableId: 'orders', select: ['date', 'amount'] } } } },
  { i: 'list1', x: 8, y: 3, w: 4, h: 8, type: 'table', title: 'Recent Sales', content: { _query: { definition: { tableId: 'orders', limit: 5 } } } },
];

const INITIAL_PAGE_LAYOUTS: Record<string, Record<string, GridItemData[]>> = {
  'page-1': { lg: INITIAL_LAYOUT },
  'page-2': { lg: [] },
  'page-3': { lg: [] },
};

// Sync MOCK_DB backward compatibility proxy
const syncLegacyMockDb = (schemas: Record<string, SchemaField[]>, records: Record<string, any[]>) => {
    Object.keys(schemas).forEach(tableId => {
        MOCK_DB[tableId] = {
            schema: schemas[tableId],
            records: records[tableId] || []
        };
    });
};

export const useAppStore = create<AppState>((set, get) => ({
  isDarkMode: true,
  theme: 'vscode',
  activeView: ViewMode.HOME,
  activeDevice: 'desktop',
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setAppTheme: (theme) => set({ theme }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveDevice: (device) => set({ activeDevice: device }),

  // User State
  user: {
      name: 'John Doe',
      email: 'john@noco.app',
      role: 'Developer',
      bio: 'Full-stack developer building cool things.'
  },
  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  pages: INITIAL_PAGES,
  activePageId: 'page-1',
  setPages: (pages) => set({ pages }),
  setActivePageId: (id) => set({ activePageId: id }),
  updatePage: (id, updates) => set((state) => ({
    pages: state.pages.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  addPage: (page) => set((state) => ({ 
    pages: [...state.pages, page],
    activePageId: page.type === 'page' ? page.id : state.activePageId,
    pageLayouts: {
        ...state.pageLayouts,
        [page.id]: { lg: [] }
    }
  })),
  duplicatePage: (id) => set((state) => {
      const getCopies = (pageId: string, newParentId?: string): { pages: Page[], layouts: Record<string, any> } => {
          const page = state.pages.find(p => p.id === pageId);
          if (!page) return { pages: [], layouts: {} };

          const newId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const newPage: Page = {
              ...page,
              id: newId,
              parentId: newParentId ?? page.parentId,
              name: newParentId ? page.name : `${page.name} Copy`,
              isHome: false,
          };

          const originalLayouts = state.pageLayouts[pageId] || { lg: [] };
          const newLayoutsMap: Record<string, GridItemData[]> = {};
          Object.keys(originalLayouts).forEach(bp => {
              newLayoutsMap[bp] = originalLayouts[bp].map(item => ({
                  ...item,
                  i: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              }));
          });

          let resultPages = [newPage];
          let resultLayouts = { [newId]: newLayoutsMap };

          const children = state.pages.filter(p => p.parentId === pageId);
          children.forEach(child => {
              const childCopies = getCopies(child.id, newId);
              resultPages = [...resultPages, ...childCopies.pages];
              resultLayouts = { ...resultLayouts, ...childCopies.layouts };
          });

          return { pages: resultPages, layouts: resultLayouts };
      };

      const { pages: newPages, layouts: newLayouts } = getCopies(id);

      return {
          pages: [...state.pages, ...newPages],
          pageLayouts: {
              ...state.pageLayouts,
              ...newLayouts
          }
      };
  }),
  deletePage: (id) => set((state) => {
    const { [id]: removed, ...remainingLayouts } = state.pageLayouts;
    return { 
        pages: state.pages.filter(p => p.id !== id && p.parentId !== id),
        activePageId: state.activePageId === id && state.pages.length > 1 
            ? state.pages.find(p => p.id !== id && p.type === 'page')?.id || ''
            : state.activePageId,
        pageLayouts: remainingLayouts
    };
  }),
  togglePageFolder: (id) => set((state) => ({
    pages: state.pages.map(p => p.id === id ? { ...p, isOpen: !p.isOpen } : p)
  })),
  reorderPages: (pages) => set({ pages }),

  // Data State - Single Source of Truth
  tables: INITIAL_TABLES,
  activeTableId: 'users',
  dataViewMode: 'DATA',
  schemas: INITIAL_SCHEMAS,
  records: INITIAL_RECORDS,
  setTables: (tables) => set({ tables }),
  setActiveTableId: (id) => set({ activeTableId: id }),
  setDataViewMode: (mode) => set({ dataViewMode: mode }),
  
  addTable: (table, schema, initialRecords) => set((state) => {
      const defaultView: DbView = {
          id: `view_${table.id}_default`,
          tableId: table.id,
          name: table.name,
          isDefault: true,
          config: { filters: [], sort: null, hiddenFields: [] }
      };

      const tableSchema: SchemaField[] = schema && schema.length > 0 ? schema : [
          { id: 'id', name: 'ID', type: 'serial', width: 60, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' }
      ];
      const tableRecords = initialRecords || [];

      const newSchemas = { ...state.schemas, [table.id]: tableSchema };
      const newRecords = { ...state.records, [table.id]: tableRecords };
      syncLegacyMockDb(newSchemas, newRecords);

      return { 
          tables: [...state.tables, table],
          views: [...state.views, defaultView],
          activeTableId: table.id,
          activeViewId: defaultView.id,
          schemas: newSchemas,
          records: newRecords
      };
  }),

  duplicateTable: (id) => set((state) => {
      const table = state.tables.find(t => t.id === id);
      if (!table) return {};

      const timestamp = Date.now();
      const newId = `${table.code}_copy_${timestamp}`;
      const newTable: DbTable = {
          ...table,
          id: newId,
          name: `${table.name} Copy`,
          code: `${table.code}_copy_${timestamp}`.substring(0, 50),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };

      // Clone Schema & Records purely in immutable state
      const sourceSchema = state.schemas[id] || [];
      const sourceRecords = state.records[id] || [];
      const clonedSchema = JSON.parse(JSON.stringify(sourceSchema));
      const clonedRecords = JSON.parse(JSON.stringify(sourceRecords));

      // Clone associated views
      const tableViews = state.views.filter(v => v.tableId === id);
      const newViews = tableViews.map((v, idx) => ({
          ...v,
          id: `view_${newId}_${timestamp}_${idx}`,
          tableId: newId,
          name: v.isDefault ? newTable.name : `${v.name} Copy`
      }));

      const newSchemas = { ...state.schemas, [newId]: clonedSchema };
      const newRecords = { ...state.records, [newId]: clonedRecords };
      syncLegacyMockDb(newSchemas, newRecords);

      return {
          tables: [...state.tables, newTable],
          views: [...state.views, ...newViews],
          schemas: newSchemas,
          records: newRecords,
          activeTableId: newId,
          activeViewId: newViews[0]?.id || null
      };
  }),
  
  updateTable: (id, updates) => set((state) => {
    const updatedTables = state.tables.map(t => t.id === id ? { ...t, ...updates } : t);
    
    let updatedViews = state.views;
    if (updates.name) {
        updatedViews = state.views.map(v => {
            if (v.tableId === id && v.isDefault) {
                return { ...v, name: updates.name! };
            }
            return v;
        });
    }

    return {
        tables: updatedTables,
        views: updatedViews
    };
  }),
  
  deleteTable: (id) => set((state) => {
      const { [id]: _removedSchema, ...remainingSchemas } = state.schemas;
      const { [id]: _removedRecords, ...remainingRecords } = state.records;
      delete MOCK_DB[id]; // Prevent memory leaks

      const nextTable = state.tables.find(t => t.id !== id);

      return {
          tables: state.tables.filter(t => t.id !== id),
          views: state.views.filter(v => v.tableId !== id),
          schemas: remainingSchemas,
          records: remainingRecords,
          activeTableId: state.activeTableId === id ? (nextTable?.id || '') : state.activeTableId
      };
  }),
  reorderTables: (tables) => set({ tables }),

  // Schema & Column Actions
  setTableSchema: (tableId, schema) => set((state) => {
      const newSchemas = { ...state.schemas, [tableId]: schema };
      syncLegacyMockDb(newSchemas, state.records);
      return { schemas: newSchemas };
  }),

  addTableColumn: (tableId, column) => set((state) => {
      const currentSchema = state.schemas[tableId] || [];
      const updatedSchema = [...currentSchema, column];
      const newSchemas = { ...state.schemas, [tableId]: updatedSchema };
      syncLegacyMockDb(newSchemas, state.records);
      return { schemas: newSchemas };
  }),

  updateTableColumn: (tableId, columnId, updates) => set((state) => {
      const currentSchema = state.schemas[tableId] || [];
      const updatedSchema = currentSchema.map(col => col.id === columnId ? { ...col, ...updates } : col);
      const newSchemas = { ...state.schemas, [tableId]: updatedSchema };
      syncLegacyMockDb(newSchemas, state.records);
      return { schemas: newSchemas };
  }),

  deleteTableColumn: (tableId, columnIdOrIds) => set((state) => {
      const idsToDelete = new Set(Array.isArray(columnIdOrIds) ? columnIdOrIds.map(String) : [String(columnIdOrIds)]);
      const currentSchema = state.schemas[tableId] || [];
      const updatedSchema = currentSchema.filter(col => !idsToDelete.has(String(col.id)));
      const newSchemas = { ...state.schemas, [tableId]: updatedSchema };
      syncLegacyMockDb(newSchemas, state.records);
      return { schemas: newSchemas };
  }),

  // Record Actions
  setTableRecords: (tableId, records) => set((state) => {
      const newRecords = { ...state.records, [tableId]: records };
      syncLegacyMockDb(state.schemas, newRecords);
      return { records: newRecords };
  }),

  addTableRecord: (tableId, record) => set((state) => {
      const currentRecords = state.records[tableId] || [];
      const maxId = Math.max(...currentRecords.map(r => Number(r.id) || 0), 0);
      const newRecord = { id: record.id || (maxId + 1), ...record };
      const updatedRecords = [...currentRecords, newRecord];
      const newRecords = { ...state.records, [tableId]: updatedRecords };
      syncLegacyMockDb(state.schemas, newRecords);
      return { records: newRecords };
  }),

  updateTableRecord: (tableId, recordId, updates) => set((state) => {
      const currentRecords = state.records[tableId] || [];
      const updatedRecords = currentRecords.map(rec => rec.id === recordId ? { ...rec, ...updates } : rec);
      const newRecords = { ...state.records, [tableId]: updatedRecords };
      syncLegacyMockDb(state.schemas, newRecords);
      return { records: newRecords };
  }),

  updateTableCell: (tableId, rowId, colId, value) => set((state) => {
      const currentRecords = state.records[tableId] || [];
      const updatedRecords = currentRecords.map(rec => rec.id === rowId ? { ...rec, [colId]: value } : rec);
      const newRecords = { ...state.records, [tableId]: updatedRecords };
      syncLegacyMockDb(state.schemas, newRecords);
      return { records: newRecords };
  }),

  deleteTableRecords: (tableId, recordIds) => set((state) => {
      const idsToDelete = new Set(recordIds.map(String));
      const currentRecords = state.records[tableId] || [];
      const updatedRecords = currentRecords.filter(rec => !idsToDelete.has(String(rec.id)));
      const newRecords = { ...state.records, [tableId]: updatedRecords };
      syncLegacyMockDb(state.schemas, newRecords);
      return { records: newRecords };
  }),

  reorderTableRecords: (tableId, activeId, overId) => set((state) => {
      const currentRecords = state.records[tableId] || [];
      const oldIndex = currentRecords.findIndex(r => String(r.id) === String(activeId));
      const newIndex = currentRecords.findIndex(r => String(r.id) === String(overId));
      if (oldIndex === -1 || newIndex === -1) return {};
      const reordered = arrayMove(currentRecords, oldIndex, newIndex);
      const newRecords = { ...state.records, [tableId]: reordered };
      syncLegacyMockDb(state.schemas, newRecords);
      return { records: newRecords };
  }),

  // View State
  views: INITIAL_VIEWS,
  activeViewId: INITIAL_VIEWS[0]?.id || null,
  setViews: (views) => set({ views }),
  addView: (view) => set((state) => ({ views: [...state.views, view], activeViewId: view.id })),
  updateView: (id, updates) => set((state) => ({
      views: state.views.map(v => v.id === id ? { ...v, ...updates } : v)
  })),
  deleteView: (id) => set((state) => ({
      views: state.views.filter(v => v.id !== id),
      activeViewId: state.activeViewId === id ? null : state.activeViewId
  })),
  duplicateView: (id) => set((state) => {
      const view = state.views.find(v => v.id === id);
      if (!view) return {};
      const newView: DbView = {
          ...view,
          id: `view_${view.tableId}_${Date.now()}`,
          name: `${view.name} Copy`,
          isDefault: false
      };
      return { views: [...state.views, newView] };
  }),
  setActiveViewId: (id) => set({ activeViewId: id }),

  // Layout State Implementation
  pageLayouts: INITIAL_PAGE_LAYOUTS,
  selectedComponentId: null,
  
  setLayouts: (newLayouts) => set((state) => ({
    pageLayouts: {
        ...state.pageLayouts,
        [state.activePageId]: newLayouts
    }
  })),
  
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),
  
  updateLayoutItem: (id, updates) => set((state) => {
    const currentPageLayouts = state.pageLayouts[state.activePageId] || { lg: [] };
    const newPageLayouts: Record<string, GridItemData[]> = {};
    
    Object.keys(currentPageLayouts).forEach(bp => {
        newPageLayouts[bp] = currentPageLayouts[bp].map(item => 
          item.i === id ? { ...item, ...updates } : item
        );
    });

    return { 
        pageLayouts: {
            ...state.pageLayouts,
            [state.activePageId]: newPageLayouts
        }
    };
  }),

  // App Builder Canvas Drag state
  draggedWidget: null,
  droppedWidget: null,
  setDraggedWidget: (draggedWidget) => set({ draggedWidget }),
  setDroppedWidget: (droppedWidget) => set({ droppedWidget }),

  // Editor Subsystem State & Operations
  files: INITIAL_FILES,
  tabs: [],
  editorActiveTabId: null,

  toggleFolder: (id) => set((state) => {
    const findAndToggle = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.map(node => {
        if (node.id === id && node.type === FileType.FOLDER) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: findAndToggle(node.children) };
        }
        return node;
      });
    };
    return { files: findAndToggle(state.files) };
  }),

  selectFile: (node) => set((state) => {
    if (node.type !== FileType.FILE) return {};
    const existingTab = state.tabs.find(t => t.fileId === node.id);
    if (existingTab) {
      return { editorActiveTabId: existingTab.id };
    }
    const newTab: Tab = {
      id: `tab-${node.id}`,
      fileId: node.id,
      title: node.name
    };
    return {
      tabs: [...state.tabs, newTab],
      editorActiveTabId: newTab.id
    };
  }),

  closeTab: (tabId) => set((state) => {
    const tabIndex = state.tabs.findIndex(t => t.id === tabId);
    const newTabs = state.tabs.filter(t => t.id !== tabId);
    let nextActiveId = state.editorActiveTabId;
    if (state.editorActiveTabId === tabId) {
      if (newTabs.length > 0) {
        const newActiveIndex = Math.max(0, tabIndex - 1);
        nextActiveId = newTabs[newActiveIndex].id;
      } else {
        nextActiveId = null;
      }
    }
    return { tabs: newTabs, editorActiveTabId: nextActiveId };
  }),

  updateFileContent: (content) => set((state) => {
    if (!state.editorActiveTabId) return {};
    const currentTab = state.tabs.find(t => t.id === state.editorActiveTabId);
    if (!currentTab) return {};

    const findAndUpdate = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.map(node => {
        if (node.id === currentTab.fileId) {
          return { ...node, content };
        }
        if (node.children) {
          return { ...node, children: findAndUpdate(node.children) };
        }
        return node;
      });
    };

    return { files: findAndUpdate(state.files) };
  }),

  setEditorActiveTabId: (id) => set({ editorActiveTabId: id }),
}));