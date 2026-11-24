import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TreeItem } from '../components/common/Tree/types';
import {
  collectSubtreeIdsByType,
  duplicateTreeNode,
  findTreeNode,
  insertTreeNode,
  preserveCollapsedChildren,
  removeTreeNode,
  updateTreeNodeData,
} from '../lib/treeOps';
import { createAsyncEntityStorage } from './storageAdapter';
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
    updates: Partial<
      Pick<ArticleDocument, 'title' | 'subtitle' | 'author' | 'contentHtml'>
    >
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
        if (!projectId || get().treesByProject[projectId] !== undefined) return;
        const seed = createInitialArticleSeed(projectId, ctx);
        set((state) => {
          if (state.treesByProject[projectId] !== undefined) return state;
          return {
            treesByProject: { ...state.treesByProject, [projectId]: seed.tree },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]:
                state.selectedNodeIdByProject[projectId] || seed.defaultSelectedId,
            },
            articlesByKey: { ...state.articlesByKey, ...seed.articles },
          };
        });
      },

      setTree: (projectId, nextItems) =>
        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: preserveCollapsedChildren(
              state.treesByProject[projectId] || [],
              nextItems
            ),
          },
        })),

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
        const initialHtml = `<p>请在此处开始撰写「${title}」正文内容……</p>`;
        const doc: ArticleDocument = {
          id,
          title,
          subtitle: meta?.subtitle?.trim() || '',
          author: meta?.author?.trim() || '家族编委会',
          contentHtml: initialHtml,
          wordCount: computeWordCount(initialHtml),
          updatedAt: formatNowTimestamp(),
        };

        const newNode: TreeItem = {
          id,
          type: 'article',
          data: { name: title },
          children: [],
        };

        const current = get().treesByProject[projectId] || [];
        const key = makeArticleStorageKey(projectId, id);
        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: insertTreeNode(current, newNode, parentId),
          },
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: id,
          },
          articlesByKey: { ...state.articlesByKey, [key]: doc },
        }));
        return id;
      },

      updateArticleContent: (projectId, articleId, updates) =>
        set((state) => {
          const key = makeArticleStorageKey(projectId, articleId);
          const existing = state.articlesByKey[key];
          const currentTree = state.treesByProject[projectId] || [];
          const treeNode = findTreeNode(currentTree, articleId);

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

          const shouldUpdateTreeTitle =
            Boolean(updates.title?.trim()) &&
            treeNode &&
            treeNode.data?.name !== updates.title!.trim();

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: shouldUpdateTreeTitle
                ? updateTreeNodeData(currentTree, articleId, (data) => ({
                    ...data,
                    name: updates.title!.trim(),
                  }))
                : currentTree,
            },
            articlesByKey: { ...state.articlesByKey, [key]: nextDoc },
          };
        }),

      updateArticleMeta: (projectId, articleId, meta) =>
        set((state) => {
          const title = meta.title.trim() || '未命名谱文';
          const key = makeArticleStorageKey(projectId, articleId);
          const existing = state.articlesByKey[key];
          const currentTree = state.treesByProject[projectId] || [];

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
              [projectId]: updateTreeNodeData(currentTree, articleId, (data) => ({
                ...data,
                name: title,
              })),
            },
            articlesByKey: { ...state.articlesByKey, [key]: nextDoc },
          };
        }),

      renameNode: (projectId, id, name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const currentTree = state.treesByProject[projectId] || [];
          const node = findTreeNode(currentTree, id);

          let nextArticles = state.articlesByKey;
          if (node?.type === 'article') {
            const key = makeArticleStorageKey(projectId, id);
            const existing = state.articlesByKey[key];
            if (existing) {
              nextArticles = {
                ...state.articlesByKey,
                [key]: { ...existing, title: trimmed, updatedAt: formatNowTimestamp() },
              };
            }
          }

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: updateTreeNodeData(currentTree, id, (data) => ({
                ...data,
                name: trimmed,
              })),
            },
            articlesByKey: nextArticles,
          };
        }),

      duplicateNode: (projectId, id) =>
        set((state) => {
          const currentTree = state.treesByProject[projectId] || [];
          const nextArticles = { ...state.articlesByKey };
          const nextTree = duplicateTreeNode(currentTree, id, (srcId, dstId, node) => {
            if (node.type !== 'article') return;
            const srcDoc =
              state.articlesByKey[makeArticleStorageKey(projectId, srcId)];
            if (!srcDoc) return;
            nextArticles[makeArticleStorageKey(projectId, dstId)] = {
              ...srcDoc,
              id: dstId,
              title:
                srcId === id
                  ? `${node.data?.name || srcId} (副本)`
                  : node.data?.name || srcId,
              updatedAt: formatNowTimestamp(),
            };
          });
          return {
            treesByProject: { ...state.treesByProject, [projectId]: nextTree },
            articlesByKey: nextArticles,
          };
        }),

      removeNode: (projectId, id) =>
        set((state) => {
          const currentTree = state.treesByProject[projectId] || [];
          const targetNode = findTreeNode(currentTree, id);
          const removedIds = targetNode
            ? collectSubtreeIdsByType(targetNode, 'article')
            : [id];

          const nextTree = removeTreeNode(currentTree, id);
          const nextArticles = { ...state.articlesByKey };
          for (const aid of removedIds) {
            delete nextArticles[makeArticleStorageKey(projectId, aid)];
          }

          const currentSelected = state.selectedNodeIdByProject[projectId];
          const wasSelectedRemoved =
            currentSelected === id ||
            (currentSelected ? removedIds.includes(currentSelected) : false);

          return {
            treesByProject: { ...state.treesByProject, [projectId]: nextTree },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]: wasSelectedRemoved
                ? findFirstArticleId(nextTree) || String(nextTree[0]?.id || '')
                : currentSelected,
            },
            articlesByKey: nextArticles,
          };
        }),
    }),
    {
      name: 'yunpu:articles',
      version: 1,
      storage: createAsyncEntityStorage(),
    }
  )
);
