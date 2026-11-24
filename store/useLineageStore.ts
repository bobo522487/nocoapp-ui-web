import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TreeItem } from '../components/common/Tree/types';
import {
  duplicateTreeNode,
  findFirstTreeNodeByType,
  findTreeNode,
  insertTreeNode,
  preserveCollapsedChildren,
  removeTreeNode,
  updateTreeNodeData,
} from '../lib/treeOps';
import { createAsyncEntityStorage } from './storageAdapter';
import type { LineageViewMode, PersonRecord } from '../features/lineage/types';
import { createSeedPersonsForChart } from '../features/lineage/lineageData';
import { parsePlaceText, type GenealogyPlace } from '../features/place-input';
import {
  addParentToPersons,
  deleteSubtreeFromPersons,
  detachPersonFromPersons,
  normalizeSpouseOrderInPersons,
  reorderSiblingInPersons,
} from '../features/lineage/domain/lineageGraph';

export const DEFAULT_LINEAGE_TREE: TreeItem[] = [
  {
    id: 'lineage-group-royal',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】皇族世系参考' },
    children: [
      { id: 'lineage-royal-1', type: 'chart', data: { name: '西汉天潢图系' }, children: [] },
      { id: 'lineage-royal-2', type: 'chart', data: { name: '西汉楚元王交公世系图' }, children: [] },
      { id: 'lineage-royal-3', type: 'chart', data: { name: '西汉梁孝王武之裔图系' }, children: [] },
      { id: 'lineage-royal-4', type: 'chart', data: { name: '东汉天潢图系' }, children: [] },
      { id: 'lineage-royal-5', type: 'chart', data: { name: '蜀汉天潢图系' }, children: [] },
      { id: 'lineage-royal-6', type: 'chart', data: { name: '东汉广陵思王荆之裔图系' }, children: [] },
      { id: 'lineage-royal-7', type: 'chart', data: { name: '南朝宋刘天潢图系' }, children: [] },
    ],
  },
  {
    id: 'lineage-group-other',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】其他世系参考' },
    children: [
      { id: 'lineage-other-1', type: 'chart', data: { name: '小田幼房世派世系图' }, children: [] },
      { id: 'lineage-other-2', type: 'chart', data: { name: '墨山王氏習静位下世系' }, children: [] },
      { id: 'lineage-other-3', type: 'chart', data: { name: '小田幼房世派世系图' }, children: [] },
    ],
  },
  {
    id: 'lineage-group-ancestors',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】远祖世系参考' },
    children: [
      { id: 'lineage-ancestor-1', type: 'chart', data: { name: '彭氏远祖世次' }, children: [] },
    ],
  },
];

export function findFirstChartId(items: TreeItem[]): string | null {
  const hit = findFirstTreeNodeByType(items, 'chart');
  return hit ? String(hit.id) : null;
}

export function makeChartStorageKey(projectId: string, chartId: string): string {
  return `${projectId}::${chartId}`;
}

export interface LineageChartMeta {
  name: string;
  surname?: string;
  hallName?: string;
  progenitor?: string;
  region?: GenealogyPlace | null;
}

export interface LineageState {
  treesByProject: Record<string, TreeItem[]>;
  selectedNodeIdByProject: Record<string, string>;
  personsByChart: Record<string, PersonRecord[]>;
  selectedPersonIdByChart: Record<string, string | null>;
  viewModeByProject: Record<string, LineageViewMode>;

  setTree: (projectId: string, items: TreeItem[]) => void;
  initializeProjectLineage: (
    projectId: string,
    params: {
      familyName: string;
      ancestor: string;
      surname?: string;
      region?: GenealogyPlace | string | null;
    }
  ) => void;
  selectNode: (projectId: string, nodeId: string) => void;
  addGroup: (projectId: string, name?: string) => string;
  addChart: (
    projectId: string,
    parentId?: string,
    input?: string | LineageChartMeta
  ) => string;
  updateChartMeta: (
    projectId: string,
    chartId: string,
    meta: LineageChartMeta
  ) => void;
  renameNode: (projectId: string, id: string, name: string) => void;
  duplicateNode: (projectId: string, id: string) => void;
  removeNode: (projectId: string, id: string) => void;

