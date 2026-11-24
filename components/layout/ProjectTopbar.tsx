import React, { lazy, Suspense, useState } from 'react';
import { BarChart3, PanelLeftOpen } from 'lucide-react';
import { useMatchRoute } from '@tanstack/react-router';
import Breadcrumb from '../common/Breadcrumb';
import { Button } from '../ui/button';
import { useProjectId } from '../../hooks/useProjectId';
import { usePreferencesStore } from '../../store/usePreferencesStore';

const LineageStatsModal = lazy(() =>
  import('../../features/lineage/components/LineageStatsModal').then((m) => ({
    default: m.LineageStatsModal,
  }))
);

const ProjectTopbar: React.FC = () => {
  const matchRoute = useMatchRoute();
  const activeProjectId = useProjectId();

  const isCollapsed = usePreferencesStore((s) => s.isProjectSidebarCollapsed);
  const setCollapsed = usePreferencesStore((s) => s.setProjectSidebarCollapsed);

  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const showStatsButton = Boolean(
    activeProjectId &&
      (matchRoute({
        to: '/projects/$projectId/lineage',
        params: { projectId: activeProjectId },
      }) ||
        (!matchRoute({
          to: '/projects/$projectId/articles',
          params: { projectId: activeProjectId },
        }) &&
          !matchRoute({
            to: '/projects/$projectId/books',
            params: { projectId: activeProjectId },
          }) &&
          !matchRoute({
            to: '/projects/$projectId/settings',
            params: { projectId: activeProjectId },
          }) &&
          matchRoute({
            to: '/projects/$projectId',
            params: { projectId: activeProjectId },
          })))
  );

  return (
    <>
      <header
        data-testid="nc-table-topbar"
        className="h-13 w-full border-b border-border bg-background/95 backdrop-blur-xs flex items-center justify-between gap-3 px-4 shrink-0 z-20"
      >
        {/* Left: Sidebar Expand Toggle (when collapsed) + Unified Project Breadcrumb */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {isCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="展开侧边栏"
              aria-label="展开侧边栏"
              data-testid="nc-topbar-expand-sidebar"
              className="w-8 h-8 mr-1 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}

          <Breadcrumb />
        </div>

        {/* Right: Scoped Statistics button */}
        {showStatsButton && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsStatsOpen(true)}
              data-testid="nc-topbar-stats-btn"
              className="h-8 gap-1.5 px-2.5 text-[13px] font-medium whitespace-nowrap shrink-0"
            >
              <BarChart3 size={14} className="text-muted-foreground" />
              <span>统计</span>
            </Button>
          </div>
        )}
      </header>

      {isStatsOpen && (
        <Suspense fallback={null}>
          <LineageStatsModal
            open={isStatsOpen}
            projectId={activeProjectId}
            onClose={() => setIsStatsOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
};

export default ProjectTopbar;
