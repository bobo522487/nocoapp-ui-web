import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  Compass,
  Copy,
  GitFork,
  Home,
  Layers,
  Plus,
  ScrollText,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { ProjectColoredIcon } from './NocoIcons';
import {
  AssetEditorModal,
  AssetEditorSubmitValues,
} from '../../features/dashboard/components/AssetEditorModal';
import { createProjectRequest } from '../../features/dashboard/api';
import { ViewMode } from '../../types';
import { useRouteContext } from '../../hooks/useRouteContext';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useLineageStore } from '../../store/useLineageStore';
import { formatGenealogyPlace } from '../../features/place-input';

const VIEW_BADGE_CONFIG: Partial<
  Record<
    ViewMode,
    { label: string; icon: React.ElementType; mutedIcon?: boolean }
  >
> = {
  [ViewMode.HOME]: { label: '首页', icon: Home },
  [ViewMode.MEMBERS]: { label: '成员', icon: Users },
  [ViewMode.WORKSPACE_SETTINGS]: { label: '设置', icon: Settings, mutedIcon: true },
  [ViewMode.PROJECT_HOME]: { label: '概览', icon: Compass },
  [ViewMode.LINEAGE]: { label: '世系', icon: GitFork },
  [ViewMode.ARTICLES]: { label: '谱文', icon: ScrollText },
  [ViewMode.BOOKS]: { label: '谱书', icon: BookOpen },
  [ViewMode.PROJECT_SETTINGS]: {
    label: '家族设置',
    icon: Settings,
    mutedIcon: true,
  },
};

const Separator: React.FC = () => (
  <span className="text-muted-foreground/45 mx-1 text-[15px] font-light select-none shrink-0">
    /
  </span>
);

