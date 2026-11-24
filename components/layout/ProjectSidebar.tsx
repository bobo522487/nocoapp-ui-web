import React from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronsLeft,
  GitFork,
  ScrollText,
  Search,
  Sliders,
} from 'lucide-react';
import { useMatchRoute, useNavigate } from '@tanstack/react-router';
import { LineageTreePanel } from '../../features/project/components/LineageTreePanel';
import { ArticleTreePanel } from '../../features/project/components/ArticleTreePanel';
import { BookListPanel } from '../../features/books/components/BookListPanel';
import { useCommandPalette } from './CommandPaletteModal';
import { useProjectId } from '../../hooks/useProjectId';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';

interface ProjectSidebarProps {
  width: number;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ width }) => {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const activeProjectId = useProjectId();
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

  const isSettingsMode = Boolean(
    activeProjectId &&
      matchRoute({
        to: '/projects/$projectId/settings',
        params: { projectId: activeProjectId },
      })
  );
  const isLineageMode = Boolean(
    activeProjectId &&
      matchRoute({
        to: '/projects/$projectId/lineage',
        params: { projectId: activeProjectId },
      })
  );
  const isArticlesMode = Boolean(
    activeProjectId &&
      matchRoute({
        to: '/projects/$projectId/articles',
        params: { projectId: activeProjectId },
      })
  );
  const isBooksMode = Boolean(
    activeProjectId &&
      matchRoute({
        to: '/projects/$projectId/books',
        params: { projectId: activeProjectId },
      })
  );

  const sidebarTitle = isSettingsMode
    ? '家族配置'
    : isLineageMode
      ? '世系导航'
      : isArticlesMode
        ? '谱文导航'
        : isBooksMode
          ? '谱书目录'
          : '家族档案';

  const quickEntryItems: {
    label: string;
    desc: string;
    to:
      | '/projects/$projectId/lineage'
      | '/projects/$projectId/articles'
      | '/projects/$projectId/books'
      | '/projects/$projectId/settings';
    icon: React.ElementType;
  }[] = [
    {
      label: '世系图谱',
      desc: '支派树图与成员生平',
      to: '/projects/$projectId/lineage',
      icon: GitFork,
    },
    {
      label: '谱文编撰',
      desc: '谱序、凡例与人物传记',
      to: '/projects/$projectId/articles',
      icon: ScrollText,
    },
    {
      label: '谱书成册',
      desc: '分卷排版与阅览导出',
      to: '/projects/$projectId/books',
      icon: BookOpen,
    },
    {
      label: '家族设置',
      desc: '堂号、字辈与基本信息',
      to: '/projects/$projectId/settings',
      icon: Sliders,
    },
  ];

  return (
    <aside
      style={{ width }}
      data-testid="nc-sidebar"
      className="flex flex-col bg-background h-full shrink-0 border-r border-border select-none relative z-30"
    >
      {/* Sidebar Header (h-13 matching ProjectTopbar) */}
      <div
        data-testid="nc-sidebar-header"
        className="relative h-13 px-3.5 flex items-center justify-between gap-2 border-b border-border bg-[hsl(var(--surface-subtle))] shrink-0"
      >
        <span className="text-[14px] font-semibold text-foreground truncate">
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
            <div className="px-2 pb-1 text-[12px] font-semibold tracking-wider text-muted-foreground">
              配置项
            </div>
            <button
              type="button"
              onClick={() =>
                void navigate({
                  to: '/projects/$projectId/settings',
                  params: { projectId: activeProjectId },
                })
              }
              aria-current="page"
              className="w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-[13px] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer bg-[hsl(var(--surface-active))] text-foreground font-semibold border border-primary/20 shadow-[var(--shadow-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sliders size={14} className="shrink-0 text-primary" />
              <span>基本设置</span>
            </button>
          </div>
          <div className="p-4 text-[12px] text-muted-foreground leading-relaxed">
            在此可维护当前家族的名称、姓氏、始迁祖、堂号、所在地区与家族简介。
          </div>
        </div>
      ) : isLineageMode ? (
        <LineageTreePanel />
      ) : isArticlesMode ? (
        <ArticleTreePanel />
      ) : isBooksMode ? (
        <BookListPanel />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto py-3 px-2.5 space-y-5">
          {/* Family Archive Metadata Summary */}
          <div className="px-2.5 space-y-2.5">
            <div className="text-[12px] font-semibold tracking-wider text-muted-foreground">
              云谱档案概要
            </div>
            <div className="rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-3 text-[13px] text-foreground/90 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-[12px]">家族姓氏</span>
                <span className="truncate font-medium">
                  {activeProject?.primarySurname || '未设置'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-[12px]">始迁祖</span>
                <span className="truncate font-medium">
                  {activeProject?.ancestor || '未设置'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-[12px]">堂号</span>
                <span className="truncate font-medium">
                  {activeProject?.primaryName || '未设置'}
                </span>
              </div>
            </div>
          </div>

          {/* Contextual Quick Actions */}
          <div className="space-y-1 pt-3 border-t border-border/70">
            <div className="px-2.5 pb-1 text-[12px] font-semibold tracking-wider text-muted-foreground">
              快捷入口
            </div>
            {quickEntryItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: item.to,
                      params: { projectId: activeProjectId },
                    })
                  }
                  className="w-full px-2.5 py-2 rounded-lg flex items-center gap-2.5 text-left transition-colors duration-150 cursor-pointer border border-transparent hover:bg-[hsl(var(--surface-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
                >
                  <Icon
                    size={15}
                    className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">
                      {item.label}
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {item.desc}
                    </div>
                  </div>
                  <ArrowRight
                    size={13}
                    className="shrink-0 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default ProjectSidebar;
