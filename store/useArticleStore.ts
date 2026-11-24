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
  createInitialArticleSeed,
  findFirstArticleId,
  formatNowTimestamp,
  makeArticleStorageKey,
} from '../features/articles/articleData';
import {
  bumpArticleRemoteSaveAttemptKey,
  enqueueArticleRemoteSave,
} from '../features/articles/domain/articleRemoteSave';
import { commitArticleContent } from '../features/articles/domain/articleCommit';
import { resolveArticleConflict } from '../features/articles/domain/articleConflict';
import { resolveApiMode } from '../lib/apiMode';
import { htmlToContentJson } from '../features/articles/domain/htmlProjection';
import {
  migrateArticlesV1ToV2,
  migrateArticlesV2ToV3,
} from '../features/articles/domain/migrateArticles';
import {
  appendArticleRevision,
  articleRevisionFromDocument,
  restoreArticleFromRevision,
} from '../features/articles/domain/articleRevisions';
import type { JSONContent } from '@tiptap/core';
import type {
  ArticleDocument,
  ArticleMetaInput,
  ArticleRevision,
  ProjectArticleSeedContext,
} from '../features/articles/types';

export interface ArticleConflictState {
  projectId: string;
  articleId: string;
  local: ArticleDocument;
  server: ArticleDocument;
}

interface ArticleState {
  treesByProject: Record<string, TreeItem[]>;
  selectedNodeIdByProject: Record<string, string>;
  articlesByKey: Record<string, ArticleDocument>;
  revisionsByArticleId: Record<string, ArticleRevision[]>;
  articleConflict: ArticleConflictState | null;

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
    updates: Partial<ArticleMetaInput> & {
      contentJson?: JSONContent;
      contentHtml?: string;
    }
  ) => void;
  updateArticleMeta: (
    projectId: string,
    articleId: string,
    meta: ArticleMetaInput
  ) => void;
  renameNode: (projectId: string, id: string, name: string) => void;
  duplicateNode: (projectId: string, id: string) => void;
  removeNode: (projectId: string, id: string) => void;
  recordRevision: (
    projectId: string,
    articleId: string,
    summary: string,
    authorName: string,
  ) => void;
  restoreRevision: (
    projectId: string,
    articleId: string,
    revisionId: string,
    authorName: string,
  ) => void;
  chooseArticleConflictResolution: (
    choice: 'keep-local' | 'take-server',
  ) => void;
}

function articleWriteUrl(articleId: string): string {
  return `/api/articles/${articleId}`;
}

const remoteSaveAttemptByKey = new Map<string, number>();

function invalidateArticleRemoteSaves(key: string): void {
  const next = (remoteSaveAttemptByKey.get(key) ?? 0) + 1;
  remoteSaveAttemptByKey.set(key, next);
  bumpArticleRemoteSaveAttemptKey(key);
}

function applyArticleRowToState(
  state: ArticleState,
  projectId: string,
  articleId: string,
  doc: ArticleDocument,
  titleUpdateFrom?: string,
): Partial<ArticleState> {
  const key = makeArticleStorageKey(projectId, articleId);
  const currentTree = state.treesByProject[projectId] || [];
  const treeNode = findTreeNode(currentTree, articleId);
  const shouldUpdateTreeTitle =
    Boolean(titleUpdateFrom?.trim()) &&
    treeNode &&
    treeNode.data?.name !== titleUpdateFrom!.trim();

  return {
    treesByProject: {
      ...state.treesByProject,
      [projectId]: shouldUpdateTreeTitle
        ? updateTreeNodeData(currentTree, articleId, (data) => ({
            ...data,
            name: titleUpdateFrom!.trim(),
          }))
        : currentTree,
    },
    articlesByKey: { ...state.articlesByKey, [key]: doc },
  };
}

