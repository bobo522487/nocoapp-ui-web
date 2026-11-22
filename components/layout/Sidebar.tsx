import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronsUpDown,
  Home,
  Users,
  Settings,
  Check,
  Plus,
  Search,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { ViewMode } from '../../types';
import CreateWorkspaceDialog from '../../features/workspace/components/CreateWorkspaceDialog';
import UserAvatarMenu from './UserAvatarMenu';
import { ProjectLayersOutlineIcon, WorkspaceLogoIcon } from '../common/NocoIcons';
import { useRouteContext } from '../../hooks/useRouteContext';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { errorMessage } from '../../lib/api';
import {
  createOrganizationRequest,
  fetchOrganization,
} from '../../features/dashboard/api';

interface SidebarProps {
  width: number;
}

const Sidebar: React.FC<SidebarProps> = ({ width }) => {
  const navigate = useNavigate();
  const { activeView, isWorkspaceShell } = useRouteContext();

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const user = useAuthStore((s) => s.user);

  // 侧栏计数以组织详情 API 为准（SC-001 数字一致性），不读模板种子数据。
  const [orgCounts, setOrgCounts] = useState({ projects: 0, members: 0 });
  const [switchError, setSwitchError] = useState<string | null>(null);

  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [wsSearch, setWsSearch] = useState('');
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const wsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        wsDropdownRef.current &&
        !wsDropdownRef.current.contains(e.target as Node)
      ) {
        setIsWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    if (!isWorkspaceShell || !activeWorkspaceId) return;
    let cancelled = false;
    fetchOrganization(activeWorkspaceId)
      .then((result) => {
        if (cancelled) return;
        setOrgCounts({
          projects: result.organization.projectCount,
          members: result.organization.memberCount,
        });
      })
      .catch(() => {
        if (!cancelled) setOrgCounts({ projects: 0, members: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [isWorkspaceShell, activeWorkspaceId]);

  const orgNameSuggestions = useMemo(() => {
    const list: string[] = [];
    if (user?.name) list.push(`${user.name}的工作室`);
    const prefix = user?.email?.split('@')[0];
    if (prefix) list.push(`${prefix}的谱牒空间`);
    return list.slice(0, 2);
  }, [user]);

  /** 切换即记住（spec FR-007）：调 activate 后刷新当前上下文。 */
  const handleSwitchOrganization = async (workspaceId: string) => {
    setSwitchError(null);
    try {
      await useWorkspaceStore.getState().setCurrentOrganization(workspaceId);
      setIsWsDropdownOpen(false);
    } catch (error) {
      setSwitchError(errorMessage(error));
    }
  };

  /** 创建组织（spec FR-016）：API 创建 → 刷新列表 → 自动成为当前组织。 */
  const handleCreateOrganization = async (name: string) => {
    const created = await createOrganizationRequest(name);
    const store = useWorkspaceStore.getState();
    await store.hydrateFromApi();
    await useWorkspaceStore
      .getState()
      .setCurrentOrganization(created.organization.id);
    setIsWsDropdownOpen(false);
    navigate({ to: '/home' });
  };

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(wsSearch.toLowerCase())
  );

  // NocoDB Pure Workspace Navigation Mode
  if (isWorkspaceShell) {
    const navItems: {
      id: ViewMode;
      label: string;
      path: '/' | '/home' | '/members' | '/settings';
      icon: React.ReactNode;
      count?: number;
    }[] = [
      {
        id: ViewMode.HOME,
        label: '首页',
        path: '/home',
        icon: <Home size={16} strokeWidth={1.5} />,
      },
      {
        id: ViewMode.PROJECTS,
        label: '家族',
        path: '/',
        icon: <ProjectLayersOutlineIcon className="w-4 h-4" />,
        count: orgCounts.projects,
      },
      {
        id: ViewMode.MEMBERS,
        label: '成员',
        path: '/members',
        icon: <Users size={16} strokeWidth={1.5} />,
        count: orgCounts.members,
      },
      {
        id: ViewMode.WORKSPACE_SETTINGS,
        label: '设置',
        path: '/settings',
        icon: <Settings size={16} strokeWidth={1.5} />,
      },
    ];

    return (
      <>
        <aside
          style={{ width }}
          className="flex flex-col bg-[hsl(var(--surface-subtle))] h-full shrink-0 border-r border-border select-none relative z-30"
        >
          {/* Top Workspace Switcher (h-14) */}
          <div
            ref={wsDropdownRef}
            className="relative h-14 px-2.5 flex items-center flex-none border-b border-border"
          >
            <button
              type="button"
              onClick={() => setIsWsDropdownOpen((v) => !v)}
              data-testid="nc-ws-sidebar-selector"
              aria-expanded={isWsDropdownOpen}
              className="flex flex-1 items-center gap-2.5 pl-1.5 pr-2 py-1.5 rounded-lg cursor-pointer min-w-0 transition-colors duration-150 hover:bg-[hsl(var(--surface-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
            >
              <WorkspaceLogoIcon className="w-7 h-7" />
              <div className="flex-1 min-w-0">
                <div className="truncate text-[14px] leading-5 font-semibold text-foreground">
                  {activeWorkspace?.name || '个人空间'}
                </div>
              </div>
              <ChevronsUpDown
                size={14}
                className="flex-none text-muted-foreground"
              />
            </button>

            {isWsDropdownOpen && (
              <div className="absolute top-13 left-2.5 right-2.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] z-[70] p-1.5">
                <div className="relative mb-1.5">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={wsSearch}
                    onChange={(e) => setWsSearch(e.target.value)}
                    placeholder="搜索工作区..."
                    className="w-full h-8 pl-8 pr-2 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredWorkspaces.map((ws) => {
                    const isSelected = ws.id === activeWorkspace?.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          void handleSwitchOrganization(ws.id);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[13px] transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-foreground hover:bg-[hsl(var(--surface-hover))]'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                          style={{ backgroundColor: ws.color }}
                        >
                          {ws.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{ws.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {ws.plan}
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {switchError && (
                  <p className="px-2 py-1.5 text-[12px] text-destructive">
                    {switchError}
                  </p>
                )}
                <div className="border-t border-border mt-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWsDropdownOpen(false);
                      setSwitchError(null);
                      setIsCreateWsOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium text-primary hover:bg-accent/70 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>新建组织</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Middle Workspace Navigation */}
          <div className="flex-1 flex flex-col overflow-hidden pt-3">
            <div className="px-4 py-1.5 text-[11px] leading-4 font-semibold tracking-wider text-muted-foreground">
              工作区
            </div>
            <nav aria-label="工作区主导航" className="flex-1 overflow-y-auto px-2.5 space-y-1">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void navigate({ to: item.path })}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-[14px] leading-5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? 'bg-[hsl(var(--surface-active))] text-foreground font-semibold border border-primary/20 shadow-[var(--shadow-control)]'
                        : 'text-foreground/80 font-medium border border-transparent hover:bg-[hsl(var(--surface-hover))] hover:text-foreground'
                    }`}
                  >
                    <span
                      className={`flex-none transition-colors ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="text-[12px] leading-4 font-mono tabular-nums font-medium text-muted-foreground mr-0.5">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom User Info & Notification */}
          <UserAvatarMenu />
        </aside>

        <CreateWorkspaceDialog
          isOpen={isCreateWsOpen}
          onClose={() => setIsCreateWsOpen(false)}
          onCreate={handleCreateOrganization}
          suggestions={orgNameSuggestions}
        />
      </>
    );
  }

  // 兜底：Sidebar 只在 workspace shell 渲染（项目壳用 ProjectSidebar）。
  // 模板 context panel（应用/数据表/数据源/文件树）已随模板 UI 整体下线。
  return (
    <aside
      style={{ width }}
      className="flex flex-col bg-background h-full shrink-0 border-r border-border relative z-30"
    >
      <div className="h-14 px-2 flex items-center border-b border-border">
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className="text-[14px] font-semibold text-foreground hover:underline"
        >
          返回工作区
        </button>
      </div>
      <UserAvatarMenu />
    </aside>
  );
};

export default Sidebar;
