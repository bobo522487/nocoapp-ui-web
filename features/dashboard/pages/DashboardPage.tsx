import React, { useMemo, useState } from 'react';
import { Plus, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProjectLayersOutlineIcon } from '../../../components/common/NocoIcons';
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

type OwnerFilter = 'all' | 'owned' | 'shared';

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; item: ProjectItem }
  | null;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const searchQuery = useWorkspaceStore((s) => s.searchQuery);
  const setSearchQuery = useWorkspaceStore((s) => s.setSearchQuery);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const updateProject = useWorkspaceStore((s) => s.updateProject);
  const duplicateProject = useWorkspaceStore((s) => s.duplicateProject);
  const deleteProject = useWorkspaceStore((s) => s.deleteProject);

  const treesByProject = useLineageStore((s) => s.treesByProject);

  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [modalState, setModalState] = useState<ModalState>(null);

  const wsProjects = useMemo(
    () => projects.filter((p) => p.workspaceId === activeWorkspaceId),
    [projects, activeWorkspaceId]
  );

  const chartCountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of wsProjects) {
      map[p.id] = countChartsInTree(
        treesByProject[p.id] || DEFAULT_LINEAGE_TREE
      );
    }
    return map;
  }, [wsProjects, treesByProject]);

  const q = searchQuery.trim().toLowerCase();

  const searchMatchedProjects = useMemo(
    () =>
      wsProjects.filter(
        (item) =>
          !q ||
          item.name.toLowerCase().includes(q) ||
          (item.primaryName || '').toLowerCase().includes(q) ||
          (item.primarySurname || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
      ),
    [wsProjects, q]
  );

  const filteredProjects = useMemo(
    () =>
      searchMatchedProjects.filter(
        (item) => ownerFilter === 'all' || item.ownerType === ownerFilter
      ),
    [searchMatchedProjects, ownerFilter]
  );

  const ownedCount = searchMatchedProjects.filter(
    (p) => p.ownerType === 'owned'
  ).length;
  const sharedCount = searchMatchedProjects.filter(
    (p) => p.ownerType === 'shared'
  ).length;

  const ownerFilterLabels: Record<OwnerFilter, string> = {
    all: '全部云谱',
    owned: '我拥有的',
    shared: '与我共享',
  };

  const handleOpenProject = (proj: ProjectItem) => {
    setActiveProjectId(proj.id);
    navigate(`/projects/${proj.id}`);
  };

  const handleModalSubmit = (values: AssetEditorSubmitValues) => {
    if (!modalState) return;

    if (modalState.mode === 'create') {
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
      setModalState(null);
      handleOpenProject(created);
      return;
    }

    updateProject(modalState.item.id, {
      name: values.name,
      description: values.description,
      colorTheme: values.colorTheme,
      primarySurname: values.primarySurname,
      region: values.region,
      primaryName: values.primaryName,
      projectState: values.projectState,
      projectLevel: values.projectLevel,
    });
    setModalState(null);
  };

  const ownedItems = filteredProjects.filter((i) => i.ownerType === 'owned');
  const sharedItems = filteredProjects.filter((i) => i.ownerType === 'shared');

  const renderProjectCard = (item: ProjectItem) => (
    <AssetCard
      key={item.id}
      kind="project"
      item={item}
      metaDetail={`${chartCountByProject[item.id] ?? 0} 份世系图`}
      onOpen={() => handleOpenProject(item)}
      onEdit={() => setModalState({ mode: 'edit', item })}
      onChangeColor={(colorTheme) => updateProject(item.id, { colorTheme })}
      onDuplicate={() => duplicateProject(item.id)}
      onDelete={() => deleteProject(item.id)}
    />
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Tabs & Action Bar */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-3 flex-none">
        <div className="flex items-center justify-between gap-3 border-b border-border">
          {/* Tabs: 全部云谱 / 我拥有的 / 与我共享 */}
          <div className="flex items-center gap-1 -mb-px" role="tablist">
            {[
              {
                id: 'all' as const,
                label: '全部云谱',
                count: searchMatchedProjects.length,
              },
              { id: 'owned' as const, label: '我拥有的', count: ownedCount },
              { id: 'shared' as const, label: '与我共享', count: sharedCount },
            ].map((tab) => {
              const active = ownerFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setOwnerFilter(tab.id)}
                  className={`relative h-10 px-3 rounded-t-md text-[14px] flex items-center gap-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    active
                      ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-1.5 after:right-1.5 after:h-[2px] after:rounded-full after:bg-primary'
                      : 'text-foreground/75 font-medium hover:text-foreground hover:bg-[hsl(var(--surface-subtle))]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[12px] font-medium tabular-nums ${
                      active ? 'text-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Create Action */}
          <div className="flex items-center gap-2 shrink-0 pb-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setModalState({ mode: 'create' })}
              data-testid="nc-sidebar-create-project-btn"
              className="h-8 text-[13px] font-medium gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>新建云谱项目</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Scrollable Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-5">
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3.5 text-[14px] font-semibold text-foreground">
              <ProjectLayersOutlineIcon className="w-4 h-4 text-foreground/75" />
              <span>云谱项目</span>
              <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
                ({filteredProjects.length})
              </span>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 px-4 text-center">
                <p className="text-[13px] font-medium text-muted-foreground mb-3">
                  {q
                    ? `未找到匹配 “${searchQuery}” 的云谱项目`
                    : ownerFilter !== 'all'
                    ? `当前筛选「${ownerFilterLabels[ownerFilter]}」下暂无云谱项目`
                    : '当前工作区暂无云谱项目'}
                </p>
                {q || ownerFilter !== 'all' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[13px]"
                    onClick={() => {
                      setSearchQuery('');
                      setOwnerFilter('all');
                    }}
                  >
                    重置筛选条件
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[13px] gap-1.5"
                    onClick={() => setModalState({ mode: 'create' })}
                  >
                    <Plus size={13} />
                    新建云谱项目
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {ownedItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-[13px] font-medium text-foreground/75">
                      <User size={13} />
                      <span>我拥有的</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {ownedItems.map(renderProjectCard)}
                    </div>
                  </div>
                )}

                {sharedItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-[13px] font-medium text-foreground/75">
                      <Users size={13} />
                      <span>与我共享</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {sharedItems.map(renderProjectCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Create / Edit Cloud Genealogy Project Modal */}
      <AssetEditorModal
        open={Boolean(modalState)}
        mode={modalState?.mode || 'create'}
        kind="project"
        initialValue={
          modalState?.mode === 'edit'
            ? {
                name: modalState.item.name,
                description: modalState.item.description,
                colorTheme: modalState.item.colorTheme,
                primarySurname: modalState.item.primarySurname,
                region: modalState.item.region,
                primaryName: modalState.item.primaryName,
                projectState: modalState.item.projectState,
                projectLevel: modalState.item.projectLevel,
              }
            : undefined
        }
        onClose={() => setModalState(null)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default DashboardPage;