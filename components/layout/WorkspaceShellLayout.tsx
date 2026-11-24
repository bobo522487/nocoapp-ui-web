import React, { useEffect, useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import Sidebar from './Sidebar';
import Header from './Header';
import { useResizable } from '../../hooks/useResizable';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { errorMessage } from '../../lib/api';
import PageError from '../../features/dashboard/components/PageError';

const WorkspaceShellLayout: React.FC = () => {
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const hydrate = () => {
    setHydrateError(null);
    void useWorkspaceStore
      .getState()
      .hydrateFromApi()
      .catch((error: unknown) => {
        setHydrateError(errorMessage(error));
      });
  };

  useEffect(() => {
    hydrate();
  }, []);

  const {
    width: wsSidebarWidth,
    isResizing,
    startResizing,
  } = useResizable({
    initialWidth: 256,
    minWidth: 210,
    maxWidth: 400,
    edge: 'left',
    leftOffset: 0,
  });

  return (
    <div
      className={`flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-200 ${
        isResizing ? 'cursor-col-resize select-none' : ''
      }`}
    >
      <Sidebar width={wsSidebarWidth} />

      <div
        className="w-[1px] bg-transparent hover:bg-primary/60 cursor-col-resize z-40 relative transition-colors shrink-0"
        onMouseDown={startResizing}
      >
        <div className="absolute inset-y-0 -left-1 w-2.5 cursor-col-resize z-40" />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />

        <main className="flex-1 flex overflow-hidden relative bg-background min-w-0">
          {hydrateError ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <PageError message={hydrateError} onRetry={hydrate} />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

export default WorkspaceShellLayout;