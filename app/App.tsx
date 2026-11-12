import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
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
import { ViewMode } from '../types';
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

// --- Declarative Route Wrappers for State Sync ---

const DashboardRoute: React.FC = () => {
  const { setActiveView } = useAppStore();
  useEffect(() => {
    setActiveView(ViewMode.HOME);
  }, [setActiveView]);
  return <DashboardPage />;
};

const AppBuilderRoute: React.FC = () => {
  const { pageId } = useParams();
  const { setActiveView, setActivePageId } = useAppStore();

  useEffect(() => {
    setActiveView(ViewMode.APPS);
    if (pageId) setActivePageId(pageId);
  }, [pageId, setActiveView, setActivePageId]);

  return <AppBuilderPage />;
};

const DataRoute: React.FC = () => {
  const { tableId } = useParams();
  const { setActiveView, setActiveTableId } = useAppStore();

  useEffect(() => {
    setActiveView(ViewMode.DATA);
    if (tableId) setActiveTableId(tableId);
  }, [tableId, setActiveView, setActiveTableId]);

  return <DataPage />;
};

const DataSourceRoute: React.FC = () => {
  const { setActiveView } = useAppStore();
  useEffect(() => {
    setActiveView(ViewMode.DATASOURCE);
  }, [setActiveView]);
  return <DataSourcePage />;
};

const PostgreSQLRoute: React.FC = () => {
  const { setActiveView } = useAppStore();
  useEffect(() => {
    setActiveView(ViewMode.DATASOURCE);
  }, [setActiveView]);
  return <PostgreSQLPage />;
};

const EditorRoute: React.FC = () => {
  const { setActiveView } = useAppStore();
  useEffect(() => {
    setActiveView(ViewMode.SETTINGS);
  }, [setActiveView]);

  return <Editor />;
};

// --- Scoped Main Layout with Localized DnD Support ---

const MainLayout: React.FC = () => {
  const { activeView, draggedWidget, setDraggedWidget, setDroppedWidget } = useAppStore();
  const isHome = activeView === ViewMode.HOME;
  const isAppBuilder = activeView === ViewMode.APPS;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const { 
    width: sidebarWidth, 
    isResizing: isResizingSidebar, 
    startResizing: startResizingSidebar 
  } = useResizable({
    initialWidth: 260,
    minWidth: 180,
    maxWidth: 480,
    edge: 'left',
    leftOffset: 56
  });

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedWidget(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && over.id === 'canvas-droppable') {
      setDroppedWidget({
        ...active.data.current,
        id: `widget-${Date.now()}`
      });
    }
    setDraggedWidget(null);
  };

  const layoutContent = (
    <div className={`flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-200 ${isResizingSidebar ? 'cursor-col-resize select-none' : ''}`}>
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <ActivityBar />
          
          {!isHome && (
            <>
              <Sidebar width={sidebarWidth} />
              <div
                  className="w-[1px] bg-border hover:bg-primary cursor-col-resize z-50 relative transition-colors"
                  onMouseDown={startResizingSidebar}
              >
                 <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize z-50" />
              </div>
            </>
          )}
          
          <main className="flex-1 flex overflow-hidden relative bg-background min-w-0">
             <Outlet />
          </main>
        </div>

        {/* Drag Overlay for App Builder Canvas */}
        <DragOverlay>
          {draggedWidget ? (
            <div className="opacity-80 pointer-events-none transform scale-105 cursor-grabbing">
               <div className="flex flex-col items-center justify-center p-2 rounded-md border bg-card shadow-xl w-20 h-20">
                  {draggedWidget.icon && <draggedWidget.icon size={24} className="text-primary mb-1" />}
                  <span className="text-[10px] font-medium text-foreground">{draggedWidget.name}</span>
               </div>
            </div>
          ) : null}
        </DragOverlay>
    </div>
  );

  // Only mount DndContext when in App Builder view to prevent event overhead and collisions on other views
  if (isAppBuilder) {
    return (
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        {layoutContent}
      </DndContext>
    );
  }

  return layoutContent;
};

const App: React.FC = () => {
  const { isDarkMode, theme, pages } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.classList.remove('theme-slack', 'theme-supabase', 'theme-vscode', 'theme-vercel');
    if (theme && theme !== 'vercel') {
        root.classList.add(`theme-${theme}`);
    }
  }, [isDarkMode, theme]);

  const defaultPageId = pages[0]?.id || 'page-1';
  const defaultTableId = 'users';

  return (
    <HashRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Main Application Routes */}
        <Route element={<MainLayout />}>
           <Route path="/" element={<DashboardRoute />} />
           
           {/* App Builder */}
           <Route path="/apps" element={<Navigate to={`/apps/default-app/pages/${defaultPageId}`} replace />} />
           <Route path="/apps/:appId" element={<Navigate to={`/apps/default-app/pages/${defaultPageId}`} replace />} />
           <Route path="/apps/:appId/pages/:pageId" element={<AppBuilderRoute />} />

           {/* Data Modeler */}
           <Route path="/data" element={<Navigate to={`/data/${defaultTableId}`} replace />} />
           <Route path="/data/new" element={<Navigate to={`/datasources`} replace />} />
           <Route path="/data/:tableId" element={<DataRoute />} />

           {/* Datasources */}
           <Route path="/datasources" element={<DataSourceRoute />} />
           <Route path="/datasources/postgresql" element={<PostgreSQLRoute />} />
           <Route path="/datasources/postgresql/:id" element={<PostgreSQLRoute />} />

           {/* Code Editor */}
           <Route path="/files" element={<EditorRoute />} />

           {/* Fallback */}
           <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
