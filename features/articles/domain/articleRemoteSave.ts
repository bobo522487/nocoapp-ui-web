import type { ArticleDocument } from '../types';
import { saveArticleRemote, type ArticleWriteRequest } from '../api';

type SaveResult =
  | { ok: true; article: ArticleDocument }
  | { ok: false; status: 409; server: ArticleDocument };

export interface ArticleRemoteSavePayload {
  projectId: string;
  articleId: string;
  request: ArticleWriteRequest;
}

type RemoteSaveHandlers = {
  onSuccess: (article: ArticleDocument) => void;
  onConflict: (server: ArticleDocument) => void;
  onError: (expectedVersion: number) => void;
  /** Stale 200 for a superseded attempt — advance CAS baseline only, not body. */
  onSupersededSuccess?: (article: ArticleDocument) => void;
};

export function createArticleRemoteSaveSequencer() {
  const attemptIdByKey = new Map<string, number>();
  const chainByKey = new Map<string, Promise<void>>();
  const latestByKey = new Map<
    string,
    { attemptId: number; resolveRequest: () => ArticleWriteRequest; handlers: RemoteSaveHandlers }
  >();

  return {
  enqueue(
    key: string,
    attemptId: number,
    fetchImpl: typeof fetch,
    url: string,
    request: ArticleWriteRequest,
    handlers: RemoteSaveHandlers,
    resolveRequest?: () => ArticleWriteRequest,
  ) {
    attemptIdByKey.set(key, attemptId);
    latestByKey.set(key, {
      attemptId,
      resolveRequest: resolveRequest ?? (() => request),
      handlers,
    });
    const previous = chainByKey.get(key) ?? Promise.resolve();
    const next = previous
      .then(async (): Promise<void> => {
        if (attemptIdByKey.get(key) !== attemptId) return;
        const latest = latestByKey.get(key);
        if (!latest || latest.attemptId !== attemptId) return;
        const outbound = latest.resolveRequest();
        const expectedVersion = outbound.expectedVersion;
        let result: SaveResult;
        try {
          result = await saveArticleRemote(fetchImpl, url, outbound);
        } catch {
          if (attemptIdByKey.get(key) === attemptId) {
            latest.handlers.onError(expectedVersion);
          }
          return;
        }
        const stillCurrentAttempt = attemptIdByKey.get(key) === attemptId;
        if (!stillCurrentAttempt) {
          if (result.ok) {
            const newest = latestByKey.get(key);
            newest?.handlers.onSupersededSuccess?.(result.article);
          }
          return;
        }
        if (result.ok) {
          latest.handlers.onSuccess(result.article);
          return;
        }
        if (result.status === 409) {
          latest.handlers.onConflict(result.server);
        }
      })
      .catch(() => undefined);
    chainByKey.set(key, next);
    return next;
  },
  bumpAttemptKey(key: string): number {
    const next = (attemptIdByKey.get(key) ?? 0) + 1;
    attemptIdByKey.set(key, next);
    return next;
  },
  resetKey(key: string) {
    attemptIdByKey.delete(key);
    chainByKey.delete(key);
    latestByKey.delete(key);
  },
  };
}

const defaultSequencer = createArticleRemoteSaveSequencer();

export function enqueueArticleRemoteSave(
  key: string,
  attemptId: number,
  fetchImpl: typeof fetch,
  url: string,
  request: ArticleWriteRequest,
  handlers: RemoteSaveHandlers,
  resolveRequest?: () => ArticleWriteRequest,
) {
  return defaultSequencer.enqueue(
    key,
    attemptId,
    fetchImpl,
    url,
    request,
    handlers,
    resolveRequest,
  );
}

export function bumpArticleRemoteSaveAttemptKey(key: string): number {
  return defaultSequencer.bumpAttemptKey(key);
}

export function resetArticleRemoteSaveSequencerKey(key: string) {
  defaultSequencer.resetKey(key);
}