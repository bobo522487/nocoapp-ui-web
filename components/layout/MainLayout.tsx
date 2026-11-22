import React, { useEffect } from 'react';
import { Outlet } from '@tanstack/react-router';
import Sidebar from './Sidebar';
import Header from './Header';
import ProjectMiniRail from './ProjectMiniRail';
import ProjectSidebar from './ProjectSidebar';
import ProjectTopbar from './ProjectTopbar';
import { CommandPaletteProvider } from './CommandPaletteModal';
import { useResizable } from '../../hooks/useResizable';
import { useRouteContext } from '../../hooks/useRouteContext';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const MainLayout: React.FC = () => {
  const { activeProjectId, isWorkspaceShell } = useRouteContext();
  const isProjectSidebarCollapsed = usePreferencesStore(
    (s) => s.isProjectSidebarCollapsed
  );
  const storedProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);

  useEffect(() => {
    if (!isWorkspaceShell && activeProjectId && activeProjectId !== storedProjectId) {
      setActiveProjectId(activeProjectId);
    }
  }, [isWorkspaceShell, activeProjectId, storedProjectId, setActiveProjectId]);

  useEffect(() => {
    if (!isWorkspaceShell) return;
    // 组织列表以 API 为唯一事实源；失败时 store 已清空模板假组织，页面各自展示错误态。
    void useWorkspaceStore.getState().hydrateFromApi().catch(() => {});
  }, [isWorkspaceShell]);

  const {
    width: wsSidebarWidth,
    isResizing: isResizingWsSidebar,
    startResizing: startResizingWsSidebar,
  } = useResizable({
    initialWidth: 256,
    minWidth: 210,
    maxWidth: 400,
    edge: 'left',
    leftOffset: 0,
  });

  const {
    width: projectSidebarWidth,
    isResizing: isResizingProjectSidebar,
    startResizing: startResizingProjectSidebar,
  } = useResizable({
    initialWidth: 252,
    minWidth: 200,
    maxWidth: 400,
    edge: 'left',
    leftOffset: 48,
  });

  const isResizing = isResizingWsSidebar || isResizingProjectSidebar;

  return (
    <CommandPaletteProvider>
      <div
        className={`flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-200 ${
          isResizing ? 'cursor-col-resize select-none' : ''
        }`}
      >
        {isWorkspaceShell ? (
          <>
            {/* Workspace Shell: 256px Workspace Sidebar + 56px Global Search Header */}
            <Sidebar width={wsSidebarWidth} />

            <div
              className="w-[1px] bg-transparent hover:bg-primary/60 cursor-col-resize z-40 relative transition-colors shrink-0"
              onMouseDown={startResizingWsSidebar}
            >
              <div className="absolute inset-y-0 -left-1 w-2.5 cursor-col-resize z-40" />
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <Header />

              <main className="flex-1 flex overflow-hidden relative bg-background min-w-0">
                <Outlet />
              </main>
            </div>
          </>
        ) : (
          <>
            {/* Project Shell: 48px Mini Rail + Collapsible Project Sidebar + 48px Breadcrumb Topbar */}
            <ProjectMiniRail />

            <ProjectSidebar width={projectSidebarWidth} />

            {!isProjectSidebarCollapsed && (
              <div
                className="w-[1px] bg-transparent hover:bg-primary/60 cursor-col-resize z-40 relative transition-colors shrink-0"
                onMouseDown={startResizingProjectSidebar}
              >
                <div className="absolute inset-y-0 -left-1 w-2.5 cursor-col-resize z-40" />
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <ProjectTopbar />

              <main className="flex-1 flex overflow-hidden relative bg-background min-w-0">
                <Outlet />
              </main>
            </div>
          </>
        )}
      </div>
    </CommandPaletteProvider>
  );
};

export default MainLayout;
