import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AppItem,
  AssetColorTheme,
  ProjectItem,
  Workspace,
  WorkspaceMember,
  WorkspaceNotification,
} from '../types';
import {
  activateOrganizationRequest,
  fetchOrganizations,
} from '../features/dashboard/api';
import { parsePlaceText, type GenealogyPlace } from '../features/place-input';
import { createAppStorage } from './storageAdapter';

export const ASSET_COLOR_PALETTES: Record<
  AssetColorTheme,
  { tileBg: string; darkTileBg: string; fillDark: string; fillLight: string; label: string }
> = {
  sky: {
    tileBg: '#EAF4F7',
    darkTileBg: 'rgba(88, 177, 205, 0.16)',
    fillDark: '#057091',
    fillLight: '#3E9EB8',
    label: '青蓝',
  },
  pink: {
    tileBg: '#F6EAE8',
    darkTileBg: 'rgba(176, 86, 75, 0.16)',
    fillDark: '#7B281E',
    fillLight: '#C05A4C',
    label: '朱砂',
  },
  orange: {
    tileBg: '#F7EFE2',
    darkTileBg: 'rgba(181, 125, 58, 0.16)',
    fillDark: '#734A1A',
    fillLight: '#B8823D',
    label: '琥珀',
  },
  indigo: {
    tileBg: '#EAEDF5',
    darkTileBg: 'rgba(79, 102, 155, 0.18)',
    fillDark: '#2A3B66',
    fillLight: '#5770A8',
    label: '靛蓝',
  },
  emerald: {
    tileBg: '#E9F2EC',
    darkTileBg: 'rgba(69, 128, 96, 0.16)',
    fillDark: '#234D38',
    fillLight: '#4D8B6B',
    label: '竹青',
  },
  violet: {
    tileBg: '#EFEBE7',
    darkTileBg: 'rgba(130, 107, 94, 0.18)',
    fillDark: '#4D3B32',
    fillLight: '#8B7263',
    label: '紫檀',
  },
};

const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws-personal',
    name: '个人空间',
    kind: 'personal',
    color: '#057091',
    plan: '免费版',
    createdAt: '2026-01-12',
  },
  {
    id: 'ws-team',
    name: '宗亲修谱空间',
    kind: 'team',
    color: '#2C7A92',
    plan: '团队版',
    createdAt: '2026-03-04',
  },
];

const LEGACY_MOCK_PROJECT_IDS = new Set([
  'proj-getting-started',
  'proj-sales-crm',
  'proj-inventory',
  'proj-supply-chain',
]);

const LEGACY_MOCK_APP_IDS = new Set(['app-order-mgmt', 'app-analytics-hub']);

const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-chen-yimen',
    workspaceId: 'ws-personal',
    name: '义门陈氏宗谱',
    description: '梳理义门陈氏历代迁徙源流、分庄支派及世系行传。',
    colorTheme: 'sky',
    ownerType: 'owned',
    defaultTableId: 'clan_members',
    updatedAt: '2 小时前',
    primarySurname: '陈',
    ancestor: '陈旺',
    primaryName: '义门陈氏宗谱',
    region: parsePlaceText('江西省/九江市/德安县'),
    projectState: '0',
    projectLevel: 5,
  },
  {
    id: 'proj-han-royal',
    workspaceId: 'ws-personal',
    name: '两汉刘氏天潢谱',
    description: '收录西汉、东汉及蜀汉宗室世系图谱与帝王行传参考。',
    colorTheme: 'indigo',
    ownerType: 'owned',
    defaultTableId: 'clan_members',
    updatedAt: '1 天前',
    primarySurname: '刘',
    ancestor: '刘邦',
    primaryName: '丰沛刘氏天潢',
    region: parsePlaceText('江苏省/徐州市/丰县'),
    projectState: '1',
    projectLevel: 4,
  },
  {
    id: 'proj-peng-ancestors',
    workspaceId: 'ws-team',
    name: '彭城远祖合修谱',
    description: '宗亲协同校勘各房世派字辈、墓茔坐向与行状传记。',
    colorTheme: 'emerald',
    ownerType: 'shared',
    defaultTableId: 'branch_records',
    updatedAt: '5 小时前',
    primarySurname: '彭',
    ancestor: '彭祖',
    primaryName: '彭城彭氏合谱',
    region: parsePlaceText('贵州省/遵义市/桐梓县'),
    projectState: '0',
    projectLevel: 4,
  },
];

