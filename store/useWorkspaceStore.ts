import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AssetColorTheme,
  ProjectItem,
  Workspace,
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

export interface ApiProjectPayload {
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
}

function mapApiProjectToItem(
  project: ApiProjectPayload,
  existing?: ProjectItem
): ProjectItem {
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
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeProjectId: string;
  projects: ProjectItem[];
  notifications: WorkspaceNotification[];
  searchQuery: string;
  zibeiByProject: Record<string, string[]>;

  setSearchQuery: (query: string) => void;
  setProjectZibei: (projectId: string, words: string[]) => void;
  hydrateFromApi: () => Promise<void>;
  setCurrentOrganization: (workspaceId: string) => Promise<void>;
  resolveNextAvailableOrganization: () => Workspace | null;
  setActiveProjectId: (projectId: string) => void;

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
  syncProject: (project: ApiProjectPayload) => void;
  syncWorkspaceProjects: (organizationId: string, items: ApiProjectPayload[]) => void;
  dropProject: (projectId: string) => void;
  updateProject: (id: string, updates: Partial<ProjectItem>) => void;
  duplicateProject: (id: string) => ProjectItem | null;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const ORG_COLORS = ['#057091', '#2C7A92', '#0D9488', '#3B82A6', '#58B1CD'];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: INITIAL_WORKSPACES,
      activeWorkspaceId: INITIAL_WORKSPACES[0].id,
      activeProjectId: INITIAL_PROJECTS[0].id,
      projects: INITIAL_PROJECTS,
      notifications: INITIAL_NOTIFICATIONS,
      searchQuery: '',
      zibeiByProject: {
        'proj-chen-yimen': ['旺', '崇', '仲', '伯', '叔', '季', '文', '明', '昌', '盛'],
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setProjectZibei: (projectId, words) =>
        set((state) => ({
          zibeiByProject: { ...(state.zibeiByProject || {}), [projectId]: words },
        })),

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
          const item = mapApiProjectToItem(project, existing);
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
          const synced = items.map((project) =>
            mapApiProjectToItem(
              project,
              state.projects.find((p) => p.id === project.id)
            )
          );
          return { projects: [...otherProjects, ...synced] };
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
      name: 'yunpu:workspace',
      version: 1,
      storage: createAppStorage(),
    }
  )
);
