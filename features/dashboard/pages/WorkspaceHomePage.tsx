import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, FolderPlus, GitFork, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import {
  DEFAULT_LINEAGE_TREE,
  countChartsInTree,
  useLineageStore,
} from '../../../store/useLineageStore';
import { ProjectItem } from '../../../types';
import { Button } from '../../../components/ui/button';
import { AssetCard } from '../components/AssetCard';
import {
  AssetEditorModal,
  AssetEditorSubmitValues,
} from '../components/AssetEditorModal';

const WorkspaceHomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = usePreferencesStore((s) => s.user);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const projects = useWorkspaceStore((s) => s.projects);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const updateProject = useWorkspaceStore((s) => s.updateProject);
  const duplicateProject = useWorkspaceStore((s) => s.duplicateProject);
  const deleteProject = useWorkspaceStore((s) => s.deleteProject);

  const treesByProject = useLineageStore((s) => s.treesByProject);

  const [editTarget, setEditTarget] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; item: ProjectItem }
    | null
  >(null);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const wsProjects = useMemo(
    () => projects.filter((p) => p.workspaceId === activeWorkspaceId),
    [projects, activeWorkspaceId]
  );

  const primaryProject =
    wsProjects.find((p) => p.id === activeProjectId) ||
    wsProjects[0] ||
    projects[0];

  const chartCountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of wsProjects) {
      map[p.id] = countChartsInTree(
        treesByProject[p.id] || DEFAULT_LINEAGE_TREE
      );
    }
    return map;
  }, [wsProjects, treesByProject]);

  const handleOpenProject = (proj: ProjectItem) => {
    setActiveProjectId(proj.id);
    navigate(`/projects/${proj.id}`);
  };

  const handleModalSubmit = (values: AssetEditorSubmitValues) => {
    if (!editTarget) return;
    if (editTarget.mode === 'create') {
      const created = createProject({
        name: values.name,
        description: values.description,
        colorTheme: values.colorTheme,
        primarySurname: values.primarySurname,
        region: values.region,
        primaryName: values.primaryName,
        projectState: values.projectState,
        projectLevel: values.projectLevel,
      });
      setEditTarget(null);
      handleOpenProject(created);
      return;
    }

    updateProject(editTarget.item.id, {
      name: values.name,
      description: values.description,
      colorTheme: values.colorTheme,
      primarySurname: values.primarySurname,
      region: values.region,
      primaryName: values.primaryName,
      projectState: values.projectState,
      projectLevel: values.projectLevel,
    });
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
            欢迎来到「{activeWorkspace?.name}」，快速访问你的云谱项目、世系图谱与家族编修工作台。
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
                管理云谱项目
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 tabular-nums">
                共 {wsProjects.length} 个云谱项目
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
              if (primaryProject) {
                setActiveProjectId(primaryProject.id);
                navigate(`/projects/${primaryProject.id}/lineage`);
              } else {
                setEditTarget({ mode: 'create' });
              }
            }}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-control)] hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <GitFork size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                进入世系图谱画布
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 truncate">
                {primaryProject
                  ? `${primaryProject.name} · 欧式世系与行传`
                  : '新建云谱后开启世系编修'}
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
              if (primaryProject) {
                setActiveProjectId(primaryProject.id);
                navigate(`/projects/${primaryProject.id}/books`);
              } else {
                navigate('/members');
              }
            }}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-control)] hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                查看谱书与封面
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 truncate">
                题签封面 · 分卷版式预览
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
            />
          </button>
        </div>

        {/* Recent Cloud Genealogy Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground">
              最近访问的云谱
            </h2>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[13px] font-medium text-primary hover:underline whitespace-nowrap cursor-pointer"
            >
              查看全部云谱
            </button>
          </div>

          {wsProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 px-6 text-center space-y-3">
              <p className="text-[13px] font-medium text-muted-foreground">
                当前工作区还没有云谱项目，创建一个新云谱开始编修世系。
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditTarget({ mode: 'create' })}
                className="h-8 gap-1.5 text-[13px]"
              >
                <Plus size={14} /> 新建云谱项目
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {wsProjects.map((proj) => (
                <AssetCard
                  key={proj.id}
                  kind="project"
                  item={proj}
                  metaDetail={`${chartCountByProject[proj.id] ?? 0} 份世系图`}
                  showOwnerHint
                  onOpen={() => handleOpenProject(proj)}
                  onEdit={() => setEditTarget({ mode: 'edit', item: proj })}
                  onChangeColor={(colorTheme) =>
                    updateProject(proj.id, { colorTheme })
                  }
                  onDuplicate={() => duplicateProject(proj.id)}
                  onDelete={() => deleteProject(proj.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AssetEditorModal
        open={Boolean(editTarget)}
        mode={editTarget?.mode || 'edit'}
        kind="project"
        initialValue={
          editTarget?.mode === 'edit'
            ? {
                name: editTarget.item.name,
                description: editTarget.item.description,
                colorTheme: editTarget.item.colorTheme,
                primarySurname: editTarget.item.primarySurname,
                region: editTarget.item.region,
                primaryName: editTarget.item.primaryName,
                projectState: editTarget.item.projectState,
                projectLevel: editTarget.item.projectLevel,
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