const INITIAL_APPS: AppItem[] = [];

const INITIAL_MEMBERS: WorkspaceMember[] = [
  {
    id: 'mem-1',
    workspaceId: 'ws-personal',
    name: '电波',
    email: 'bobo522487@gmail.com',
    role: '所有者',
    joinedAt: '2026-01-12',
    avatarColor: '#057091',
  },
  {
    id: 'mem-2',
    workspaceId: 'ws-personal',
    name: '林晓',
    email: 'linxiao@yunpu.cn',
    role: '编辑者',
    joinedAt: '2026-02-18',
    avatarColor: '#2C7A92',
  },
  {
    id: 'mem-3',
    workspaceId: 'ws-team',
    name: '电波',
    email: 'bobo522487@gmail.com',
    role: '所有者',
    joinedAt: '2026-03-04',
    avatarColor: '#057091',
  },
  {
    id: 'mem-4',
    workspaceId: 'ws-team',
    name: '陈默',
    email: 'chenmo@yunpu.cn',
    role: '管理员',
    joinedAt: '2026-03-10',
    avatarColor: '#047857',
  },
];

const INITIAL_NOTIFICATIONS: WorkspaceNotification[] = [
  {
    id: 'notif-genealogy-1',
    title: '世系图谱已更新',
    description: '「义门陈氏宗谱」中的西汉天潢图系已收录族人节点。',
    time: '10 分钟前',
    read: false,
  },
  {
    id: 'notif-genealogy-2',
    title: '宗亲加入修谱空间',
    description: '林晓 已接受邀请加入「个人空间」。',
    time: '2 小时前',
    read: false,
  },
];

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeProjectId: string;
  projects: ProjectItem[];
  apps: AppItem[];
  members: WorkspaceMember[];
  notifications: WorkspaceNotification[];
  searchQuery: string;
  zibeiByProject: Record<string, string[]>;

  setSearchQuery: (query: string) => void;
  setProjectZibei: (projectId: string, words: string[]) => void;
  switchWorkspace: (workspaceId: string) => void;
  hydrateFromApi: () => Promise<void>;
  setCurrentOrganization: (workspaceId: string) => Promise<void>;
  resolveNextAvailableOrganization: () => Workspace | null;
  setActiveProjectId: (projectId: string) => void;
  createWorkspace: (name: string) => Workspace;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;

  createProject: (payload: {
    name: string;
    description?: string;
    colorTheme: AssetColorTheme;
    defaultTableId?: string;
    primarySurname?: string;
    ancestor?: string;
    region?: GenealogyPlace | string | null;
    primaryName?: string;
    projectState?: '0' | '1';
    projectLevel?: number;
  }) => ProjectItem;
  syncProject: (project: {
    id: string;
    organizationId: string;
    name: string;
    description?: string | null;
    surname?: string | null;
    ancestor?: string | null;
    hallName?: string | null;
    originText?: string | null;
    status?: 'planning' | 'in_progress' | 'completed';
    colorTheme?: AssetColorTheme;
    projectLevel?: number;
    updatedAt: string;
  }) => void;
  syncWorkspaceProjects: (
    organizationId: string,
    items: Array<{
      id: string;
      organizationId: string;
      name: string;
      description?: string | null;
      surname?: string | null;
      ancestor?: string | null;
      hallName?: string | null;
      originText?: string | null;
      status?: 'planning' | 'in_progress' | 'completed';
      colorTheme?: AssetColorTheme;
      projectLevel?: number;
      updatedAt: string;
    }>
  ) => void;
  dropProject: (projectId: string) => void;
  updateProject: (id: string, updates: Partial<ProjectItem>) => void;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => ProjectItem | null;
  deleteProject: (id: string) => void;

  createApp: (payload: {
    name: string;
    description?: string;
    colorTheme: AssetColorTheme;
    defaultPageId?: string;
  }) => AppItem;
  updateApp: (id: string, updates: Partial<AppItem>) => void;
  renameApp: (id: string, name: string) => void;
  duplicateApp: (id: string) => AppItem | null;
  deleteApp: (id: string) => void;

  inviteMember: (payload: {
    name: string;
    email: string;
    role: WorkspaceMember['role'];
  }) => void;
  updateMemberRole: (memberId: string, role: WorkspaceMember['role']) => void;
  removeMember: (memberId: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const AVATAR_COLORS = ['#057091', '#2C7A92', '#0D9488', '#3B82A6', '#475569'];
const ORG_COLORS = ['#057091', '#2C7A92', '#0D9488', '#3B82A6', '#58B1CD'];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: INITIAL_WORKSPACES,
      activeWorkspaceId: INITIAL_WORKSPACES[0].id,
      activeProjectId: INITIAL_PROJECTS[0].id,
      projects: INITIAL_PROJECTS,
      apps: INITIAL_APPS,
      members: INITIAL_MEMBERS,
      notifications: INITIAL_NOTIFICATIONS,
      searchQuery: '',
      zibeiByProject: {
        'proj-chen-yimen': ['旺', '崇', '仲', '伯', '叔', '季', '文', '明', '昌', '盛'],
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setProjectZibei: (projectId, words) =>
        set((state) => ({
          zibeiByProject: {
            ...(state.zibeiByProject || {}),
            [projectId]: words,
          },
        })),

      switchWorkspace: (activeWorkspaceId) =>
        set((state) => {
          const wsProjects = state.projects.filter(
            (p) => p.workspaceId === activeWorkspaceId
          );
          const currentMatches = wsProjects.some(
            (p) => p.id === state.activeProjectId
          );
          return {
            activeWorkspaceId,
            activeProjectId: currentMatches
              ? state.activeProjectId
              : wsProjects[0]?.id || state.activeProjectId,
          };
        }),

      hydrateFromApi: async () => {
        try {
          const payload = await fetchOrganizations();
          const workspaces: Workspace[] = payload.organizations.map(
            (org, index) => ({
              id: org.id,
              name: org.name,
              kind: 'team',
              color: ORG_COLORS[index % ORG_COLORS.length],
              plan: '组织',
              createdAt: (org.lastUsedAt ?? '').slice(0, 10) || '—',
            })
          );
          set((state) => {
            const activeExists = workspaces.some(
              (w) => w.id === state.activeWorkspaceId
            );
            const fallbackExists =
              payload.defaultOrganizationId !== null &&
              workspaces.some((w) => w.id === payload.defaultOrganizationId);
            return {
              workspaces,
              activeWorkspaceId: activeExists
                ? state.activeWorkspaceId
                : fallbackExists
                  ? (payload.defaultOrganizationId as string)
                  : (workspaces[0]?.id ?? state.activeWorkspaceId),
            };
          });
        } catch (error) {
          set({ workspaces: [] });
          throw error;
        }
      },

      setCurrentOrganization: async (workspaceId) => {
        await activateOrganizationRequest(workspaceId);
        set((state) => {
          const wsProjects = state.projects.filter(
            (p) => p.workspaceId === workspaceId
          );
          return {
            activeWorkspaceId: workspaceId,
            activeProjectId: wsProjects.some((p) => p.id === state.activeProjectId)
              ? state.activeProjectId
              : (wsProjects[0]?.id ?? ''),
          };
        });
      },

      resolveNextAvailableOrganization: () => {
        const state = get();
        return (
          state.workspaces.find((w) => w.id !== state.activeWorkspaceId) ?? null
        );
      },

      setActiveProjectId: (activeProjectId) =>
        set((state) => {
          const proj = state.projects.find((p) => p.id === activeProjectId);
          if (proj && proj.workspaceId !== state.activeWorkspaceId) {
            return { activeProjectId, activeWorkspaceId: proj.workspaceId };
          }
          return { activeProjectId };
        }),

      createWorkspace: (name) => {
        const colors = ['#057091', '#2C7A92', '#0D9488', '#3B82A6', '#58B1CD'];
        const newWs: Workspace = {
          id: `ws-${Date.now()}`,
          name: name.trim(),
          kind: 'team',
          color: colors[get().workspaces.length % colors.length],
          plan: '免费版',
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set((state) => ({
          workspaces: [...state.workspaces, newWs],
          activeWorkspaceId: newWs.id,
        }));
        return newWs;
      },

      updateWorkspace: (workspaceId, updates) =>
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === workspaceId ? { ...ws, ...updates } : ws
          ),
        })),

      createProject: ({
        name,
        description,
        colorTheme,
        defaultTableId,
        primarySurname,
        ancestor,
        region,
        primaryName,
        projectState,
        projectLevel,
      }) => {
        const newProj: ProjectItem = {
          id: `proj-${Date.now()}`,
          workspaceId: get().activeWorkspaceId,
          name: name.trim(),
          description: description?.trim() || '',
          colorTheme,
          ownerType: 'owned',
          defaultTableId: defaultTableId || '',
          updatedAt: '刚刚',
          primarySurname: primarySurname?.trim() || undefined,
          ancestor: ancestor?.trim() || undefined,
          region: parsePlaceText(region),
          primaryName: primaryName?.trim() || undefined,
          projectState: projectState || '0',
          projectLevel: projectLevel ?? 1,
        };
        set((state) => ({
          projects: [...state.projects, newProj],
          activeProjectId: newProj.id,
        }));
        return newProj;
      },

      syncProject: (project) =>
        set((state) => {
          const existing = state.projects.find((p) => p.id === project.id);
          const resolvedRegion =
            project.originText !== undefined
              ? parsePlaceText(project.originText)
              : existing?.region ?? null;
          const item: ProjectItem = {
            id: project.id,
            workspaceId: project.organizationId,
            name: project.name,
            description: project.description ?? existing?.description,
            colorTheme: project.colorTheme ?? existing?.colorTheme ?? 'sky',
            ownerType: existing?.ownerType ?? 'owned',
            defaultTableId: existing?.defaultTableId ?? '',
            primarySurname: project.surname ?? existing?.primarySurname,
            ancestor: project.ancestor ?? existing?.ancestor,
            primaryName: project.hallName ?? existing?.primaryName,
            region: resolvedRegion,
            projectState:
              project.status !== undefined
                ? project.status === 'completed'
                  ? '1'
                  : '0'
                : existing?.projectState,
            projectLevel: project.projectLevel ?? existing?.projectLevel,
            updatedAt: new Date(project.updatedAt).toLocaleDateString(),
          };
          return {
            projects: existing
              ? state.projects.map((p) => (p.id === project.id ? item : p))
              : [...state.projects, item],
          };
        }),

      syncWorkspaceProjects: (organizationId, items) =>
        set((state) => {
          const otherProjects = state.projects.filter(
            (p) => p.workspaceId !== organizationId
          );
          const synced: ProjectItem[] = items.map((project) => {
            const existing = state.projects.find((p) => p.id === project.id);
            const resolvedRegion =
              project.originText !== undefined
                ? parsePlaceText(project.originText)
                : existing?.region ?? null;
            return {
              id: project.id,
              workspaceId: project.organizationId,
              name: project.name,
              description: project.description ?? existing?.description,
              colorTheme: project.colorTheme ?? existing?.colorTheme ?? 'sky',
              ownerType: existing?.ownerType ?? 'owned',
              defaultTableId: existing?.defaultTableId ?? '',
              primarySurname: project.surname ?? existing?.primarySurname,
              ancestor: project.ancestor ?? existing?.ancestor,
              primaryName: project.hallName ?? existing?.primaryName,
              region: resolvedRegion,
              projectState:
                project.status !== undefined
                  ? project.status === 'completed'
                    ? '1'
                    : '0'
                  : existing?.projectState,
              projectLevel: project.projectLevel ?? existing?.projectLevel,
              updatedAt: new Date(project.updatedAt).toLocaleDateString(),
            };
          });
          return {
            projects: [...otherProjects, ...synced],
          };
        }),

      dropProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          activeProjectId:
            state.activeProjectId === projectId ? '' : state.activeProjectId,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: '刚刚' } : p
          ),
        })),

      renameProject: (id, name) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: '刚刚' } : p
          ),
        })),

      duplicateProject: (id) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return null;
        const copy: ProjectItem = {
          ...structuredClone(source),
          id: `proj-${Date.now()}`,
          name: `${source.name} (副本)`,
          ownerType: 'owned',
          updatedAt: '刚刚',
        };
        set((state) => ({
          projects: [...state.projects, copy],
          activeProjectId: copy.id,
        }));
        return copy;
      },

      deleteProject: (id) =>
        set((state) => {
          const remaining = state.projects.filter((p) => p.id !== id);
          const nextProj =
            remaining.find((p) => p.workspaceId === state.activeWorkspaceId) ||
            remaining[0];
          return {
            projects: remaining,
            activeProjectId:
              state.activeProjectId === id
                ? nextProj?.id || ''
                : state.activeProjectId,
          };
        }),

      createApp: ({ name, description, colorTheme, defaultPageId }) => {
        const newApp: AppItem = {
          id: `app-${Date.now()}`,
          workspaceId: get().activeWorkspaceId,
          name: name.trim(),
          description: description?.trim() || '可视化低代码应用',
          colorTheme,
          ownerType: 'owned',
          defaultPageId: defaultPageId || 'page-1',
          updatedAt: '刚刚',
        };
        set((state) => ({ apps: [...state.apps, newApp] }));
        return newApp;
      },

      updateApp: (id, updates) =>
        set((state) => ({
          apps: state.apps.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: '刚刚' } : a
          ),
        })),

      renameApp: (id, name) =>
        set((state) => ({
          apps: state.apps.map((a) =>
            a.id === id ? { ...a, name: name.trim() || a.name, updatedAt: '刚刚' } : a
          ),
        })),

      duplicateApp: (id) => {
        const source = get().apps.find((a) => a.id === id);
        if (!source) return null;
        const copy: AppItem = {
          ...source,
          id: `app-${Date.now()}`,
          name: `${source.name} (副本)`,
          ownerType: 'owned',
          updatedAt: '刚刚',
        };
        set((state) => ({ apps: [...state.apps, copy] }));
        return copy;
      },

      deleteApp: (id) =>
        set((state) => ({
          apps: state.apps.filter((a) => a.id !== id),
        })),

      inviteMember: ({ name, email, role }) =>
        set((state) => ({
          members: [
            ...state.members,
            {
              id: `mem-${Date.now()}`,
              workspaceId: state.activeWorkspaceId,
              name: name.trim(),
              email: email.trim(),
              role,
              joinedAt: new Date().toISOString().slice(0, 10),
              avatarColor: AVATAR_COLORS[state.members.length % AVATAR_COLORS.length],
            },
          ],
        })),

      updateMemberRole: (memberId, role) =>
        set((state) => ({
          members: state.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
        })),

      removeMember: (memberId) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
    }),
    {
      name: 'nocoapp:workspace',
      version: 3,
      storage: createAppStorage(),
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;

        let nextState = { ...persistedState };

        if (version < 2) {
          const prevProjects: ProjectItem[] = Array.isArray(nextState.projects)
            ? nextState.projects.filter(
                (p: ProjectItem) => !LEGACY_MOCK_PROJECT_IDS.has(p.id)
              )
            : [];

          const mergedProjects = [...INITIAL_PROJECTS];
          for (const proj of prevProjects) {
            if (!mergedProjects.some((p) => p.id === proj.id)) {
              mergedProjects.push(proj);
            }
          }

          const prevApps: AppItem[] = Array.isArray(nextState.apps)
            ? nextState.apps.filter(
                (a: AppItem) => !LEGACY_MOCK_APP_IDS.has(a.id)
              )
            : [];

          const nextWorkspaces: Workspace[] = Array.isArray(nextState.workspaces)
            ? nextState.workspaces.map((ws: Workspace) =>
                ws.id === 'ws-team' && ws.name === '研发协同空间'
                  ? { ...ws, name: '宗亲修谱空间' }
                  : ws
              )
            : INITIAL_WORKSPACES;

          const prevActiveProj = nextState.activeProjectId;
          const nextActiveProj =
            prevActiveProj &&
            !LEGACY_MOCK_PROJECT_IDS.has(prevActiveProj) &&
            mergedProjects.some((p) => p.id === prevActiveProj)
              ? prevActiveProj
              : mergedProjects[0]?.id || 'proj-chen-yimen';

          nextState = {
            ...nextState,
            workspaces: nextWorkspaces,
            projects: mergedProjects,
            apps: prevApps,
            activeProjectId: nextActiveProj,
            notifications: INITIAL_NOTIFICATIONS,
          };
        }

        if (version < 3) {
          const migratedProjects = Array.isArray(nextState.projects)
            ? nextState.projects.map((p: ProjectItem & { region?: GenealogyPlace | string | null }) => ({
                ...p,
                region: parsePlaceText(p.region),
              }))
            : INITIAL_PROJECTS;
          nextState = {
            ...nextState,
            projects: migratedProjects,
          };
        }

        return nextState;
      },
    }
  )
);
