import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TreeItem } from '../components/common/Tree/types';
import { findItemDeep, removeItem, setProperty } from '../components/common/Tree/utilities';
import { createAppStorage } from './storageAdapter';
import { LineageViewMode, PersonRecord } from '../features/lineage/types';
import { createSeedPersonsForChart } from '../features/lineage/lineageData';

export const DEFAULT_LINEAGE_TREE: TreeItem[] = [
  {
    id: 'lineage-group-royal',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】皇族世系参考' },
    children: [
      {
        id: 'lineage-royal-1',
        type: 'chart',
        data: { name: '西汉天潢图系' },
        children: [],
      },
      {
        id: 'lineage-royal-2',
        type: 'chart',
        data: { name: '西汉楚元王交公世系图' },
        children: [],
      },
      {
        id: 'lineage-royal-3',
        type: 'chart',
        data: { name: '西汉梁孝王武之裔图系' },
        children: [],
      },
      {
        id: 'lineage-royal-4',
        type: 'chart',
        data: { name: '东汉天潢图系' },
        children: [],
      },
      {
        id: 'lineage-royal-5',
        type: 'chart',
        data: { name: '蜀汉天潢图系' },
        children: [],
      },
      {
        id: 'lineage-royal-6',
        type: 'chart',
        data: { name: '东汉广陵思王荆之裔图系' },
        children: [],
      },
      {
        id: 'lineage-royal-7',
        type: 'chart',
        data: { name: '南朝宋刘天潢图系' },
        children: [],
      },
    ],
  },
  {
    id: 'lineage-group-other',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】其他世系参考' },
    children: [
      {
        id: 'lineage-other-1',
        type: 'chart',
        data: { name: '小田幼房世派世系图' },
        children: [],
      },
      {
        id: 'lineage-other-2',
        type: 'chart',
        data: { name: '墨山王氏習静位下世系' },
        children: [],
      },
      {
        id: 'lineage-other-3',
        type: 'chart',
        data: { name: '小田幼房世派世系图' },
        children: [],
      },
    ],
  },
  {
    id: 'lineage-group-ancestors',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】远祖世系参考' },
    children: [
      {
        id: 'lineage-ancestor-1',
        type: 'chart',
        data: { name: '彭氏远祖世次' },
        children: [],
      },
    ],
  },
];

export function findFirstChartId(items: TreeItem[]): string | null {
  for (const item of items) {
    if (item.type === 'chart') {
      return String(item.id);
    }
    if (item.children?.length) {
      const found = findFirstChartId(item.children);
      if (found) return found;
    }
  }
  return null;
}

export function countChartsInTree(items: TreeItem[]): number {
  let count = 0;
  for (const item of items) {
    if (item.type === 'chart') {
      count += 1;
    } else if (item.children?.length) {
      count += countChartsInTree(item.children);
    }
  }
  return count;
}

export function makeChartStorageKey(projectId: string, chartId: string): string {
  return `${projectId}::${chartId}`;
}

function cloneDefaultTree(): TreeItem[] {
  return JSON.parse(JSON.stringify(DEFAULT_LINEAGE_TREE));
}

function preserveCollapsedChildren(
  prevItems: TreeItem[],
  nextItems: TreeItem[]
): TreeItem[] {
  return nextItems.map((item) => {
    const prevNode = findItemDeep(prevItems, item.id);
    const restoredChildren =
      item.collapsed && item.children.length === 0 && prevNode?.children?.length
        ? prevNode.children
        : preserveCollapsedChildren(prevItems, item.children || []);
    return {
      ...item,
      children: restoredChildren,
    };
  });
}

function cloneSubtreeWithNewIds(node: TreeItem, suffix: string): TreeItem {
  return {
    ...node,
    id: `${String(node.id)}-copy-${suffix}-${Math.random().toString(36).slice(2, 6)}`,
    data: {
      ...node.data,
      name: `${node.data?.name || String(node.id)} (副本)`,
    },
    children: (node.children || []).map((child) =>
      cloneSubtreeWithNewIds(child, suffix)
    ),
  };
}