  setViewMode: (projectId: string, mode: LineageViewMode) => void;
  selectPerson: (projectId: string, chartId: string, personId: string | null) => void;
  commitChartPersons: (
    projectId: string,
    chartId: string,
    persons: PersonRecord[],
    selectedPersonId?: string | null
  ) => void;
  addPerson: (
    projectId: string,
    chartId: string,
    person: PersonRecord,
    chartName?: string,
    surname?: string,
    options?: { select?: boolean }
  ) => void;
  updatePerson: (
    projectId: string,
    chartId: string,
    personId: string,
    updates: Partial<PersonRecord>,
    chartName?: string,
    surname?: string
  ) => void;
  deletePerson: (
    projectId: string,
    chartId: string,
    personId: string,
    chartName?: string,
    surname?: string
  ) => void;
  reorderSibling: (
    projectId: string,
    chartId: string,
    parentId: string,
    childId: string,
    direction: 'up' | 'down',
    chartName?: string,
    surname?: string
  ) => void;
  addParentForPerson: (
    projectId: string,
    chartId: string,
    childId: string,
    parentPerson: PersonRecord,
    chartName?: string,
    surname?: string,
    options?: { select?: boolean }
  ) => void;
  removePersonOnly: (
    projectId: string,
    chartId: string,
    personId: string,
    chartName?: string,
    surname?: string
  ) => void;
}

function getOrSeedChartPersons(
  state: LineageState,
  projectId: string,
  chartId: string,
  chartName?: string,
  surname?: string
): PersonRecord[] {
  const key = makeChartStorageKey(projectId, chartId);
  return (
    state.personsByChart[key] ||
    createSeedPersonsForChart(chartId, chartName, surname)
  );
}