const Breadcrumb: React.FC = () => {
  const navigate = useNavigate();
  const { activeView, activeProjectId, isWorkspaceShell } = useRouteContext();

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const syncProject = useWorkspaceStore((s) => s.syncProject);
  const duplicateProject = useWorkspaceStore((s) => s.duplicateProject);

  const [isProjMenuOpen, setIsProjMenuOpen] = useState(false);
  const [projSearch, setProjSearch] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const projDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        projDropdownRef.current &&
        !projDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProjMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProjMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const workspaceProjects = projects.filter(
    (p) => p.workspaceId === activeWorkspaceId
  );
  const activeProject =
    projects.find((p) => p.id === activeProjectId) ||
    workspaceProjects[0] ||
    projects[0];

  const filteredProjects = workspaceProjects.filter((p) =>
    p.name.toLowerCase().includes(projSearch.toLowerCase())
  );

  const viewBadge =
    isWorkspaceShell && activeView === ViewMode.PROJECTS
      ? null
      : VIEW_BADGE_CONFIG[activeView];

  const handleCreateProject = async (values: AssetEditorSubmitValues) => {
    setCreatingProject(true);
    try {
      const result = await createProjectRequest(activeWorkspaceId, {
        name: values.name.trim(),
        status: values.projectState === '1' ? 'completed' : 'in_progress',
        surname: values.primarySurname?.trim(),
        ancestor: values.ancestor?.trim(),
        hallName: values.primaryName?.trim(),
        originText: formatGenealogyPlace(values.region).trim() || undefined,
        description: values.description.trim() || undefined,
        colorTheme: values.colorTheme,
        projectLevel: values.projectLevel ?? 1,
      });
      if (values.ancestor?.trim()) {
        useLineageStore.getState().initializeProjectLineage(result.project.id, {
          familyName: values.name,
          ancestor: values.ancestor,
          surname: values.primarySurname,
          region: values.region,
        });
      }
      syncProject(result.project);
      setActiveProjectId(result.project.id);
      setIsCreateProjectOpen(false);
      void navigate({
        to: '/projects/$projectId',
        params: { projectId: result.project.id },
      });
    } catch {
      const created = createProject({
        name: values.name,
        description: values.description,
        colorTheme: values.colorTheme,
        primarySurname: values.primarySurname,
        ancestor: values.ancestor,
        region: values.region,
        primaryName: values.primaryName,
        projectState: values.projectState,
        projectLevel: values.projectLevel,
      });
      if (values.ancestor?.trim()) {
        useLineageStore.getState().initializeProjectLineage(created.id, {
          familyName: values.name,
          ancestor: values.ancestor,
          surname: values.primarySurname,
          region: values.region,
        });
      }
      setIsCreateProjectOpen(false);
      void navigate({
        to: '/projects/$projectId',
        params: { projectId: created.id },
      });
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-1 min-w-0"
        data-testid={
          isWorkspaceShell ? 'nc-ws-home-topbar-breadcrumb' : 'nc-project-topbar-breadcrumb'
        }
      >
        <div ref={projDropdownRef} className="relative flex items-center min-w-0">
          <button
            type="button"
            onClick={() => {
              setProjSearch('');
              setIsProjMenuOpen((v) => !v);
            }}
            aria-expanded={isProjMenuOpen}
            data-testid="nc-sidebar-project-selector"
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[hsl(var(--surface-hover))] transition-colors duration-150 min-w-0 max-w-[260px] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ProjectColoredIcon
              colorTheme={
                isWorkspaceShell
                  ? 'indigo'
                  : activeProject?.colorTheme || 'sky'
              }
              className="w-5 h-5 shrink-0"
            />
            <span className="flex-1 truncate text-[14px] font-semibold text-foreground whitespace-nowrap">
              {isWorkspaceShell ? '所有家族' : activeProject?.name || '家族'}
            </span>
            <ChevronsUpDown
              size={13}
              className="text-muted-foreground shrink-0"
            />
          </button>

          {isProjMenuOpen && (
            <div className="absolute top-10 left-0 w-[268px] rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] z-[85] p-1.5">
              {/* Active Project Identity + ID Copy (only inside a specific project) */}
              {!isWorkspaceShell && activeProject && (
                <div className="px-2 py-1.5 mb-1 border-b border-border/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-foreground truncate">
                      {activeProject.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(activeProject.id || '');
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 1500);
                      }}
                      className="inline-flex items-center gap-1 text-[12px] font-mono text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-[hsl(var(--surface-subtle))] border border-border/70 cursor-pointer shrink-0 whitespace-nowrap"
                      title="复制家族 ID"
                    >
                      <span>{copiedId ? '已复制' : 'ID'}</span>
                      {copiedId ? (
                        <Check size={11} className="text-primary" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Search Filter */}
              <div className="relative mb-1.5">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={projSearch}
                  onChange={(e) => setProjSearch(e.target.value)}
                  placeholder="切换家族..."
                  className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-[var(--shadow-focus-halo)]"
                  autoFocus
                />
              </div>

              {/* All Projects Entry */}
              <button
                type="button"
                onClick={() => {
                  setIsProjMenuOpen(false);
                  void navigate({ to: '/' });
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 mb-1 rounded-md text-left text-[13px] transition-colors cursor-pointer ${
                  isWorkspaceShell
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-foreground hover:bg-[hsl(var(--surface-hover))] font-medium'
                }`}
              >
                <Layers size={14} className="text-primary shrink-0" />
                <span className="flex-1 truncate">所有家族</span>
                {isWorkspaceShell && (
                  <Check size={13} className="text-primary shrink-0" />
                )}
              </button>

              <div className="border-t border-border/70 my-1" />

              {/* Project List */}
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredProjects.map((proj) => {
                  const isCurrent = !isWorkspaceShell && proj.id === activeProject?.id;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setIsProjMenuOpen(false);
                        setActiveProjectId(proj.id);
                        void navigate({
                          to: '/projects/$projectId',
                          params: { projectId: proj.id },
                        });
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[13px] transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-foreground hover:bg-[hsl(var(--surface-hover))] font-medium'
                      }`}
                    >
                      <ProjectColoredIcon
                        colorTheme={proj.colorTheme}
                        className="w-4 h-4 shrink-0"
                      />
                      <span className="flex-1 truncate">{proj.name}</span>
                      {isCurrent && (
                        <Check size={13} className="text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <div className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                    未找到匹配家族
                  </div>
                )}
              </div>

              <div className="border-t border-border mt-1.5 pt-1.5 space-y-0.5">
                {!isWorkspaceShell && activeProject && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProjMenuOpen(false);
                        void navigate({
                          to: '/projects/$projectId/settings',
                          params: { projectId: activeProjectId },
                        });
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer"
                    >
                      <Settings size={13} className="text-muted-foreground" />
                      <span>家族设置</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = duplicateProject(activeProject.id);
                        setIsProjMenuOpen(false);
                        if (copy) {
                          void navigate({
                            to: '/projects/$projectId',
                            params: { projectId: copy.id },
                          });
                        }
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer"
                    >
                      <Copy size={13} className="text-muted-foreground" />
                      <span>复制当前家族</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsProjMenuOpen(false);
                    setIsCreateProjectOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium text-primary hover:bg-accent/70 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>新建家族</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {viewBadge && (
          <>
            <Separator />
            <div className="flex items-center gap-1.5 px-1.5 py-1 text-[14px] font-semibold text-foreground whitespace-nowrap shrink-0">
              <viewBadge.icon
                size={14}
                className={
                  viewBadge.mutedIcon ? 'text-muted-foreground' : 'text-primary'
                }
              />
              <span>{viewBadge.label}</span>
            </div>
          </>
        )}
      </div>

      <AssetEditorModal
        open={isCreateProjectOpen}
        mode="create"
        kind="project"
        submitting={creatingProject}
        onClose={() => {
          if (!creatingProject) setIsCreateProjectOpen(false);
        }}
        onSubmit={(values) => void handleCreateProject(values)}
      />
    </>
  );
};

export default Breadcrumb;
