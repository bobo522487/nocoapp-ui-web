import React, { useEffect } from 'react';
import { Outlet } from '@tanstack/react-router';
import ProjectMiniRail from './ProjectMiniRail';
import ProjectSidebar from './ProjectSidebar';
import ProjectTopbar from './ProjectTopbar';
import { useResizable } from '../../hooks/useResizable';
import { useProjectId } from '../../hooks/useProjectId';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const ProjectShellLayout: React.FC = () => {
  const activeProjectId = useProjectId();
  const isProjectSidebarCollapsed = usePreferencesStore(
    (s) => s.isProjectSidebarCollapsed
  );
  const storedProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);

  useEffect(() => {
    if (activeProjectId && activeProjectId !== storedProjectId) {
      setActiveProjectId(activeProjectId);
    }
  }, [activeProjectId, storedProjectId, setActiveProjectId]);

  const {
    width: projectSidebarWidth,
    isResizing,
    startResizing,
  } = useResizable({
    initialWidth: 252,
    minWidth: 200,
    maxWidth: 400,
    edge: 'left',
    leftOffset: 48,
  });

  return (
    <div
      className={`flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-200 ${
        isResizing ? 'cursor-col-resize select-none' : ''
      }`}
    >
      <ProjectMiniRail />

      <ProjectSidebar width={projectSidebarWidth} />

      {!isProjectSidebarCollapsed && (
        <div
          className="w-[1px] bg-transparent hover:bg-primary/60 cursor-col-resize z-40 relative transition-colors shrink-0"
          onMouseDown={startResizing}
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
    </div>
  );
};

export default ProjectShellLayout;
