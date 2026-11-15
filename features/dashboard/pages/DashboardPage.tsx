import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  Plus,
  ChevronDown,
  ListFilter,
  User,
  Users,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProjectLayersOutlineIcon } from '../../../components/common/NocoIcons';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { useDataStore } from '../../../store/useDataStore';
import { useBuilderStore } from '../../../store/useBuilderStore';
import { AppItem, AssetColorTheme, ProjectItem } from '../../../types';
import { Button } from '../../../components/ui/button';
import { AssetCard } from '../components/AssetCard';
import { AssetEditorModal } from '../components/AssetEditorModal';

type AssetTab = 'all' | 'apps' | 'projects';
type OwnerFilter = 'all' | 'owned' | 'shared';

type ModalState =
  | { mode: 'create'; kind: 'project' | 'app' }
  | { mode: 'edit'; kind: 'project' | 'app'; item: ProjectItem | AppItem }
  | null;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const apps = useWorkspaceStore((s) => s.apps);
  const searchQuery = useWorkspaceStore((s) => s.searchQuery);
  const setSearchQuery = useWorkspaceStore((s) => s.setSearchQuery);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const updateProject = useWorkspaceStore((s) => s.updateProject);
  const duplicateProject = useWorkspaceStore((s) => s.duplicateProject);
  const deleteProject = useWorkspaceStore((s) => s.deleteProject);
  const createApp = useWorkspaceStore((s) => s.createApp);
  const updateApp = useWorkspaceStore((s) => s.updateApp);
  const duplicateApp = useWorkspaceStore((s) => s.duplicateApp);
  const deleteApp = useWorkspaceStore((s) => s.deleteApp);

  const tables = useDataStore((s) => s.tables);
  const pages = useBuilderStore((s) => s.pages);

  const [activeTab, setActiveTab] = useState<AssetTab>('all');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [modalState, setModalState] = useState<ModalState>(null);

  const ownerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        ownerMenuRef.current &&
        !ownerMenuRef.current.contains(e.target as Node)
      ) {
        setIsOwnerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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

  const q = searchQuery.trim().toLowerCase();

  const matchesFilter = (item: {
    name: string;
    description?: string;
    ownerType: 'owned' | 'shared';
  }) => {
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);
    const matchesOwner =
      ownerFilter === 'all' || item.ownerType === ownerFilter;
    return matchesSearch && matchesOwner;
  };

  const filteredProjects = wsProjects.filter(matchesFilter);
  const filteredApps = wsApps.filter(matchesFilter);

  const totalCount = wsProjects.length + wsApps.length;

  const ownerFilterLabels: Record<OwnerFilter, string> = {
    all: '所有项目',
    owned: '我拥有的',
    shared: '与我共享',
  };

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
    if (!modalState) return;

    if (modalState.mode === 'create') {
      if (modalState.kind === 'project') {
        const created = createProject({
          name: values.name,
          description: values.description,
          colorTheme: values.colorTheme,
          defaultTableId: tables[0]?.id || 'users',
        });
        setModalState(null);
        handleOpenProject(created);
      } else {
        const firstPageId = pages.find((p) => p.type === 'page')?.id || 'page-1';
        const created = createApp({
          name: values.name,
          description: values.description,
          colorTheme: values.colorTheme,
          defaultPageId: firstPageId,
        });
        setModalState(null);
        handleOpenApp(created);
      }
      return;
    }

    if (modalState.kind === 'project') {
      updateProject(modalState.item.id, {
        name: values.name,
        description: values.description,
        colorTheme: values.colorTheme,
      });
    } else {
      updateApp(modalState.item.id, {
        name: values.name,
        description: values.description,
        colorTheme: values.colorTheme,
      });
    }
    setModalState(null);
  };

  const renderAssetCard = (
    kind: 'project' | 'app',
    item: ProjectItem | AppItem
  ) => {
    const metaDetail =
      kind === 'project'
        ? `${tableCountByProject[item.id] ?? 0} 张表`
        : `${appPagesCount} 个页面`;

    return (
      <AssetCard
        key={item.id}
        kind={kind}
        item={item}
        metaDetail={metaDetail}
        onOpen={() =>
          kind === 'project'
            ? handleOpenProject(item as ProjectItem)
            : handleOpenApp(item as AppItem)
        }
        onEdit={() => setModalState({ mode: 'edit', kind, item })}
        onChangeColor={(colorTheme) =>
          kind === 'project'
            ? updateProject(item.id, { colorTheme })
            : updateApp(item.id, { colorTheme })
        }
        onDuplicate={() =>
          kind === 'project'
            ? duplicateProject(item.id)
            : duplicateApp(item.id)
        }
        onDelete={() =>
          kind === 'project' ? deleteProject(item.id) : deleteApp(item.id)
        }
      />
    );
  };

  const renderSectionGroup = (
    kind: 'project' | 'app',
    items: (ProjectItem | AppItem)[]
  ) => {
    const ownedItems = items.filter((i) => i.ownerType === 'owned');
    const sharedItems = items.filter((i) => i.ownerType === 'shared');
    const kindLabel = kind === 'project' ? '项目' : '应用';

    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3.5 text-[14px] font-semibold text-foreground">
          {kind === 'project' ? (
            <ProjectLayersOutlineIcon className="w-4 h-4 text-foreground/75" />
          ) : (
            <LayoutGrid size={16} className="text-foreground/75" />
          )}
          <span>{kindLabel}</span>
          <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
            ({items.length})
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 px-4 text-center">
            <p className="text-[13px] font-medium text-muted-foreground mb-3">
              {q
                ? `未找到匹配 “${searchQuery}” 的${kindLabel}`
                : ownerFilter !== 'all'
                ? `当前筛选「${ownerFilterLabels[ownerFilter]}」下暂无${kindLabel}`
                : `当前工作区暂无${kindLabel}`}
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
                onClick={() => setModalState({ mode: 'create', kind })}
              >
                <Plus size={13} />
                新建{kindLabel}
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
                  {ownedItems.map((item) => renderAssetCard(kind, item))}
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
                  {sharedItems.map((item) => renderAssetCard(kind, item))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Tabs & Action Bar */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-3 flex-none">
        <div className="flex items-center justify-between gap-3 border-b border-border">
          {/* Tabs: 全部 / 应用 / 项目 */}
          <div className="flex items-center gap-1 -mb-px" role="tablist">
            {[
              { id: 'all' as const, label: '全部', count: totalCount },
              { id: 'apps' as const, label: '应用', count: wsApps.length },
              { id: 'projects' as const, label: '项目', count: wsProjects.length },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
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

          {/* Right Filter & Create Actions */}
          <div className="flex items-center gap-2 shrink-0 pb-2">
            <div ref={ownerMenuRef} className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOwnerMenuOpen((v) => !v)}
                className="h-8 text-[13px] gap-1.5 font-medium px-2.5 whitespace-nowrap shrink-0"
              >
                <ListFilter size={14} className="text-muted-foreground" />
                <span className="hidden sm:inline">
                  {ownerFilterLabels[ownerFilter]}
                </span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </Button>

              {isOwnerMenuOpen && (
                <div className="absolute right-0 top-9 w-36 rounded-lg border border-border bg-popover shadow-[var(--shadow-popover)] z-40 p-1 animate-in fade-in zoom-in-95 duration-100">
                  {(['all', 'owned', 'shared'] as OwnerFilter[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setOwnerFilter(key);
                        setIsOwnerMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
                        ownerFilter === key
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-foreground font-medium hover:bg-[hsl(var(--surface-hover))]'
                      }`}
                    >
                      <span>{ownerFilterLabels[key]}</span>
                      {ownerFilter === key && <Check size={12} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalState({ mode: 'create', kind: 'app' })}
              className="h-8 text-[13px] font-medium gap-1.5 whitespace-nowrap shrink-0 hidden sm:inline-flex"
            >
              <Plus size={14} />
              <span>新建应用</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setModalState({ mode: 'create', kind: 'project' })}
              data-testid="nc-sidebar-create-project-btn"
              className="h-8 text-[13px] font-medium gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>新建项目</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Scrollable Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-5">
          {(activeTab === 'all' || activeTab === 'projects') &&
            renderSectionGroup('project', filteredProjects)}

          {(activeTab === 'all' || activeTab === 'apps') &&
            renderSectionGroup('app', filteredApps)}
        </div>
      </div>

      {/* Create / Edit Project & App Modal */}
      <AssetEditorModal
        open={Boolean(modalState)}
        mode={modalState?.mode || 'create'}
        kind={modalState?.kind || 'project'}
        initialValue={
          modalState?.mode === 'edit'
            ? {
                name: modalState.item.name,
                description: modalState.item.description,
                colorTheme: modalState.item.colorTheme,
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