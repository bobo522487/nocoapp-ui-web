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

export function createArticleRemoteSaveSequencer() {
  const attemptIdByKey = new Map<string, number>();
  const chainByKey = new Map<string, Promise<void>>();

  return {
  enqueue(
    key: string,
    attemptId: number,
    fetchImpl: typeof fetch,
    url: string,
    request: ArticleWriteRequest,
    handlers: {
      onSuccess: (article: ArticleDocument) => void;
      onConflict: (server: ArticleDocument) => void;
      onError: (expectedVersion: number) => void;
    },
  ) {
    attemptIdByKey.set(key, attemptId);
    const expectedVersion = request.expectedVersion;
    const previous = chainByKey.get(key) ?? Promise.resolve();
    const next = previous
      .then(async (): Promise<void> => {
        if (attemptIdByKey.get(key) !== attemptId) return;
        let result: SaveResult;
        try {
          result = await saveArticleRemote(fetchImpl, url, request);
        } catch {
          if (attemptIdByKey.get(key) === attemptId) {
            handlers.onError(expectedVersion);
          }
          return;
        }
        if (attemptIdByKey.get(key) !== attemptId) return;
        if (result.ok) {
          handlers.onSuccess(result.article);
          return;
        }
        if (result.status === 409) {
          handlers.onConflict(result.server);
        }
      })
      .catch(() => undefined);
    chainByKey.set(key, next);
    return next;
  },
  resetKey(key: string) {
    attemptIdByKey.delete(key);
    chainByKey.delete(key);
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
  handlers: {
    onSuccess: (article: ArticleDocument) => void;
    onConflict: (server: ArticleDocument) => void;
    onError: (expectedVersion: number) => void;
  },
) {
  return defaultSequencer.enqueue(key, attemptId, fetchImpl, url, request, handlers);
}

export function resetArticleRemoteSaveSequencerKey(key: string) {
  defaultSequencer.resetKey(key);
}