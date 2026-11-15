import React, { useMemo, useState } from 'react';
import { ArrowRight, Database, LayoutGrid, FolderPlus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { useDataStore } from '../../../store/useDataStore';
import { useBuilderStore } from '../../../store/useBuilderStore';
import { AppItem, AssetColorTheme, ProjectItem } from '../../../types';
import { Button } from '../../../components/ui/button';
import { AssetCard } from '../components/AssetCard';
import { AssetEditorModal } from '../components/AssetEditorModal';

const WorkspaceHomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = usePreferencesStore((s) => s.user);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const apps = useWorkspaceStore((s) => s.apps);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const updateProject = useWorkspaceStore((s) => s.updateProject);
  const duplicateProject = useWorkspaceStore((s) => s.duplicateProject);
  const deleteProject = useWorkspaceStore((s) => s.deleteProject);
  const updateApp = useWorkspaceStore((s) => s.updateApp);
  const duplicateApp = useWorkspaceStore((s) => s.duplicateApp);
  const deleteApp = useWorkspaceStore((s) => s.deleteApp);

  const tables = useDataStore((s) => s.tables);
  const pages = useBuilderStore((s) => s.pages);

  const [editTarget, setEditTarget] = useState<
    | { mode: 'create'; kind: 'project' }
    | { mode: 'edit'; kind: 'project' | 'app'; item: ProjectItem | AppItem }
    | null
  >(null);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const wsProjects = projects.filter((p) => p.workspaceId === activeWorkspaceId);
  const wsApps = apps.filter((a) => a.workspaceId === activeWorkspaceId);

  const tableCountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tables) {
      if (t.projectId) {
        map[t.projectId] = (map[t.projectId] || 0) + 1;
      }
    }
    return map;
  }, [tables]);

  const appPagesCount = useMemo(
    () => pages.filter((p) => p.type === 'page').length,
    [pages]
  );

  const handleOpenProject = (proj: ProjectItem) => {
    setActiveProjectId(proj.id);
    navigate(`/projects/${proj.id}`);
  };

  const handleOpenApp = (app: AppItem) => {
    const targetPage =
      pages.find((p) => p.id === app.defaultPageId && p.type === 'page')?.id ||
      pages.find((p) => p.type === 'page')?.id ||
      'page-1';
    navigate(`/apps/${app.id}/pages/${targetPage}`);
  };

  const handleModalSubmit = (values: {
    name: string;
    description: string;
    colorTheme: AssetColorTheme;
  }) => {
    if (!editTarget) return;
    if (editTarget.mode === 'create') {
      const created = createProject({
        name: values.name,
        description: values.description,
        colorTheme: values.colorTheme,
        defaultTableId: tables[0]?.id || 'users',
      });
      setEditTarget(null);
      handleOpenProject(created);
      return;
    }
    if (editTarget.kind === 'project') {
      updateProject(editTarget.item.id, {
        name: values.name,
        description: values.description,
        colorTheme: values.colorTheme,
      });
    } else {
      updateApp(editTarget.item.id, {
        name: values.name,
        description: values.description,
        colorTheme: values.colorTheme,
      });
    }
    setEditTarget(null);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-7 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            你好，{user.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            欢迎来到「{activeWorkspace?.name}」，快速访问你的项目、数据模型与可视化应用。
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-control)] hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <FolderPlus size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                管理工作区项目
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 tabular-nums">
                共 {wsProjects.length} 个项目
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
            />
          </button>

          <button
            type="button"
            onClick={() => {
              const firstApp = wsApps[0] || apps[0];
              navigate(
                `/apps/${firstApp?.id || 'app-order-mgmt'}/pages/${
                  firstApp?.defaultPageId || 'page-1'
                }`
              );
            }}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-control)] hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <LayoutGrid size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                打开应用构建器
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 tabular-nums">
                共 {wsApps.length} 个可视化应用
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate('/datasources')}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-control)] hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Database size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                连接外部数据源
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 truncate">
                PostgreSQL · MySQL · API
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
            />
          </button>
        </div>

        {/* Recent Projects & Apps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground">最近访问</h2>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[13px] font-medium text-primary hover:underline whitespace-nowrap cursor-pointer"
            >
              查看全部项目
            </button>
          </div>

          {wsProjects.length === 0 && wsApps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 px-6 text-center space-y-3">
              <p className="text-[13px] font-medium text-muted-foreground">
                当前工作区还没有项目或应用，创建一个新项目开始构建数据模型。
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditTarget({ mode: 'create', kind: 'project' })}
                className="h-8 gap-1.5 text-[13px]"
              >
                <Plus size={14} /> 新建项目
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {wsProjects.map((proj) => (
                <AssetCard
                  key={proj.id}
                  kind="project"
                  item={proj}
                  metaDetail={`${tableCountByProject[proj.id] ?? 0} 张表`}
                  showOwnerHint
                  onOpen={() => handleOpenProject(proj)}
                  onEdit={() =>
                    setEditTarget({ mode: 'edit', kind: 'project', item: proj })
                  }
                  onChangeColor={(colorTheme) =>
                    updateProject(proj.id, { colorTheme })
                  }
                  onDuplicate={() => duplicateProject(proj.id)}
                  onDelete={() => deleteProject(proj.id)}
                />
              ))}

              {wsApps.map((app) => (
                <AssetCard
                  key={app.id}
                  kind="app"
                  item={app}
                  metaDetail={`${appPagesCount} 个页面`}
                  showOwnerHint
                  onOpen={() => handleOpenApp(app)}
                  onEdit={() =>
                    setEditTarget({ mode: 'edit', kind: 'app', item: app })
                  }
                  onChangeColor={(colorTheme) =>
                    updateApp(app.id, { colorTheme })
                  }
                  onDuplicate={() => duplicateApp(app.id)}
                  onDelete={() => deleteApp(app.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AssetEditorModal
        open={Boolean(editTarget)}
        mode={editTarget?.mode || 'edit'}
        kind={editTarget?.kind || 'project'}
        initialValue={
          editTarget?.mode === 'edit'
            ? {
                name: editTarget.item.name,
                description: editTarget.item.description,
                colorTheme: editTarget.item.colorTheme,
              }
            : undefined
        }
        onClose={() => setEditTarget(null)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default WorkspaceHomePage;
