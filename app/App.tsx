
import React, { useState, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useLocation, Outlet } from 'react-router-dom';
import ActivityBar from '../components/layout/ActivityBar';
import Sidebar from '../components/layout/Sidebar';
import Editor from '../features/editor/components/Editor';
import DataPage from '../features/data-modeler/pages/DataPage';
import DataSourcePage from '../features/datasource/pages/DataSourcePage';
import PostgreSQLPage from '../features/datasource/pages/PostgreSQLPage';
import Header from '../components/layout/Header';
import AppBuilderPage from '../features/app-builder/pages/AppBuilderPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import { INITIAL_FILES } from '../constants';
import { FileSystemNode, FileType, ViewMode, Tab, SchemaField } from '../types';
import { useResizable } from '../hooks/useResizable';
import { useAppStore } from '../store/useAppStore';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  DragStartEvent, 
  DragEndEvent 
} from '@dnd-kit/core';

// --- Route Wrappers for State Sync ---

const DashboardRoute = () => {
  const { setActiveView } = useAppStore();
  useEffect(() => {
    setActiveView(ViewMode.HOME);
  }, [setActiveView]);
  return <DashboardPage />;
};

const AppBuilderRoute = ({ draggedItem, droppedItem, onItemConsumed }: any) => {
  const { appId, pageId } = useParams();
  const { setActiveView, setActivePageId } = useAppStore();

  useEffect(() => {
    setActiveView(ViewMode.APPS);
    if (pageId) setActivePageId(pageId);
  }, [appId, pageId, setActiveView, setActivePageId]);

  return (
    <AppBuilderPage 
      draggedItem={draggedItem}
      droppedItem={droppedItem} 
      onItemConsumed={onItemConsumed}
    />
  );
};

const DataRoute = () => {
  const { tableId } = useParams();
  const { setActiveView, setActiveTableId } = useAppStore();

  useEffect(() => {
    setActiveView(ViewMode.DATA);
    if (tableId) setActiveTableId(tableId);
  }, [tableId, setActiveView, setActiveTableId]);

  return <DataPage />;
};

const DataSourceRoute = () => {
    const { setActiveView } = useAppStore();
    useEffect(() => {
        setActiveView(ViewMode.DATASOURCE);
    }, [setActiveView]);
    return <DataSourcePage />;
};

const PostgreSQLRoute = () => {
    const { setActiveView } = useAppStore();
    useEffect(() => {
        setActiveView(ViewMode.DATASOURCE);
    }, [setActiveView]);
    return <PostgreSQLPage />;
};

const EditorRoute = ({ tabs, activeTabId, activeFileContent, onCloseTab, onSelectTab, onContentChange }: any) => {
    const { setActiveView } = useAppStore();
    useEffect(() => {
        setActiveView(ViewMode.SETTINGS); // reusing Settings view mode for File Editor context
    }, [setActiveView]);

    return (
        <Editor 
            tabs={tabs}
            activeTabId={activeTabId}
            activeFileContent={activeFileContent}
            onCloseTab={onCloseTab}
            onSelectTab={onSelectTab}
            onContentChange={onContentChange}
        />
    );
};

// --- Main Layout Component ---

const MainLayout: React.FC<{ 
  sidebarProps: any, 
  sidebarWidth: number, 
  startResizingSidebar: any, 
  isResizingSidebar: boolean 
}> = ({ sidebarProps, sidebarWidth, startResizingSidebar, isResizingSidebar }) => {
  const location = useLocation();
  const { activeView } = useAppStore();
  const isHome = activeView === ViewMode.HOME;
  // The main content area is handled by the routes themselves (e.g. DataSourcePage)
  // If we want full width for the catalog, we can hide the sidebar, but the user asked for a sidebar in the prompt.
  // "left sidebar display Data sources list; content area use the page just created"
  // So we show sidebar for DATASOURCE view mode.

  return (
    <div className={`flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-200 ${isResizingSidebar ? 'cursor-col-resize select-none' : ''}`}>
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <ActivityBar />
          
          {/* Sidebar - Hidden on Home View */}
          {!isHome && (
            <>
              <Sidebar 
                  {...sidebarProps}
                  width={sidebarWidth}
              />
              <div
                  className="w-[1px] bg-border hover:bg-primary cursor-col-resize z-50 relative transition-colors"
                  onMouseDown={startResizingSidebar}
              >
                 <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize z-50" />
              </div>
            </>
          )}
          
          {/* Content Area */}
          <main className="flex-1 flex overflow-hidden relative bg-background min-w-0">
             <Outlet />
          </main>
        </div>
    </div>
  );
};

