import React from 'react';
import {
  BookOpen,
  ChevronsLeft,
  Compass,
  GitFork,
  ScrollText,
  Search,
  Sliders,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { ViewMode } from '../../types';
import { LineageTreePanel } from '../../features/project/components/LineageTreePanel';
import { ArticleTreePanel } from '../../features/project/components/ArticleTreePanel';
import { BookListPanel } from '../../features/books/components/BookListPanel';
import { useCommandPalette } from './CommandPaletteModal';
import { useRouteContext } from '../../hooks/useRouteContext';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';

interface ProjectSidebarProps {
  width: number;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ width }) => {
  const navigate = useNavigate();
  const { activeView, activeProjectId } = useRouteContext();
  const { openPalette } = useCommandPalette();

  const isCollapsed = usePreferencesStore((s) => s.isProjectSidebarCollapsed);
  const setCollapsed = usePreferencesStore((s) => s.setProjectSidebarCollapsed);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);

  const workspaceProjects = projects.filter(
    (p) => p.workspaceId === activeWorkspaceId
  );
  const activeProject =
    projects.find((p) => p.id === activeProjectId) ||
    workspaceProjects[0] ||
    projects[0];

  if (isCollapsed) {
    return null;
  }

  const isSettingsMode = activeView === ViewMode.PROJECT_SETTINGS;

  const sidebarTitle = isSettingsMode
    ? '家族配置'
    : activeView === ViewMode.LINEAGE
      ? '世系导航'
      : activeView === ViewMode.ARTICLES
        ? '谱文导航'
        : activeView === ViewMode.BOOKS
          ? '谱书管理列表'
          : '家族工作台';

  const moduleItems: {
    id: ViewMode;
    label: string;
    to:
      | '/projects/$projectId'
      | '/projects/$projectId/lineage'
      | '/projects/$projectId/articles'
      | '/projects/$projectId/books';
    icon: React.ElementType;
  }[] = [
    {
      id: ViewMode.PROJECT_HOME,
      label: '概览',
      to: '/projects/$projectId',
      icon: Compass,
    },
    {
      id: ViewMode.LINEAGE,
      label: '世系',
      to: '/projects/$projectId/lineage',
      icon: GitFork,
    },
    {
      id: ViewMode.ARTICLES,
      label: '谱文',
      to: '/projects/$projectId/articles',
      icon: ScrollText,
    },
    {
      id: ViewMode.BOOKS,
      label: '谱书',
      to: '/projects/$projectId/books',
      icon: BookOpen,
    },
  ];

  const sectionSubOutline: Record<string, string[]> = {
    [ViewMode.LINEAGE]: ['世系总图', '房支管理', '成员名录'],
    [ViewMode.ARTICLES]: ['谱序与凡例', '源流与家训', '传记与艺文'],
    [ViewMode.BOOKS]: ['封面与题签', '分卷目录', '版式与印制'],
  };

  const currentOutline = sectionSubOutline[activeView] || [];

  return (
    <aside
      style={{ width }}
      data-testid="nc-sidebar"
      className="flex flex-col bg-background h-full shrink-0 border-r border-border select-none relative z-30"
    >
      {/* Sidebar Header (h-12 matching ProjectTopbar) */}
      <div
        data-testid="nc-sidebar-header"
        className="relative h-12 px-3.5 flex items-center justify-between gap-2 border-b border-border bg-[hsl(var(--surface-subtle))] shrink-0"
      >
        <span className="font-editorial text-[14px] font-semibold text-foreground truncate">
          {sidebarTitle}
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => openPalette()}
            title="快速搜索 (Ctrl K)"
            aria-label="快速搜索"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="隐藏侧边栏"
            aria-label="隐藏侧边栏"
            data-testid="nc-sidebar-collapse-btn"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronsLeft size={15} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isSettingsMode ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="px-2.5 py-3 space-y-1 border-b border-border shrink-0">
            <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground">
              家族配置
            </div>
            <button
              type="button"
              onClick={() =>
                void navigate({
                  to: '/projects/$projectId/settings',
                  params: { projectId: activeProjectId },
                })
              }
              className={`w-full h-8.5 px-2.5 rounded-lg flex items-center gap-2.5 text-[13px] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeView === ViewMode.PROJECT_SETTINGS
                  ? 'bg-[hsl(var(--surface-active))] text-foreground font-semibold border border-primary/20 shadow-[var(--shadow-control)]'
                  : 'text-foreground/80 font-medium border border-transparent hover:bg-[hsl(var(--surface-hover))]'
              }`}
            >
              <Sliders size={14} className="shrink-0 text-primary" />
              <span>基本设置</span>
            </button>
          </div>
          <div className="p-4 text-[12px] text-muted-foreground leading-relaxed">
            在此可维护当前家族的名称、姓氏、始迁祖、堂号、所在地区与家族简介。
          </div>
        </div>
      ) : activeView === ViewMode.LINEAGE ? (
        <LineageTreePanel />
      ) : activeView === ViewMode.ARTICLES ? (
        <ArticleTreePanel />
      ) : activeView === ViewMode.BOOKS ? (
        <BookListPanel />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto py-3 px-2.5 space-y-5">
          {/* Core Modules Navigation */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground">
              工作台模块
            </div>
            {moduleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: item.to,
                      params: { projectId: activeProjectId },
                    })
                  }
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full h-8.5 px-2.5 rounded-lg flex items-center gap-2.5 text-[13px] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'bg-[hsl(var(--surface-active))] text-foreground font-semibold border border-primary/20 shadow-[var(--shadow-control)]'
                      : 'text-foreground/80 font-medium border border-transparent hover:bg-[hsl(var(--surface-hover))] hover:text-foreground'
                  }`}
                >
                  <Icon
                    size={15}
                    className={`shrink-0 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="flex-1 text-left truncate">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contextual Module Outline */}
          {currentOutline.length > 0 && (
            <div className="space-y-1 pt-3 border-t border-border/70">
              <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground">
                模块目录
              </div>
              {currentOutline.map((title, idx) => (
                <div
                  key={title}
                  className="px-2.5 py-1.5 rounded-md text-[12px] text-muted-foreground flex items-center gap-2"
                >
                  <span className="font-mono tabular-nums text-[11px] text-muted-foreground/75">
                    0{idx + 1}.
                  </span>
                  <span className="truncate">{title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Project Metadata Summary */}
          <div className="mt-auto pt-3 border-t border-border/70 px-2.5 space-y-2">
            <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">
              云谱档案概要
            </div>
            <div className="text-[12px] text-foreground/85 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">家族姓氏</span>
                <span className="truncate font-medium">
                  {activeProject?.primarySurname || '未设置'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">始迁祖</span>
                <span className="truncate font-medium">
                  {activeProject?.ancestor || '未设置'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">堂号</span>
                <span className="truncate font-medium">
                  {activeProject?.primaryName || '未设置'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ProjectSidebar;
