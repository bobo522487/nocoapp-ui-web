import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '../../../components/ui/button';
import { collectTreeNodesByType } from '../../../lib/treeOps';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import {
  DEFAULT_LINEAGE_TREE,
  makeChartStorageKey,
  useLineageStore,
} from '../../../store/useLineageStore';
import { useArticleStore } from '../../../store/useArticleStore';
import { useBookStore } from '../../../store/useBookStore';
import { useCurrentUserProfile } from '../../../hooks/useCurrentUserProfile';
import { createSeedPersonsForChart } from '../../lineage/lineageData';
import { countArticlesInTree } from '../../articles/articleData';
import { errorMessage } from '../../../lib/api';
import {
  createProjectRequest,
  deleteProjectRequest,
  fetchOrganization,
  fetchProjects,
  updateProjectRequest,
  type OrgDetail,
  type ProjectColorTheme,
  type ProjectRecord,
  type ProjectStatus,
} from '../api';
import PageSkeleton from '../components/PageSkeleton';
import PageError from '../components/PageError';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  AssetEditorModal,
  type AssetEditorSubmitValues,
} from '../components/AssetEditorModal';
import { FamilyCard, type FamilyCardMetrics } from '../components/FamilyCard';
import { ZibeiSettingsModal } from '../components/ZibeiSettingsModal';
import { formatGenealogyPlace } from '../../place-input';

const statusFromState = (
  state: '0' | '1',
  original?: ProjectStatus
): ProjectStatus =>
  state === '1' ? 'completed' : original === 'planning' ? 'planning' : 'in_progress';

type PageState = {
  loading: boolean;
  error: string | null;
  detail: OrgDetail | null;
  projects: ProjectRecord[];
  nextCursor: string | null;
};