function collectDescendantIds(persons: PersonRecord[], rootId: string): Set<string> {
  const toDelete = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of persons) {
      if (p.fatherId && toDelete.has(p.fatherId) && !toDelete.has(p.id)) {
        toDelete.add(p.id);
        changed = true;
      }
      if (p.spouseOfId && toDelete.has(p.spouseOfId) && !toDelete.has(p.id)) {
        toDelete.add(p.id);
        changed = true;
      }
    }
  }
  return toDelete;
}

function formatSpouseDisplayName(p: PersonRecord): string {
  const s = p.surname?.trim() || '';
  const n = p.name?.trim() || '';
  if (s && n && !n.startsWith(s)) return `${s}${n}`;
  return n || s || '配偶';
}

export interface LineageChartMeta {
  name: string;
  surname?: string;
  hallName?: string;
  progenitor?: string;
  region?: string;
}

interface LineageState {
  treesByProject: Record<string, TreeItem[]>;
  selectedNodeIdByProject: Record<string, string>;
  personsByChart: Record<string, PersonRecord[]>;
  selectedPersonIdByChart: Record<string, string | null>;
  viewModeByProject: Record<string, LineageViewMode>;

  setTree: (projectId: string, items: TreeItem[]) => void;
  initializeProjectLineage: (
    projectId: string,
    params: { familyName: string; ancestor: string; surname?: string }
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
            state.treesByProject[projectId] || cloneDefaultTree();
          const merged = preserveCollapsedChildren(prevItems, nextItems);
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: merged,
            },
          };
        }),

      initializeProjectLineage: (projectId, { familyName, ancestor, surname }) =>
        set((state) => {
          if (state.treesByProject[projectId]?.length) {
            return state;
          }
          const cleanFamily = familyName.trim() || '家族';
          const cleanAncestor = ancestor.trim() || '始迁祖';
          const cleanSurname = surname?.trim() || undefined;
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
            rank: '始迁祖',
            relationTitle: '始迁祖',
            status: 'deceased',
            fatherId: null,
            spouses: [],
            biography: `「${cleanFamily}」始迁祖，可点击节点上方或右侧档案面板继续添录配偶、子嗣与生平传记。`,
            biographyPage: 1,
            biographyOrder: 1,
          };

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: rootTree,
            },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]: chartId,
            },
            personsByChart: {
              ...state.personsByChart,
              [key]: [rootPerson],
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: null,
            },
          };
        }),

      selectNode: (projectId, nodeId) =>
        set((state) => ({
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: nodeId,
          },
        })),

      addGroup: (projectId, name) => {
        const id = `lineage-group-${Date.now()}`;
        const current = get().treesByProject[projectId] || cloneDefaultTree();
        const newGroup: TreeItem = {
          id,
          type: 'folder',
          collapsed: false,
          data: { name: name?.trim() || '新建世系分组' },
          children: [],
        };
        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: [...current, newGroup],
          },
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: id,
          },
        }));
        return id;
      },

      addChart: (projectId, parentId, input) => {
        const id = `lineage-chart-${Date.now()}`;
        const meta: LineageChartMeta =
          typeof input === 'string'
            ? { name: input }
            : input || { name: '新建世系图' };
        const chartName = meta.name?.trim() || '新建世系图';
        const cleanSurname = meta.surname?.trim() || undefined;
        const cleanHall = meta.hallName?.trim() || undefined;
        const cleanProgenitor = meta.progenitor?.trim() || undefined;
        const cleanRegion = meta.region?.trim() || undefined;

        const current = get().treesByProject[projectId] || cloneDefaultTree();
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

        let nextTree: TreeItem[];
        if (parentId) {
          const insertIntoParent = (items: TreeItem[]): TreeItem[] =>
            items.map((item) => {
              if (item.id === parentId) {
                return {
                  ...item,
                  collapsed: false,
                  children: [...(item.children || []), newChart],
                };
              }
              if (item.children?.length) {
                return { ...item, children: insertIntoParent(item.children) };
              }
              return item;
            });
          nextTree = insertIntoParent(current);
        } else {
          nextTree = [...current, newChart];
        }

        const key = makeChartStorageKey(projectId, id);
        const seed = createSeedPersonsForChart(
          id,
          chartName,
          cleanSurname,
          cleanProgenitor
        );

        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: nextTree,
          },
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: id,
          },
          personsByChart: {
            ...state.personsByChart,
            [key]: seed,
          },
          selectedPersonIdByChart: {
            ...state.selectedPersonIdByChart,
            [key]: null,
          },
        }));
        return id;
      },

      updateChartMeta: (projectId, chartId, meta) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const prevNode = findItemDeep(current, chartId);
          const cleanName = meta.name.trim() || prevNode?.data?.name || '世系图';
          const cleanSurname = meta.surname?.trim() || '';
          const cleanHall = meta.hallName?.trim() || '';
          const cleanProgenitor = meta.progenitor?.trim() || '';
          const cleanRegion = meta.region?.trim() || '';

          const updatedTree = setProperty(
            JSON.parse(JSON.stringify(current)),
            chartId,
            'data',
            (data) => ({
              ...data,
              name: cleanName,
              surname: cleanSurname || undefined,
              hallName: cleanHall || undefined,
              progenitor: cleanProgenitor || undefined,
              region: cleanRegion || undefined,
            })
          );

          const key = makeChartStorageKey(projectId, chartId);
          const existingPersons = state.personsByChart[key];
          let nextPersonsByChart = state.personsByChart;

          if (existingPersons && existingPersons.length > 0) {
            const prevProgenitor = prevNode?.data?.progenitor?.trim();
            const rootId = `${chartId}-root-1`;
            const hasExplicitRoot = existingPersons.some((p) => p.id === rootId);
            const firstGenRoots = existingPersons.filter(
              (p) => p.generation === 1 && !p.fatherId
            );
            const targetRootId = hasExplicitRoot
              ? rootId
              : firstGenRoots.length === 1
                ? firstGenRoots[0].id
                : null;

            const updatedPersons = existingPersons.map((p) => {
              const isRootTarget =
                targetRootId !== null && p.id === targetRootId;
              const shouldUpdateName =
                isRootTarget &&
                cleanProgenitor &&
                (p.name !== cleanProgenitor || prevProgenitor === p.name);

              return {
                ...p,
                ...(isRootTarget && shouldUpdateName
                  ? { name: cleanProgenitor }
                  : {}),
                ...(isRootTarget && cleanSurname
                  ? { surname: cleanSurname }
                  : {}),
              };
            });

            nextPersonsByChart = {
              ...state.personsByChart,
              [key]: updatedPersons,
            };
          }

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: updatedTree,
            },
            personsByChart: nextPersonsByChart,
          };
        }),

      renameNode: (projectId, id, name) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const trimmed = name.trim();
          if (!trimmed) return state;
          const updated = setProperty(
            JSON.parse(JSON.stringify(current)),
            id,
            'data',
            (data) => ({ ...data, name: trimmed })
          );
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: updated,
            },
          };
        }),

      duplicateNode: (projectId, id) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const suffix = String(Date.now()).slice(-4);
          const nextPersonsByChart = { ...state.personsByChart };

          const insertCopy = (items: TreeItem[]): TreeItem[] => {
            const result: TreeItem[] = [];
            for (const item of items) {
              if (item.id === id) {
                result.push(item);
                const cloned = cloneSubtreeWithNewIds(item, suffix);
                result.push(cloned);
                if (item.type === 'chart') {
                  const srcKey = makeChartStorageKey(projectId, String(item.id));
                  const dstKey = makeChartStorageKey(projectId, String(cloned.id));
                  const srcPersons =
                    state.personsByChart[srcKey] ||
                    createSeedPersonsForChart(String(item.id), item.data?.name);
                  nextPersonsByChart[dstKey] = JSON.parse(
                    JSON.stringify(srcPersons)
                  );
                }
              } else if (item.children?.length) {
                result.push({
                  ...item,
                  children: insertCopy(item.children),
                });
              } else {
                result.push(item);
              }
            }
            return result;
          };

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: insertCopy(current),
            },
            personsByChart: nextPersonsByChart,
          };
        }),

      removeNode: (projectId, id) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const nextTree = removeItem(
            JSON.parse(JSON.stringify(current)),
            id
          );
          const currentSelected = state.selectedNodeIdByProject[projectId];
          const nextSelected =
            currentSelected === id
              ? findFirstChartId(nextTree) || String(nextTree[0]?.id || '')
              : currentSelected;
          const nextPersons = { ...state.personsByChart };
          delete nextPersons[makeChartStorageKey(projectId, id)];
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: nextTree,
            },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]: nextSelected,
            },
            personsByChart: nextPersons,
          };
        }),

      setViewMode: (projectId, mode) =>
        set((state) => ({
          viewModeByProject: {
            ...state.viewModeByProject,
            [projectId]: mode,
          },
        })),

      selectPerson: (projectId, chartId, personId) =>
        set((state) => ({
          selectedPersonIdByChart: {
            ...state.selectedPersonIdByChart,
            [makeChartStorageKey(projectId, chartId)]: personId,
          },
        })),

      addPerson: (projectId, chartId, person, chartName, surname, options) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          let nextPersons = [...currentPersons, person];
          if (person.spouseOfId) {
            const partnerId = person.spouseOfId;
            const spouseEntry = {
              id: person.id,
              relationLabel: person.spouseRelationLabel || '配偶',
              name: formatSpouseDisplayName(person),
            };
            nextPersons = nextPersons.map((p) =>
              p.id === partnerId
                ? {
                    ...p,
                    spouses: [...(p.spouses || []), spouseEntry],
                  }
                : p
            );
          }

          const shouldSelect = options?.select !== false;

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: nextPersons,
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: shouldSelect ? person.id : null,
            },
          };
        }),

      updatePerson: (projectId, chartId, personId, updates, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          let updatedList = currentPersons.map((p) =>
            p.id === personId ? { ...p, ...updates } : p
          );
          let target = updatedList.find((p) => p.id === personId);

          // When updating a spouse's sequence order, normalize all spouses of the same partner into 1..N
          if (target?.spouseOfId && updates.siblingOrder !== undefined) {
            const partnerId = target.spouseOfId;
            const otherSpouses = updatedList
              .filter((p) => p.spouseOfId === partnerId && p.id !== target!.id)
              .sort((a, b) => {
                const orderA = a.siblingOrder ?? a.biographyOrder ?? 50;
                const orderB = b.siblingOrder ?? b.biographyOrder ?? 50;
                return orderA - orderB;
              });
            const desiredIdx = Math.max(
              0,
              Math.min(
                otherSpouses.length,
                Math.round(Number(updates.siblingOrder) || 1) - 1
              )
            );
            const orderedSpouses = [...otherSpouses];
            orderedSpouses.splice(desiredIdx, 0, target);
            const spouseOrderMap = new Map<string, number>();
            orderedSpouses.forEach((sp, idx) => {
              spouseOrderMap.set(sp.id, idx + 1);
            });
            updatedList = updatedList.map((p) => {
              const newOrder = spouseOrderMap.get(p.id);
              return newOrder !== undefined ? { ...p, siblingOrder: newOrder } : p;
            });
            target = updatedList.find((p) => p.id === personId);
          }

          const syncedList =
            target && target.spouseOfId
              ? updatedList.map((p) => {
                  if (p.id !== target!.spouseOfId) return p;
                  const existing = p.spouses || [];
                  const hasEntry = existing.some((s) => s.id === target!.id);
                  const nextSpouses = hasEntry
                    ? existing.map((s) =>
                        s.id === target!.id
                          ? {
                              ...s,
                              relationLabel:
                                target!.spouseRelationLabel ||
                                s.relationLabel ||
                                '配偶',
                              name: formatSpouseDisplayName(target!),
                            }
                          : s
                      )
                    : [
                        ...existing,
                        {
                          id: target!.id,
                          relationLabel: target!.spouseRelationLabel || '配偶',
                          name: formatSpouseDisplayName(target!),
                        },
                      ];

                  const spouseRankOrder: Record<string, number> = {
                    原配: 1,
                    元配: 1,
                    正室: 1,
                    继配: 2,
                    次配: 2,
                    再配: 2,
                    三配: 3,
                    四配: 4,
                    五配: 5,
                    六配: 6,
                  };
                  const orderLookup = new Map<string, number>();
                  updatedList.forEach((sp) => {
                    if (sp.spouseOfId === p.id) {
                      const rankOrder = sp.spouseRelationLabel
                        ? spouseRankOrder[sp.spouseRelationLabel.trim()]
                        : undefined;
                      orderLookup.set(
                        sp.id,
                        rankOrder ?? sp.siblingOrder ?? sp.biographyOrder ?? 50
                      );
                    }
                  });
                  const sortedSpouses = [...nextSpouses].sort((a, b) => {
                    const orderA =
                      (a.id ? orderLookup.get(a.id) : undefined) ??
                      spouseRankOrder[a.relationLabel || ''] ??
                      999;
                    const orderB =
                      (b.id ? orderLookup.get(b.id) : undefined) ??
                      spouseRankOrder[b.relationLabel || ''] ??
                      999;
                    return orderA - orderB;
                  });
                  return { ...p, spouses: sortedSpouses };
                })
              : updatedList;

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: syncedList,
            },
          };
        }),

      deletePerson: (projectId, chartId, personId, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);
          const toDelete = collectDescendantIds(currentPersons, personId);
          const remaining = currentPersons
            .filter((p) => !toDelete.has(p.id))
            .map((p) => {
              if (!p.spouses?.some((s) => s.id && toDelete.has(s.id))) {
                return p;
              }
              return {
                ...p,
                spouses: p.spouses.filter(
                  (s) => !(s.id && toDelete.has(s.id))
                ),
              };
            });
          const currentSel = state.selectedPersonIdByChart[key];
          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: remaining,
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: currentSel && toDelete.has(currentSel) ? null : currentSel,
            },
          };
        }),

      reorderSibling: (
        projectId,
        chartId,
        parentId,
        childId,
        direction,
        chartName,
        surname
      ) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          const siblings = currentPersons
            .filter((p) => p.fatherId === parentId)
            .sort((a, b) => {
              const orderA = a.siblingOrder ?? a.biographyOrder ?? 50;
              const orderB = b.siblingOrder ?? b.biographyOrder ?? 50;
              return orderA - orderB;
            });

          const idx = siblings.findIndex((s) => s.id === childId);
          if (idx < 0) return state;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= siblings.length) return state;

          const reordered = [...siblings];
          const [moved] = reordered.splice(idx, 1);
          reordered.splice(targetIdx, 0, moved);

          const orderMap = new Map<string, number>();
          reordered.forEach((sib, index) => {
            orderMap.set(sib.id, index + 1);
          });

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: currentPersons.map((p) => {
                const newOrder = orderMap.get(p.id);
                if (newOrder === undefined) return p;
                return {
                  ...p,
                  siblingOrder: newOrder,
                  biographyOrder: newOrder,
                };
              }),
            },
          };
        }),
    }),
    {
      name: 'nocoapp:lineage',
      version: 3,
      storage: createAppStorage(),
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState as Partial<LineageState>) || {};
        if (version < 3) {
          return {
            ...state,
            selectedPersonIdByChart: {},
          };
        }
        return state;
      },
    }
  )
);

