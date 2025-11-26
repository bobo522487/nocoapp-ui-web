

import { create } from 'zustand';
import { ViewMode, Page, GridItemData, DbTable, UserProfile } from '../types';

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
  deletePage: (id: string) => void;
  togglePageFolder: (id: string) => void;
  reorderPages: (pages: Page[]) => void;

  // Data State
  tables: DbTable[];
  activeTableId: string;
  setTables: (tables: DbTable[]) => void;
  setActiveTableId: (id: string) => void;
  addTable: (table: DbTable) => void;
  updateTable: (id: string, updates: Partial<DbTable>) => void;
  deleteTable: (id: string) => void;
  reorderTables: (tables: DbTable[]) => void;

  // App Builder / Layout State
  pageLayouts: Record<string, Record<string, GridItemData[]>>;
  selectedComponentId: string | null;
  
  setLayouts: (layouts: Record<string, GridItemData[]>) => void;
  setSelectedComponentId: (id: string | null) => void;
  updateLayoutItem: (id: string, updates: Partial<GridItemData>) => void;
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

const INITIAL_LAYOUT: GridItemData[] = [
  { i: 'stat1', x: 0, y: 0, w: 3, h: 3, type: 'stat', title: 'Total Revenue', content: { value: '$45,231.89', trend: '+20.1%' } },
  { i: 'stat2', x: 3, y: 0, w: 3, h: 3, type: 'stat', title: 'Subscriptions', content: { value: '+2350', trend: '+180.1%' } },
  { i: 'stat3', x: 6, y: 0, w: 3, h: 3, type: 'stat', title: 'Sales', content: { value: '+12,234', trend: '+19%' } },
  { i: 'chart1', x: 0, y: 3, w: 8, h: 8, type: 'chart', title: 'Revenue Overview', content: {} },
  { i: 'list1', x: 8, y: 3, w: 4, h: 8, type: 'table', title: 'Recent Sales', content: {} },
];

// Initial layouts per page
const INITIAL_PAGE_LAYOUTS: Record<string, Record<string, GridItemData[]>> = {
  'page-1': { lg: INITIAL_LAYOUT },
  'page-2': { lg: [] },
  'page-3': { lg: [] },
};

export const useAppStore = create<AppState>((set) => ({
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
        [page.id]: { lg: [] } // Initialize empty layout for new page
    }
  })),
  deletePage: (id) => set((state) => {
    // Remove layout data for deleted page
    const { [id]: removed, ...remainingLayouts } = state.pageLayouts;
    return { 
        pages: state.pages.filter(p => p.id !== id && p.parentId !== id), // Also remove children if it's a folder? For now simple delete.
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

  // Data State
  tables: INITIAL_TABLES,
  activeTableId: 'users',
  setTables: (tables) => set({ tables }),
  setActiveTableId: (id) => set({ activeTableId: id }),
  addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
  updateTable: (id, updates) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTable: (id) => set((state) => ({
      tables: state.tables.filter(t => t.id !== id),
      activeTableId: state.activeTableId === id && state.tables.length > 1
        ? state.tables.find(t => t.id !== id)?.id || ''
        : state.activeTableId
  })),
  reorderTables: (tables) => set({ tables }),

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
    
    // Update item across all breakpoints for the current page
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
}));