const EMPTY: PageState = {
  loading: true,
  error: null,
  detail: null,
  projects: [],
  nextCursor: null,
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useCurrentUserProfile();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const zibeiByProject = useWorkspaceStore((s) => s.zibeiByProject || {});
  const setProjectZibei = useWorkspaceStore((s) => s.setProjectZibei);
  const syncProject = useWorkspaceStore((s) => s.syncProject);
  const dropProject = useWorkspaceStore((s) => s.dropProject);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);

  const treesByProject = useLineageStore((s) => s.treesByProject);
  const personsByChart = useLineageStore((s) => s.personsByChart);
  const articleTreesByProject = useArticleStore((s) => s.treesByProject);
  const articlesByKey = useArticleStore((s) => s.articlesByKey);
  const booksByProject = useBookStore((s) => s.booksByProject);

  const [state, setState] = useState<PageState>(EMPTY);
  const [formDialog, setFormDialog] = useState<{
    mode: 'create' | 'edit';
    project?: ProjectRecord;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);
  const [zibeiTarget, setZibeiTarget] = useState<ProjectRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [detailResult, projectsResult] = await Promise.all([
        fetchOrganization(activeWorkspaceId),
        fetchProjects(activeWorkspaceId, { limit: 50, sort: 'recent' }),
      ]);
      useWorkspaceStore
        .getState()
        .syncWorkspaceProjects(activeWorkspaceId, projectsResult.items);
      setState({
        loading: false,
        error: null,
        detail: detailResult.organization,
        projects: projectsResult.items,
        nextCursor: projectsResult.nextCursor,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: errorMessage(error) }));
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  const loadMore = async () => {
    if (!state.nextCursor || !activeWorkspaceId) return;
    try {
      const page = await fetchProjects(activeWorkspaceId, {
        cursor: state.nextCursor,
        limit: 50,
        sort: 'recent',
      });
      setState((prev) => ({
        ...prev,
        projects: [...prev.projects, ...page.items],
        nextCursor: page.nextCursor,
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: errorMessage(error) }));
    }
  };

  const myRole = state.detail?.myRole;
  const canCreate = myRole === 'admin' || myRole === 'editor';
  const canDelete = myRole === 'admin';

  const currentProjectId = useMemo(() => {
    if (
      activeProjectId &&
      state.projects.some((p) => p.id === activeProjectId)
    ) {
      return activeProjectId;
    }
    return state.projects[0]?.id ?? '';
  }, [activeProjectId, state.projects]);

  const metricsByProject = useMemo(() => {
    const map: Record<string, FamilyCardMetrics> = {};
    for (const project of state.projects) {
      const lineageTree = treesByProject[project.id] ?? DEFAULT_LINEAGE_TREE;
      const chartNodes = collectTreeNodesByType(lineageTree, 'chart');
      let personCount = 0;
      for (const chart of chartNodes) {
        const cId = String(chart.id);
        const key = makeChartStorageKey(project.id, cId);
        const persons =
          personsByChart[key] ??
          createSeedPersonsForChart(
            cId,
            chart.data?.name,
            chart.data?.surname ?? project.surname ?? undefined
          );
        personCount += persons.length;
      }

      const articleTree = articleTreesByProject[project.id];
      const articleCount = articleTree ? countArticlesInTree(articleTree) : 6;
      const bookCount = booksByProject[project.id]?.length ?? 0;

      map[project.id] = {
        lineageCount: chartNodes.length,
        personCount,
        articleCount,
        bookCount,
      };
    }
    return map;
  }, [
    state.projects,
    treesByProject,
    personsByChart,
    articleTreesByProject,
    booksByProject,
  ]);

  const handleOpen = (
    project: ProjectRecord,
    subPath: '' | '/lineage' | '/articles' | '/books' = ''
  ) => {
    syncProject(project);
    setActiveProjectId(project.id);
    const routeMap = {
      '': '/projects/$projectId',
      '/lineage': '/projects/$projectId/lineage',
      '/articles': '/projects/$projectId/articles',
      '/books': '/projects/$projectId/books',
    } as const;
    void navigate({
      to: routeMap[subPath],
      params: { projectId: project.id },
    });
  };

  const handleExportFamily = (project: ProjectRecord) => {
    try {
      const lineageTree = treesByProject[project.id] ?? DEFAULT_LINEAGE_TREE;
      const chartNodes = collectTreeNodesByType(lineageTree, 'chart');
      const lineageCharts: Record<string, unknown> = {};
      for (const chart of chartNodes) {
        const cId = String(chart.id);
        const key = makeChartStorageKey(project.id, cId);
        lineageCharts[cId] = {
          name: chart.data?.name || cId,
          persons:
            personsByChart[key] ??
            createSeedPersonsForChart(
              cId,
              chart.data?.name,
              chart.data?.surname ?? project.surname ?? undefined
            ),
        };
      }

      const projectArticles = Object.entries(articlesByKey)
        .filter(([k]) => k.startsWith(`${project.id}::`))
        .map(([, doc]) => doc);

      const backupPayload = {
        schema: 'yunpu-family-backup/v1',
        exportedAt: new Date().toISOString(),
        family: project,
        zibei: zibeiByProject[project.id] ?? [],
        lineageTree,
        lineageCharts,
        articleTree: articleTreesByProject[project.id] ?? [],
        articles: projectArticles,
        books: booksByProject[project.id] ?? [],
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name}-家族备份-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionNotice(`已导出「${project.name}」家族完整备份文件`);
    } catch (error) {
      setActionError(`导出备份失败：${errorMessage(error)}`);
    }
  };

  const handleSaved = (project: ProjectRecord) => {
    syncProject(project);
    setState((prev) => ({
      ...prev,
      projects: prev.projects.some((p) => p.id === project.id)
        ? prev.projects.map((p) => (p.id === project.id ? project : p))
        : [project, ...prev.projects],
    }));
  };

  // 家族建档弹窗提交：映射到项目 API 载荷，并在新建时初始化始迁祖世系节点。
  const handleEditorSubmit = async (values: AssetEditorSubmitValues) => {
    if (!formDialog) return;
    setFormError(null);
    setFormSaving(true);
    try {
      const state0 = values.projectState ?? '0';
      const originText = formatGenealogyPlace(values.region).trim();
      if (formDialog.mode === 'create') {
        const created = await createProjectRequest(activeWorkspaceId, {
          name: values.name.trim(),
          status: statusFromState(state0),
          surname: values.primarySurname?.trim(),
          ancestor: values.ancestor?.trim(),
          hallName: values.primaryName?.trim(),
          originText: originText || undefined,
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
        handleSaved(created.project);
      } else if (formDialog.project) {
        const original = formDialog.project;
        const updated = await updateProjectRequest(original.id, {
          name: values.name.trim(),
          status: statusFromState(state0, original.status),
          surname: values.primarySurname?.trim() ?? null,
          ancestor: values.ancestor?.trim() ?? null,
          hallName: values.primaryName?.trim() ?? null,
          originText: originText || null,
          description: values.description.trim() || null,
          colorTheme: values.colorTheme,
          projectLevel: values.projectLevel ?? original.projectLevel,
          expectedUpdatedAt: original.updatedAt,
        });
        handleSaved(updated.project);
      }
      setFormDialog(null);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteProjectRequest(deleteTarget.id);
      dropProject(deleteTarget.id);
      setState((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== deleteTarget.id),
      }));
      setDeleteTarget(null);
    } catch (error) {
      setActionError(errorMessage(error));
      setDeleteTarget(null);
    }
  };

  if (state.loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-background">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-7">
          <PageSkeleton variant="rows" />
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

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-7 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="yp-h1 text-foreground">
              家族
            </h1>
            <p className="text-[14px] text-muted-foreground mt-1 tabular-nums">
              {state.detail?.name ?? '当前组织'} · 共 {state.projects.length} 个家族
            </p>
          </div>
          {canCreate && (
            <Button size="sm" onClick={() => setFormDialog({ mode: 'create' })}>
              <FolderPlus size={15} className="mr-1.5" />
              新建家族
            </Button>
          )}
        </div>

        {actionError && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-[13px] text-destructive"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label="关闭"
              className="cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {actionNotice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-lg border border-primary/30 bg-[hsl(var(--surface-active))] px-4 py-2.5 text-[13px] text-foreground"
          >
            <span>{actionNotice}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              aria-label="关闭"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {state.projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">尚无家族</p>
            {canCreate && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setFormDialog({ mode: 'create' })}
              >
                <FolderPlus size={14} className="mr-1.5" />
                新建家族
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {state.projects.map((project) => (
              <FamilyCard
                key={project.id}
                project={project}
                isCurrent={project.id === currentProjectId}
                metrics={
                  metricsByProject[project.id] ?? {
                    lineageCount: 0,
                    personCount: 0,
                    articleCount: 0,
                    bookCount: 0,
                  }
                }
                maintainerName={user?.name || '家族编委会'}
                zibeiWords={zibeiByProject[project.id] ?? []}
                canEdit={canCreate}
                canDelete={canDelete}
                onOpen={handleOpen}
                onExport={handleExportFamily}
                onEdit={(proj) => setFormDialog({ mode: 'edit', project: proj })}
                onDelete={(proj) => setDeleteTarget(proj)}
                onManageZibei={(proj) => setZibeiTarget(proj)}
              />
            ))}
          </div>
        )}

        {state.nextCursor && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => void loadMore()}>
              加载更多
            </Button>
          </div>
        )}
      </div>

      {formDialog && (
        <AssetEditorModal
          open
          mode={formDialog.mode}
          kind="project"
          submitting={formSaving}
          error={formError}
          initialValue={
            formDialog.mode === 'edit' && formDialog.project
              ? (() => {
                  const p = formDialog.project;
                  return {
                    name: p.name,
                    description: p.description ?? '',
                    // 网络边界兜底：后端未返回新字段时避免预览组件读 undefined 崩溃。
                    colorTheme: p.colorTheme ?? 'sky',
                    primarySurname: p.surname ?? '',
                    ancestor: p.ancestor ?? '',
                    region: p.originText ?? '',
                    primaryName: p.hallName ?? '',
                    projectState: (p.status === 'completed' ? '1' : '0') as '0' | '1',
                    projectLevel: p.projectLevel ?? 1,
                  };
                })()
              : undefined
          }
          onClose={() => {
            if (formSaving) return;
            setFormDialog(null);
            setFormError(null);
          }}
          onSubmit={(values) => void handleEditorSubmit(values)}
        />
      )}

      <ZibeiSettingsModal
        open={zibeiTarget !== null}
        familyName={zibeiTarget?.name ?? ''}
        surname={zibeiTarget?.surname}
        initialWords={zibeiTarget ? (zibeiByProject[zibeiTarget.id] ?? []) : []}
        onClose={() => setZibeiTarget(null)}
        onSave={(words) => {
          if (zibeiTarget) {
            setProjectZibei(zibeiTarget.id, words);
            setActionNotice(`已更新「${zibeiTarget.name}」字辈序列（共 ${words.length} 世）`);
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除家族"
        description={`删除「${deleteTarget?.name ?? ''}」后，家族列表中将不再出现该记录，且不可撤销。`}
        confirmLabel="删除"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DashboardPage;
