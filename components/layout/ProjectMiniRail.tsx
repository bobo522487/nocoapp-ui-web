import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCheck,
  GitFork,
  Home,
  ScrollText,
  Settings,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { ViewMode } from '../../types';
import { WorkspaceLogoIcon } from '../common/NocoIcons';
import UserAvatarMenu from './UserAvatarMenu';
import { useRouteContext } from '../../hooks/useRouteContext';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const ProjectMiniRail: React.FC = () => {
  const navigate = useNavigate();
  const { activeView, activeProjectId } = useRouteContext();

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const notifications = useWorkspaceStore((s) => s.notifications);
  const markNotificationRead = useWorkspaceStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useWorkspaceStore(
    (s) => s.markAllNotificationsRead
  );

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const isHomeActive = activeView === ViewMode.PROJECT_HOME;
  const isLineageActive = activeView === ViewMode.LINEAGE;
  const isArticlesActive = activeView === ViewMode.ARTICLES;
  const isBooksActive = activeView === ViewMode.BOOKS;
  const isSettingsActive = activeView === ViewMode.PROJECT_SETTINGS;

  const railButtonClass = (active: boolean) =>
    `w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active
        ? 'bg-[hsl(var(--surface-active))] text-primary border border-primary/25 shadow-[var(--shadow-control)]'
        : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-[hsl(var(--surface-hover))]'
    }`;

  return (
    <nav
      aria-label="家族工作台导航"
      data-testid="nc-mini-sidebar-v2"
      className="w-12 h-full shrink-0 border-r border-border bg-[hsl(var(--surface-subtle))] flex flex-col items-center justify-between py-2 select-none z-40 relative"
    >
      {/* Top: Back to Workspace Logo + Main Cloud Genealogy Modules */}
      <div className="flex flex-col items-center w-full gap-1.5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          title={`返回工作区：${activeWorkspace?.name || '个人空间'}`}
          aria-label={`返回工作区：${activeWorkspace?.name || '个人空间'}`}
          data-testid="nc-rail-logo"
          className="group w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--surface-hover))] transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="transition-opacity duration-150 group-hover:opacity-0 flex items-center justify-center">
            <WorkspaceLogoIcon className="w-6 h-6" />
          </span>
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-foreground">
            <ArrowLeft size={16} strokeWidth={1.8} />
          </span>
        </button>

        <div className="w-6 h-px bg-border my-0.5" />

        {/* 概览 */}
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId',
              params: { projectId: activeProjectId },
            })
          }
          title="概览"
          aria-label="概览"
          data-panel="home"
          data-testid="nc-rail-home-btn"
          aria-current={isHomeActive ? 'page' : undefined}
          className={railButtonClass(isHomeActive)}
        >
          <Home size={17} strokeWidth={1.75} />
        </button>

        {/* 世系 */}
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId/lineage',
              params: { projectId: activeProjectId },
            })
          }
          title="世系"
          aria-label="世系"
          data-panel="lineage"
          aria-current={isLineageActive ? 'page' : undefined}
          className={railButtonClass(isLineageActive)}
        >
          <GitFork size={17} strokeWidth={1.75} />
        </button>

        {/* 谱文 */}
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId/articles',
              params: { projectId: activeProjectId },
            })
          }
          title="谱文"
          aria-label="谱文"
          data-panel="articles"
          aria-current={isArticlesActive ? 'page' : undefined}
          className={railButtonClass(isArticlesActive)}
        >
          <ScrollText size={17} strokeWidth={1.75} />
        </button>

        {/* 谱书 */}
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId/books',
              params: { projectId: activeProjectId },
            })
          }
          title="谱书"
          aria-label="谱书"
          data-panel="books"
          aria-current={isBooksActive ? 'page' : undefined}
          className={railButtonClass(isBooksActive)}
        >
          <BookOpen size={17} strokeWidth={1.75} />
        </button>

        <div className="w-6 h-px bg-border my-0.5" />

        {/* 家族设置 */}
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId/settings',
              params: { projectId: activeProjectId },
            })
          }
          title="设置"
          aria-label="设置"
          data-panel="settings"
          aria-current={isSettingsActive ? 'page' : undefined}
          className={railButtonClass(isSettingsActive)}
        >
          <Settings size={17} strokeWidth={1.75} />
        </button>
      </div>

      {/* Bottom: Activity Notifications + User Avatar Menu */}
      <div className="flex flex-col items-center w-full gap-1.5">
        <div className="w-6 h-px bg-border my-0.5" />

        <div
          ref={notifContainerRef}
          className="relative flex items-center justify-center"
        >
          <button
            type="button"
            onClick={() => setIsNotifOpen((v) => !v)}
            title={unreadCount > 0 ? `活动通知 (${unreadCount} 条未读)` : '活动通知'}
            aria-label={unreadCount > 0 ? `活动通知，${unreadCount} 条未读` : '活动通知'}
            aria-expanded={isNotifOpen}
            data-panel="notification"
            data-testid="nc-home-sidebar-notification"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isNotifOpen
                ? 'bg-[hsl(var(--surface-active))] text-foreground border border-primary/25 shadow-[var(--shadow-control)]'
                : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-[hsl(var(--surface-hover))]'
            }`}
          >
            <Bell size={17} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-semibold tabular-nums flex items-center justify-center leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute bottom-0 left-full ml-2 w-[316px] rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] z-[85] overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-[hsl(var(--surface-subtle))]">
                <span className="text-xs font-semibold text-foreground tabular-nums">
                  活动通知 · {unreadCount} 未读
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    <CheckCheck size={12} /> 全部已读
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    暂无活动消息
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className={`w-full text-left px-3.5 py-2.5 cursor-pointer hover:bg-[hsl(var(--surface-hover))] transition-colors ${
                        !n.read ? 'bg-accent/35' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground truncate">
                          {n.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0 font-mono tabular-nums">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {n.description}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <UserAvatarMenu variant="rail" />
      </div>
    </nav>
  );
};

export default ProjectMiniRail;
