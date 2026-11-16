import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TreeItem } from '../components/common/Tree/types';
import {
  findItemDeep,
  removeItem,
  setProperty,
} from '../components/common/Tree/utilities';
import { createAppStorage } from './storageAdapter';
import {
  computeWordCount,
  createInitialArticleSeed,
  findFirstArticleId,
  formatNowTimestamp,
  makeArticleStorageKey,
} from '../features/articles/articleData';
import type {
  ArticleDocument,
  ArticleMetaInput,
  ProjectArticleSeedContext,
} from '../features/articles/types';

function preserveCollapsedChildren(
  prevItems: TreeItem[],
  nextItems: TreeItem[]
): TreeItem[] {
  return nextItems.map((item) => {
    const prevNode = findItemDeep(prevItems, item.id);
    const restoredChildren =
      item.collapsed &&
      item.children.length === 0 &&
      prevNode?.children?.length
        ? prevNode.children
        : preserveCollapsedChildren(prevItems, item.children || []);
    return {
      ...item,
      children: restoredChildren,
    };
  });
}

function collectArticleIds(node: TreeItem): string[] {
  const ids: string[] = [];
  if (node.type === 'article') {
    ids.push(String(node.id));
  }
  for (const child of node.children || []) {
    ids.push(...collectArticleIds(child));
  }
  return ids;
}

interface ArticleState {
  treesByProject: Record<string, TreeItem[]>;
  selectedNodeIdByProject: Record<string, string>;
  articlesByKey: Record<string, ArticleDocument>;

  ensureProjectInitialized: (
    projectId: string,
    ctx: ProjectArticleSeedContext
  ) => void;
  setTree: (projectId: string, items: TreeItem[]) => void;
  selectNode: (projectId: string, nodeId: string) => void;
  addFolder: (projectId: string, name?: string) => string;
  addArticle: (
    projectId: string,
    parentId?: string,
    meta?: ArticleMetaInput
  ) => string;
  updateArticleContent: (
    projectId: string,
    articleId: string,
    updates: Partial<Pick<ArticleDocument, 'title' | 'subtitle' | 'author' | 'contentHtml'>>
  ) => void;
  updateArticleMeta: (
    projectId: string,
    articleId: string,
    meta: ArticleMetaInput
  ) => void;
  renameNode: (projectId: string, id: string, name: string) => void;
  duplicateNode: (projectId: string, id: string) => void;
  removeNode: (projectId: string, id: string) => void;
}

