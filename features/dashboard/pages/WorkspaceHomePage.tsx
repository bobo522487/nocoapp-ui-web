import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, FolderPlus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { useLineageStore } from '../../../store/useLineageStore';
import { errorMessage } from '../../../lib/api';
import {
  createProjectRequest,
  fetchOrganization,
  fetchProjects,
  type OrgDetail,
  type ProjectRecord,
} from '../api';
import PageSkeleton from '../components/PageSkeleton';
import PageError from '../components/PageError';
import {
  AssetEditorModal,
  type AssetEditorSubmitValues,
} from '../components/AssetEditorModal';

type HomeState = {
  loading: boolean;
  error: string | null;
  detail: OrgDetail | null;
  projects: ProjectRecord[];
};

const EMPTY: HomeState = { loading: true, error: null, detail: null, projects: [] };

const WorkspaceHomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = usePreferencesStore((s) => s.user);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const syncProject = useWorkspaceStore((s) => s.syncProject);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);
  const [state, setState] = useState<HomeState>(EMPTY);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setState({ loading: false, error: null, detail: null, projects: [] });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [detailResult, projectsResult] = await Promise.all([
        fetchOrganization(activeWorkspaceId),
        fetchProjects(activeWorkspaceId, { limit: 5, sort: 'recent' }),
      ]);
      useWorkspaceStore
        .getState()
        .syncWorkspaceProjects(activeWorkspaceId, projectsResult.items);
      setState({
        loading: false,
        error: null,
        detail: detailResult.organization,
        projects: projectsResult.items,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage(error),
      }));
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateProject = async (values: AssetEditorSubmitValues) => {
    if (!activeWorkspaceId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const created = await createProjectRequest(activeWorkspaceId, {
        name: values.name.trim(),
        status: 'in_progress',
        surname: values.primarySurname?.trim(),
        ancestor: values.ancestor?.trim(),
        hallName: values.primaryName?.trim(),
        originText: values.region?.trim() || undefined,
        description: values.description.trim() || undefined,
        colorTheme: values.colorTheme,
        projectLevel: values.projectLevel ?? 1,
      });
      if (values.ancestor?.trim()) {
        useLineageStore.getState().initializeProjectLineage(created.project.id, {
          familyName: values.name,
          ancestor: values.ancestor,
          surname: values.primarySurname,
          region: values.region,
        });
      }
      syncProject(created.project);
      setActiveProjectId(created.project.id);
      setCreateOpen(false);
      navigate(`/projects/${created.project.id}`);
    } catch (error) {
      setCreateError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  if (state.loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-background">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-7">
          <PageSkeleton variant="cards" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-background">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-7">
          <PageError message={state.error} onRetry={() => void load()} />
        </div>
      </div>
    );
  }

  const detail = state.detail;
  const recentProjects = state.projects.slice(0, 5);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-7 space-y-8">
        <div>
          <h1 className="font-editorial text-2xl font-semibold text-foreground tracking-tight">
            你好，{user.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            欢迎来到「{detail?.name ?? '当前组织'}」，管理你的家族与协作成员。
          </p>
        </div>

        {/* 组织概览 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="text-[12px] font-medium text-muted-foreground">家族</div>
            <div className="font-editorial text-2xl font-semibold text-foreground tabular-nums mt-1">
              {detail?.projectCount ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="text-[12px] font-medium text-muted-foreground">成员</div>
            <div className="font-editorial text-2xl font-semibold text-foreground tabular-nums mt-1">
              {detail?.memberCount ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="text-[12px] font-medium text-muted-foreground">
              待处理邀请
            </div>
            <div className="font-editorial text-2xl font-semibold text-foreground tabular-nums mt-1">
              {detail?.pendingInviteCount ?? 0}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-card hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--surface-subtle))] border border-border text-primary flex items-center justify-center shrink-0">
              <FolderPlus size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                新建家族
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 tabular-nums">
                创建一份新的家谱
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate('/members')}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-card hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--surface-subtle))] border border-border text-primary flex items-center justify-center shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                邀请成员
              </div>
              <div className="text-[12px] font-medium text-muted-foreground mt-0.5 tabular-nums">
                当前 {detail?.memberCount ?? 0} 名成员
                {detail && detail.pendingInviteCount > 0
                  ? ` · ${detail.pendingInviteCount} 个待处理邀请`
                  : ''}
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
            />
          </button>
        </div>

        {/* Recent Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-[15px] font-semibold text-foreground">
              最近家族
            </h2>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[13px] font-medium text-primary hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              查看全部
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">尚无家族</p>
              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setCreateOpen(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline cursor-pointer"
              >
                <FolderPlus size={14} />
                新建家族
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentProjects.map((project) => {
                const surnameChar = (
                  project.surname?.trim() ||
                  project.name.trim().slice(0, 1) ||
                  '谱'
                ).slice(0, 1);
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      syncProject(project);
                      setActiveProjectId(project.id);
                      navigate(`/projects/${project.id}`);
                    }}
                    className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150 cursor-pointer text-left"
                  >
                    <div className="w-11 h-11 rounded-lg bg-[hsl(var(--surface-subtle))] border border-border flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors">
                      <span className="font-editorial text-lg font-bold">
                        {surnameChar}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-editorial text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </div>
                      <div className="text-[12px] text-muted-foreground tabular-nums truncate mt-0.5">
                        {project.originText || '家族'} ·{' '}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AssetEditorModal
        open={createOpen}
        mode="create"
        kind="project"
        submitting={creating}
        error={createError}
        onClose={() => {
          if (creating) return;
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={(values) => void handleCreateProject(values)}
      />
    </div>
  );
};

export default WorkspaceHomePage;