export const useLineageStore = create<LineageState>()(
  persist(
    (set, get) => ({
      treesByProject: {},
      selectedNodeIdByProject: {},
      personsByChart: {},
      selectedPersonIdByChart: {},
      viewModeByProject: {},

      setTree: (projectId, nextItems) =>
        set((state) => {
          const prevItems =
            state.treesByProject[projectId] || structuredClone(DEFAULT_LINEAGE_TREE);
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: preserveCollapsedChildren(prevItems, nextItems),
            },
          };
        }),

      initializeProjectLineage: (
        projectId,
        { familyName, ancestor, surname, region }
      ) =>
        set((state) => {
          if (state.treesByProject[projectId]?.length) return state;
          const cleanFamily = familyName.trim() || '家族';
          const cleanAncestor = ancestor.trim() || '始迁祖';
          const cleanSurname = surname?.trim() || undefined;
          const cleanRegion = parsePlaceText(region) ?? undefined;
          const chartId = `lineage-chart-${Date.now()}`;
          const chartName = `${cleanFamily}总世系`;
          const key = makeChartStorageKey(projectId, chartId);

          const rootTree: TreeItem[] = [
            {
              id: chartId,
              type: 'chart',
              data: {
                name: chartName,
                ...(cleanSurname ? { surname: cleanSurname } : {}),
                progenitor: cleanAncestor,
                ...(cleanRegion ? { region: cleanRegion } : {}),
              },
              children: [],
            },
          ];

          const rootPerson: PersonRecord = {
            id: `${chartId}-root-1`,
            branchId: chartId,
            surname: cleanSurname,
            name: cleanAncestor,
            generation: 1,
            gender: 'male',
            relationTitle: '始迁祖',
            status: 'deceased',
            fatherId: null,
            biography: `「${cleanFamily}」始迁祖，可点击节点上方或右侧档案面板继续添录配偶、子嗣与生平传记。`,
            sequenceMeta: { originalPage: 1 },
            biographyOrder: 1,
          };

          return {
            treesByProject: { ...state.treesByProject, [projectId]: rootTree },
            selectedNodeIdByProject: { ...state.selectedNodeIdByProject, [projectId]: chartId },
            personsByChart: { ...state.personsByChart, [key]: [rootPerson] },
            selectedPersonIdByChart: { ...state.selectedPersonIdByChart, [key]: null },
          };
        }),

      selectNode: (projectId, nodeId) =>
        set((state) => ({
          selectedNodeIdByProject: { ...state.selectedNodeIdByProject, [projectId]: nodeId },
        })),

      addGroup: (projectId, name) => {
        const id = `lineage-group-${Date.now()}`;
        const current = get().treesByProject[projectId] || structuredClone(DEFAULT_LINEAGE_TREE);
        const newGroup: TreeItem = {
          id,
          type: 'folder',
          collapsed: false,
          data: { name: name?.trim() || '新建世系分组' },
          children: [],
        };
        set((state) => ({
          treesByProject: { ...state.treesByProject, [projectId]: [...current, newGroup] },
          selectedNodeIdByProject: { ...state.selectedNodeIdByProject, [projectId]: id },
        }));
        return id;
      },

      addChart: (projectId, parentId, input) => {
        const id = `lineage-chart-${Date.now()}`;
        const meta: LineageChartMeta =
          typeof input === 'string' ? { name: input } : input || { name: '新建世系图' };
        const chartName = meta.name?.trim() || '新建世系图';
        const cleanSurname = meta.surname?.trim() || undefined;
        const cleanHall = meta.hallName?.trim() || undefined;
        const cleanProgenitor = meta.progenitor?.trim() || undefined;
        const cleanRegion = parsePlaceText(meta.region) ?? undefined;

        const current = get().treesByProject[projectId] || structuredClone(DEFAULT_LINEAGE_TREE);
        const newChart: TreeItem = {
          id,
          type: 'chart',
          data: {
            name: chartName,
            ...(cleanSurname ? { surname: cleanSurname } : {}),
            ...(cleanHall ? { hallName: cleanHall } : {}),
            ...(cleanProgenitor ? { progenitor: cleanProgenitor } : {}),
            ...(cleanRegion ? { region: cleanRegion } : {}),
          },
          children: [],
        };

        const key = makeChartStorageKey(projectId, id);
        const seed = createSeedPersonsForChart(id, chartName, cleanSurname, cleanProgenitor);

        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: insertTreeNode(current, newChart, parentId),
          },
          selectedNodeIdByProject: { ...state.selectedNodeIdByProject, [projectId]: id },
          personsByChart: { ...state.personsByChart, [key]: seed },
          selectedPersonIdByChart: { ...state.selectedPersonIdByChart, [key]: null },
        }));
        return id;
      },

      updateChartMeta: (projectId, chartId, meta) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || structuredClone(DEFAULT_LINEAGE_TREE);
          const prevNode = findTreeNode(current, chartId);
          const cleanName = meta.name.trim() || prevNode?.data?.name || '世系图';
          const cleanSurname = meta.surname?.trim() || '';
          const cleanHall = meta.hallName?.trim() || '';
          const cleanProgenitor = meta.progenitor?.trim() || '';
          const cleanRegion = parsePlaceText(meta.region) ?? undefined;

          const updatedTree = updateTreeNodeData(current, chartId, (data) => ({
            ...data,
            name: cleanName,
            surname: cleanSurname || undefined,
            hallName: cleanHall || undefined,
            progenitor: cleanProgenitor || undefined,
            region: cleanRegion,
          }));

          const key = makeChartStorageKey(projectId, chartId);
          const existingPersons = state.personsByChart[key];
          let nextPersonsByChart = state.personsByChart;

          if (existingPersons && existingPersons.length > 0) {
            const prevProgenitor = prevNode?.data?.progenitor?.trim();
            const rootId = `${chartId}-root-1`;
            const hasExplicitRoot = existingPersons.some((p) => p.id === rootId);
            const firstGenRoots = existingPersons.filter(
              (p) => p.generation === 1 && !p.fatherId && !p.spouseOfId
            );
            const targetRootId = hasExplicitRoot
              ? rootId
              : firstGenRoots.length === 1
                ? firstGenRoots[0].id
                : null;

            const updatedPersons = existingPersons.map((p) => {
              const isRootTarget = targetRootId !== null && p.id === targetRootId;
              const shouldUpdateName =
                isRootTarget &&
                cleanProgenitor &&
                (p.name !== cleanProgenitor || prevProgenitor === p.name);
              return {
                ...p,
                ...(isRootTarget && shouldUpdateName ? { name: cleanProgenitor } : {}),
                ...(isRootTarget && cleanSurname ? { surname: cleanSurname } : {}),
              };
            });

            nextPersonsByChart = { ...state.personsByChart, [key]: updatedPersons };
          }

          return {
            treesByProject: { ...state.treesByProject, [projectId]: updatedTree },
            personsByChart: nextPersonsByChart,
          };
        }),

      renameNode: (projectId, id, name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const current =
            state.treesByProject[projectId] || structuredClone(DEFAULT_LINEAGE_TREE);
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: updateTreeNodeData(current, id, (data) => ({
                ...data,
                name: trimmed,
              })),
            },
          };
        }),

      duplicateNode: (projectId, id) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || structuredClone(DEFAULT_LINEAGE_TREE);
          const nextPersonsByChart = { ...state.personsByChart };
          const nextTree = duplicateTreeNode(current, id, (srcId, dstId, node) => {
            if (node.type !== 'chart') return;
            const srcPersons =
              state.personsByChart[makeChartStorageKey(projectId, srcId)] ||
              createSeedPersonsForChart(srcId, node.data?.name);
            nextPersonsByChart[makeChartStorageKey(projectId, dstId)] =
              structuredClone(srcPersons);
          });
          return {
            treesByProject: { ...state.treesByProject, [projectId]: nextTree },
            personsByChart: nextPersonsByChart,
          };
        }),

      removeNode: (projectId, id) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || structuredClone(DEFAULT_LINEAGE_TREE);
          const nextTree = removeTreeNode(current, id);
          const currentSelected = state.selectedNodeIdByProject[projectId];
          const nextSelected =
            currentSelected === id
              ? findFirstChartId(nextTree) || String(nextTree[0]?.id || '')
              : currentSelected;
          const nextPersons = { ...state.personsByChart };
          delete nextPersons[makeChartStorageKey(projectId, id)];
          return {
            treesByProject: { ...state.treesByProject, [projectId]: nextTree },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]: nextSelected,
            },
            personsByChart: nextPersons,
          };
        }),

      setViewMode: (projectId, mode) =>
        set((state) => ({
          viewModeByProject: { ...state.viewModeByProject, [projectId]: mode },
        })),

      selectPerson: (projectId, chartId, personId) =>
        set((state) => ({
          selectedPersonIdByChart: {
            ...state.selectedPersonIdByChart,
            [makeChartStorageKey(projectId, chartId)]: personId,
          },
        })),

      commitChartPersons: (projectId, chartId, persons, selectedPersonId) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          return {
            personsByChart: { ...state.personsByChart, [key]: persons },
            ...(selectedPersonId !== undefined
              ? {
                  selectedPersonIdByChart: {
                    ...state.selectedPersonIdByChart,
                    [key]: selectedPersonId,
                  },
                }
              : {}),
          };
        }),

      addPerson: (projectId, chartId, person, chartName, surname, options) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons = getOrSeedChartPersons(
            state,
            projectId,
            chartId,
            chartName,
            surname
          );
          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: [...currentPersons, person],
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: options?.select !== false ? person.id : null,
            },
          };
        }),

      updatePerson: (projectId, chartId, personId, updates, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons = getOrSeedChartPersons(
            state,
            projectId,
            chartId,
            chartName,
            surname
          );
          let updatedList = currentPersons.map((p) =>
            p.id === personId ? { ...p, ...updates } : p
          );
          const target = updatedList.find((p) => p.id === personId);
          if (target?.spouseOfId && updates.siblingOrder !== undefined) {
            updatedList = normalizeSpouseOrderInPersons(
              updatedList,
              target.spouseOfId,
              target.id,
              Number(updates.siblingOrder)
            );
          }
          return {
            personsByChart: { ...state.personsByChart, [key]: updatedList },
          };
        }),

      deletePerson: (projectId, chartId, personId, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons = getOrSeedChartPersons(
            state,
            projectId,
            chartId,
            chartName,
            surname
          );
          const { persons: remaining, deletedIds } = deleteSubtreeFromPersons(
            currentPersons,
            personId
          );
          const currentSel = state.selectedPersonIdByChart[key];
          return {
            personsByChart: { ...state.personsByChart, [key]: remaining },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: currentSel && deletedIds.has(currentSel) ? null : currentSel,
            },
          };
        }),

      reorderSibling: (projectId, chartId, parentId, childId, direction, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons = getOrSeedChartPersons(
            state,
            projectId,
            chartId,
            chartName,
            surname
          );
          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: reorderSiblingInPersons(currentPersons, parentId, childId, direction),
            },
          };
        }),

      addParentForPerson: (
        projectId,
        chartId,
        childId,
        parentPerson,
        chartName,
        surname,
        options
      ) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons = getOrSeedChartPersons(
            state,
            projectId,
            chartId,
            chartName,
            surname
          );
          const { persons, addedParentId } = addParentToPersons(
            currentPersons,
            childId,
            parentPerson
          );
          if (!addedParentId) return state;
          return {
            personsByChart: { ...state.personsByChart, [key]: persons },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: options?.select !== false ? addedParentId : null,
            },
          };
        }),

      removePersonOnly: (projectId, chartId, personId, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons = getOrSeedChartPersons(
            state,
            projectId,
            chartId,
            chartName,
            surname
          );
          const cleaned = detachPersonFromPersons(currentPersons, personId);
          const currentSel = state.selectedPersonIdByChart[key];
          return {
            personsByChart: { ...state.personsByChart, [key]: cleaned },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: currentSel === personId ? null : currentSel,
            },
          };
        }),
    }),
    {
      name: 'yunpu:lineage',
      version: 1,
      storage: createAsyncEntityStorage(),
      partialize: (state) => ({
        treesByProject: state.treesByProject,
        selectedNodeIdByProject: state.selectedNodeIdByProject,
        personsByChart: state.personsByChart,
        viewModeByProject: state.viewModeByProject,
      }),
    }
  )
);