const App: React.FC = () => {
  // State from Zustand Store
  const { isDarkMode, theme, pages, activeTableId } = useAppStore();

  // Local State
  const [files, setFiles] = useState<FileSystemNode[]>(INITIAL_FILES);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  
  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [droppedItem, setDroppedItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Use custom hook for Left Sidebar Resizing
  const { 
    width: sidebarWidth, 
    isResizing: isResizingSidebar, 
    startResizing: startResizingSidebar 
  } = useResizable({
    initialWidth: 260,
    minWidth: 180,
    maxWidth: 480,
    edge: 'left',
    leftOffset: 56 // Width of ActivityBar
  });

  // Initialize Theme (using store value)
  useEffect(() => {
    const root = document.documentElement;
    
    // Handle Dark Mode
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Handle Themes
    root.classList.remove('theme-slack', 'theme-supabase', 'theme-vscode', 'theme-vercel');
    if (theme && theme !== 'vercel') {
        root.classList.add(`theme-${theme}`);
    }
  }, [isDarkMode, theme]);

  // Helper to find node by ID (recursive)
  const findNode = useCallback((nodes: FileSystemNode[], id: string): FileSystemNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper to update node (recursive)
  const updateNode = (nodes: FileSystemNode[], id: string, updates: Partial<FileSystemNode>): FileSystemNode[] => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, ...updates };
      if (node.children) return { ...node, children: updateNode(node.children, id, updates) };
      return node;
    });
  };

  const handleToggleFolder = (id: string) => {
    const node = findNode(files, id);
    if (node && node.type === FileType.FOLDER) {
      setFiles(prev => updateNode(prev, id, { isOpen: !node.isOpen }));
    }
  };

  const handleSelectFile = (node: FileSystemNode) => {
    if (node.type === FileType.FILE) {
      const existingTab = tabs.find(t => t.fileId === node.id);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: Tab = {
          id: `tab-${node.id}`,
          fileId: node.id,
          title: node.name
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newActiveIndex = Math.max(0, tabIndex - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!activeTabId) return;
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) {
        setFiles(prev => updateNode(prev, currentTab.fileId, { content: newContent }));
    }
  };

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && over.id === 'canvas-droppable') {
      setDroppedItem({
        ...active.data.current,
        id: `widget-${Date.now()}`
      });
    }
    setDraggedItem(null);
  };

  // Derived state for editor
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeFileNode = activeTab ? findNode(files, activeTab.fileId) : null;
  const activeContent = activeFileNode?.content || '';

  const sidebarProps = {
      files,
      onToggleFolder: handleToggleFolder,
      onSelectFile: handleSelectFile,
      selectedFileId: activeTab?.fileId || null,
  };

  // Default Redirects
  const defaultPageId = pages[0]?.id || 'page-1';
  const defaultTableId = 'users';

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <HashRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Main App Routes */}
          <Route element={
            <MainLayout 
                sidebarProps={sidebarProps} 
                sidebarWidth={sidebarWidth} 
                startResizingSidebar={startResizingSidebar} 
                isResizingSidebar={isResizingSidebar} 
            />
          }>
             <Route path="/" element={<DashboardRoute />} />
             
             {/* App Builder Routes */}
             <Route path="/apps" element={<Navigate to={`/apps/default-app/pages/${defaultPageId}`} replace />} />
             <Route path="/apps/:appId" element={<Navigate to={`/apps/default-app/pages/${defaultPageId}`} replace />} />
             <Route path="/apps/:appId/pages/:pageId" element={
                 <AppBuilderRoute 
                    draggedItem={draggedItem} 
                    droppedItem={droppedItem} 
                    onItemConsumed={() => setDroppedItem(null)} 
                 />
             } />

             {/* Data Modeler Routes */}
             <Route path="/data" element={<Navigate to={`/data/${defaultTableId}`} replace />} />
             <Route path="/data/new" element={<Navigate to={`/datasources`} replace />} />
             <Route path="/data/:tableId" element={<DataRoute />} />

             {/* Datasource Routes */}
             <Route path="/datasources" element={<DataSourceRoute />} />
             <Route path="/datasources/postgresql" element={<PostgreSQLRoute />} />
             <Route path="/datasources/postgresql/:id" element={<PostgreSQLRoute />} />

             {/* Editor/Settings Route */}
             <Route path="/files" element={
                 <EditorRoute 
                    tabs={tabs}
                    activeTabId={activeTabId}
                    activeFileContent={activeContent}
                    onCloseTab={handleCloseTab}
                    onSelectTab={setActiveTabId}
                    onContentChange={handleContentChange}
                 />
             } />

             {/* Fallback */}
             <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>

      {/* Drag Overlay for Visual Feedback */}
      <DragOverlay>
        {draggedItem ? (
          <div className="opacity-80 pointer-events-none transform scale-105 cursor-grabbing">
             <div className="flex flex-col items-center justify-center p-2 rounded-md border bg-card shadow-xl w-20 h-20">
                {draggedItem.icon && <draggedItem.icon size={24} className="text-primary mb-1" />}
                <span className="text-[10px] font-medium text-foreground">{draggedItem.name}</span>
             </div>
          </div>
        ) : null}
      </DragOverlay>

    </DndContext>
  );
};

export default App;