export const useArticleStore = create<ArticleState>()(
  persist(
    (set, get) => ({
      treesByProject: {},
      selectedNodeIdByProject: {},
      articlesByKey: {},

      ensureProjectInitialized: (projectId, ctx) => {
        if (!projectId) return;
        const existingTree = get().treesByProject[projectId];
        if (existingTree !== undefined) return;

        const seed = createInitialArticleSeed(projectId, ctx);
        set((state) => {
          if (state.treesByProject[projectId] !== undefined) return state;
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: seed.tree,
            },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]:
                state.selectedNodeIdByProject[projectId] ||
                seed.defaultSelectedId,
            },
            articlesByKey: {
              ...state.articlesByKey,
              ...seed.articles,
            },
          };
        });
      },

      setTree: (projectId, nextItems) =>
        set((state) => {
          const prevItems = state.treesByProject[projectId] || [];
          const merged = preserveCollapsedChildren(prevItems, nextItems);
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: merged,
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

      addFolder: (projectId, name) => {
        const id = `article-vol-${Date.now()}`;
        const current = get().treesByProject[projectId] || [];
        const newFolder: TreeItem = {
          id,
          type: 'folder',
          collapsed: false,
          data: { name: name?.trim() || '新建谱文卷目' },
          children: [],
        };
        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: [...current, newFolder],
          },
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: id,
          },
        }));
        return id;
      },

      addArticle: (projectId, parentId, meta) => {
        const id = `article-${Date.now()}`;
        const title = meta?.title?.trim() || '未命名谱文';
        const subtitle = meta?.subtitle?.trim() || '';
        const author = meta?.author?.trim() || '家族编委会';
        const initialHtml = `<p>请在此处开始撰写「${title}」正文内容……</p>`;

        const doc: ArticleDocument = {
          id,
          title,
          subtitle,
          author,
          contentHtml: initialHtml,
          wordCount: computeWordCount(initialHtml),
          updatedAt: formatNowTimestamp(),
        };

        const current = get().treesByProject[projectId] || [];
        const newNode: TreeItem = {
          id,
          type: 'article',
          data: { name: title },
          children: [],
        };

        let nextTree: TreeItem[];
        if (parentId) {
          const insertIntoParent = (items: TreeItem[]): TreeItem[] =>
            items.map((item) => {
              if (String(item.id) === String(parentId)) {
                return {
                  ...item,
                  collapsed: false,
                  children: [...(item.children || []), newNode],
                };
              }
              if (item.children?.length) {
                return {
                  ...item,
                  children: insertIntoParent(item.children),
                };
              }
              return item;
            });
          nextTree = insertIntoParent(current);
        } else {
          nextTree = [...current, newNode];
        }

        const key = makeArticleStorageKey(projectId, id);
        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: nextTree,
          },
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: id,
          },
          articlesByKey: {
            ...state.articlesByKey,
            [key]: doc,
          },
        }));
        return id;
      },

      updateArticleContent: (projectId, articleId, updates) =>
        set((state) => {
          const key = makeArticleStorageKey(projectId, articleId);
          const existing = state.articlesByKey[key];
          const currentTree = state.treesByProject[projectId] || [];
          const treeNode = findItemDeep(currentTree, articleId);

          const nextTitle =
            updates.title !== undefined
              ? updates.title
              : existing?.title || treeNode?.data?.name || '未命名谱文';
          const nextHtml =
            updates.contentHtml !== undefined
              ? updates.contentHtml
              : existing?.contentHtml || '<p></p>';

          const nextDoc: ArticleDocument = {
            id: articleId,
            title: nextTitle,
            subtitle:
              updates.subtitle !== undefined
                ? updates.subtitle
                : existing?.subtitle || '',
            author:
              updates.author !== undefined
                ? updates.author
                : existing?.author || '',
            contentHtml: nextHtml,
            wordCount: computeWordCount(nextHtml),
            updatedAt: formatNowTimestamp(),
          };

          let nextTree = currentTree;
          if (
            updates.title !== undefined &&
            updates.title.trim() &&
            treeNode &&
            treeNode.data?.name !== updates.title.trim()
          ) {
            nextTree = setProperty(
              JSON.parse(JSON.stringify(currentTree)),
              articleId,
              'data',
              (data) => ({ ...data, name: updates.title!.trim() })
            );
          }

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: nextTree,
            },
            articlesByKey: {
              ...state.articlesByKey,
              [key]: nextDoc,
            },
          };
        }),

      updateArticleMeta: (projectId, articleId, meta) =>
        set((state) => {
          const title = meta.title.trim() || '未命名谱文';
          const key = makeArticleStorageKey(projectId, articleId);
          const existing = state.articlesByKey[key];
          const currentTree = state.treesByProject[projectId] || [];

          const nextTree = setProperty(
            JSON.parse(JSON.stringify(currentTree)),
            articleId,
            'data',
            (data) => ({ ...data, name: title })
          );

          const nextDoc: ArticleDocument = {
            id: articleId,
            title,
            subtitle: meta.subtitle?.trim() || '',
            author: meta.author?.trim() || '',
            contentHtml: existing?.contentHtml || '<p></p>',
            wordCount: existing?.wordCount ?? 0,
            updatedAt: formatNowTimestamp(),
          };

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: nextTree,
            },
            articlesByKey: {
              ...state.articlesByKey,
              [key]: nextDoc,
            },
          };
        }),

      renameNode: (projectId, id, name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const currentTree = state.treesByProject[projectId] || [];
          const node = findItemDeep(currentTree, id);
          const nextTree = setProperty(
            JSON.parse(JSON.stringify(currentTree)),
            id,
            'data',
            (data) => ({ ...data, name: trimmed })
          );

          let nextArticles = state.articlesByKey;
          if (node?.type === 'article') {
            const key = makeArticleStorageKey(projectId, id);
            const existing = state.articlesByKey[key];
            if (existing) {
              nextArticles = {
                ...state.articlesByKey,
                [key]: {
                  ...existing,
                  title: trimmed,
                  updatedAt: formatNowTimestamp(),
                },
              };
            }
          }

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: nextTree,
            },
            articlesByKey: nextArticles,
          };
        }),

      duplicateNode: (projectId, id) =>
        set((state) => {
          const currentTree = state.treesByProject[projectId] || [];
          const suffix = String(Date.now()).slice(-4);
          const nextArticles = { ...state.articlesByKey };

          const cloneWithDocs = (node: TreeItem, isRootClone: boolean): TreeItem => {
            const newId = `${String(node.id)}-copy-${suffix}-${Math.random()
              .toString(36)
              .slice(2, 6)}`;
            const nextName = isRootClone
              ? `${node.data?.name || String(node.id)} (副本)`
              : node.data?.name || String(node.id);

            if (node.type === 'article') {
              const srcKey = makeArticleStorageKey(projectId, String(node.id));
              const dstKey = makeArticleStorageKey(projectId, newId);
              const srcDoc = state.articlesByKey[srcKey];
              if (srcDoc) {
                nextArticles[dstKey] = {
                  ...srcDoc,
                  id: newId,
                  title: nextName,
                  updatedAt: formatNowTimestamp(),
                };
              }
            }

            return {
              ...node,
              id: newId,
              data: {
                ...node.data,
                name: nextName,
              },
              children: (node.children || []).map((child) =>
                cloneWithDocs(child, false)
              ),
            };
          };

          const insertCopy = (items: TreeItem[]): TreeItem[] => {
            const result: TreeItem[] = [];
            for (const item of items) {
              if (String(item.id) === String(id)) {
                result.push(item);
                result.push(cloneWithDocs(item, true));
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
              [projectId]: insertCopy(currentTree),
            },
            articlesByKey: nextArticles,
          };
        }),

      removeNode: (projectId, id) =>
        set((state) => {
          const currentTree = state.treesByProject[projectId] || [];
          const targetNode = findItemDeep(currentTree, id);
          const removedIds = targetNode ? collectArticleIds(targetNode) : [id];

          const nextTree = removeItem(
            JSON.parse(JSON.stringify(currentTree)),
            id
          );

          const nextArticles = { ...state.articlesByKey };
          for (const aid of removedIds) {
            delete nextArticles[makeArticleStorageKey(projectId, aid)];
          }

          const currentSelected = state.selectedNodeIdByProject[projectId];
          const wasSelectedRemoved =
            currentSelected === id ||
            (currentSelected ? removedIds.includes(currentSelected) : false);

          const nextSelected = wasSelectedRemoved
            ? findFirstArticleId(nextTree) || String(nextTree[0]?.id || '')
            : currentSelected;

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: nextTree,
            },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]: nextSelected,
            },
            articlesByKey: nextArticles,
          };
        }),
    }),
    {
      name: 'nocoapp:articles',
      version: 1,
      storage: createAppStorage(),
    }
  )
);