export const useArticleStore = create<ArticleState>()(
  persist(
    (set, get) => ({
      treesByProject: {},
      selectedNodeIdByProject: {},
      articlesByKey: {},
      revisionsByArticleId: {},
      articleConflict: null,

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
        const doc = commitArticleContent(
          undefined,
          id,
          {
            title,
            subtitle: meta?.subtitle,
            author: meta?.author,
            docType: meta?.docType,
            status: meta?.status,
            privacy: meta?.privacy,
            citations: meta?.citations,
            contentHtml: meta?.contentHtml,
            contentJson:
              meta?.contentJson ??
              (meta?.contentHtml
                ? htmlToContentJson(meta.contentHtml)
                : htmlToContentJson(
                    `<p>请在此处开始撰写「${title}」正文内容……</p>`
                  )),
          },
          formatNowTimestamp()
        );

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

      updateArticleContent: (projectId, articleId, updates) => {
        const state = get();
        const key = makeArticleStorageKey(projectId, articleId);
        const existing = state.articlesByKey[key];
        const currentTree = state.treesByProject[projectId] || [];
        const treeNode = findTreeNode(currentTree, articleId);

        const mergedUpdates = {
          ...updates,
          title:
            updates.title !== undefined
              ? updates.title
              : existing?.title || treeNode?.data?.name || '未命名谱文',
        };
        const isNetwork = resolveApiMode(import.meta.env) === 'network';
        const nextDoc = commitArticleContent(
          existing,
          articleId,
          mergedUpdates,
          formatNowTimestamp(),
          { bumpVersion: !isNetwork },
        );

        const shouldUpdateTreeTitle =
          Boolean(updates.title?.trim()) &&
          treeNode &&
          treeNode.data?.name !== updates.title!.trim();

        if (!isNetwork) {
          set((s) => ({
            ...applyArticleRowToState(
              s,
              projectId,
              articleId,
              nextDoc,
              shouldUpdateTreeTitle ? updates.title : undefined,
            ),
          }));
          return;
        }

        const expectedVersion = existing?.version ?? 0;
        const attemptId = (remoteSaveAttemptByKey.get(key) ?? 0) + 1;
        remoteSaveAttemptByKey.set(key, attemptId);

        set((s) => ({
          ...applyArticleRowToState(
            s,
            projectId,
            articleId,
            nextDoc,
            shouldUpdateTreeTitle ? updates.title : undefined,
          ),
        }));

        const buildWriteRequest = (): {
          articleId: string;
          expectedVersion: number;
          article: ArticleDocument;
        } => {
          const current = get().articlesByKey[key];
          const acceptedVersion = current?.version ?? expectedVersion;
          const doc = current ?? nextDoc;
          return {
            articleId,
            expectedVersion: acceptedVersion,
            article: { ...doc, version: acceptedVersion },
          };
        };

        void enqueueArticleRemoteSave(
          key,
          attemptId,
          fetch,
          articleWriteUrl(articleId),
          buildWriteRequest(),
          {
            onSuccess: (article) => {
              if (remoteSaveAttemptByKey.get(key) !== attemptId) return;
              set((s) => ({
                ...applyArticleRowToState(
                  s,
                  projectId,
                  articleId,
                  article,
                  updates.title,
                ),
                articleConflict: null,
              }));
            },
            onConflict: (server) => {
              if (remoteSaveAttemptByKey.get(key) !== attemptId) return;
              const local = get().articlesByKey[key] ?? nextDoc;
              set({
                articleConflict: {
                  projectId,
                  articleId,
                  local,
                  server,
                },
              });
            },
            onError: () => {
              if (remoteSaveAttemptByKey.get(key) !== attemptId) return;
            },
          },
          buildWriteRequest,
        );
      },

      chooseArticleConflictResolution: (choice) => {
        const conflict = get().articleConflict;
        if (!conflict) return;

        if (choice === 'take-server') {
          const takeKey = makeArticleStorageKey(
            conflict.projectId,
            conflict.articleId,
          );
          invalidateArticleRemoteSaves(takeKey);
          set((state) => ({
            ...applyArticleRowToState(
              state,
              conflict.projectId,
              conflict.articleId,
              conflict.server,
              conflict.server.title,
            ),
            articleConflict: null,
          }));
          return;
        }

        const resolved = resolveArticleConflict(
          'keep-local',
          conflict.local,
          conflict.server,
        );

        const conflictKey = makeArticleStorageKey(
          conflict.projectId,
          conflict.articleId,
        );
        const attemptId = (remoteSaveAttemptByKey.get(conflictKey) ?? 0) + 1;
        remoteSaveAttemptByKey.set(conflictKey, attemptId);

        const conflictExpectedVersion = conflict.server.version;
        const buildConflictRequest = () => {
          const current = get().articlesByKey[conflictKey] ?? resolved;
          const acceptedVersion = current.version;
          return {
            articleId: conflict.articleId,
            expectedVersion: acceptedVersion,
            article: { ...current, version: acceptedVersion },
          };
        };

        set((state) => ({
          ...applyArticleRowToState(
            state,
            conflict.projectId,
            conflict.articleId,
            resolved,
            resolved.title,
          ),
          articleConflict: null,
        }));

        void enqueueArticleRemoteSave(
          conflictKey,
          attemptId,
          fetch,
          articleWriteUrl(conflict.articleId),
          {
            articleId: conflict.articleId,
            expectedVersion: conflictExpectedVersion,
            article: { ...resolved, version: conflictExpectedVersion },
          },
          {
            onSuccess: (article) => {
              if (remoteSaveAttemptByKey.get(conflictKey) !== attemptId) return;
              set((s) => ({
                ...applyArticleRowToState(
                  s,
                  conflict.projectId,
                  conflict.articleId,
                  article,
                  resolved.title,
                ),
                articleConflict: null,
              }));
            },
            onConflict: (server) => {
              if (remoteSaveAttemptByKey.get(conflictKey) !== attemptId) return;
              const local = get().articlesByKey[conflictKey] ?? resolved;
              set({
                articleConflict: {
                  projectId: conflict.projectId,
                  articleId: conflict.articleId,
                  local,
                  server,
                },
              });
            },
            onError: () => {
              if (remoteSaveAttemptByKey.get(conflictKey) !== attemptId) return;
            },
          },
          buildConflictRequest,
        );
      },

      updateArticleMeta: (projectId, articleId, meta) =>
        set((state) => {
          const title = meta.title?.trim() || '未命名谱文';
          const key = makeArticleStorageKey(projectId, articleId);
          const existing = state.articlesByKey[key];
          const currentTree = state.treesByProject[projectId] || [];

          const nextDoc: ArticleDocument = commitArticleContent(
            existing,
            articleId,
            {
              title,
              subtitle: meta.subtitle,
              author: meta.author,
              status: meta.status,
              privacy: meta.privacy,
              citations: meta.citations,
              docType: meta.docType,
              contentHtml: existing ? undefined : '<p></p>',
            },
            formatNowTimestamp(),
          );

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
                [key]: {
                  ...existing,
                  title: trimmed,
                  updatedAt: formatNowTimestamp(),
                  version: (existing.version ?? 0) + 1,
                },
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
              version: (srcDoc.version ?? 0) + 1,
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

      recordRevision: (projectId, articleId, summary, authorName) =>
        set((state) => {
          const key = makeArticleStorageKey(projectId, articleId);
          const doc = state.articlesByKey[key];
          if (!doc?.contentJson) return state;
          const createdAt = formatNowTimestamp();
          const revision = articleRevisionFromDocument(
            doc,
            summary,
            authorName,
            createdAt,
          );
          const existing = state.revisionsByArticleId[articleId] ?? [];
          return {
            revisionsByArticleId: {
              ...state.revisionsByArticleId,
              [articleId]: appendArticleRevision(existing, revision),
            },
          };
        }),

      restoreRevision: (projectId, articleId, revisionId, authorName) => {
        const key = makeArticleStorageKey(projectId, articleId);
        invalidateArticleRemoteSaves(key);
        set((state) => {
          const current = state.articlesByKey[key];
          if (!current) return state;
          const revisions = state.revisionsByArticleId[articleId] ?? [];
          const revision = revisions.find((r) => r.id === revisionId);
          if (!revision) return state;
          const updatedAt = formatNowTimestamp();
          const restored = restoreArticleFromRevision(current, revision, updatedAt);
          const rollbackRevision = articleRevisionFromDocument(
            restored,
            `回滚至版本 ${revision.version}`,
            authorName,
            updatedAt,
          );
          const nextRevisions = appendArticleRevision(revisions, rollbackRevision);
          const currentTree = state.treesByProject[projectId] || [];
          return {
            articlesByKey: { ...state.articlesByKey, [key]: restored },
            revisionsByArticleId: {
              ...state.revisionsByArticleId,
              [articleId]: nextRevisions,
            },
            treesByProject: {
              ...state.treesByProject,
              [projectId]: updateTreeNodeData(currentTree, articleId, (data) => ({
                ...data,
                name: restored.title,
              })),
            },
          };
        });
      },
    }),
    {
      name: 'yunpu:articles',
      version: 3,
      storage: createAsyncEntityStorage(),
      migrate: (persisted, version) => {
        let state =
          version < 2
            ? migrateArticlesV1ToV2(persisted)
            : (persisted as ReturnType<typeof migrateArticlesV1ToV2>);
        if (version < 3) {
          state = migrateArticlesV2ToV3(state);
        }
        return state;
      },
    }
  )
);
