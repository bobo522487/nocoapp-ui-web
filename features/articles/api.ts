import type { ArticleDocument } from './types';

export interface ArticleWriteRequest {
  articleId: string;
  expectedVersion: number;
  article: ArticleDocument;
}

export async function saveArticleRemote(
  fetchImpl: typeof fetch,
  url: string,
  request: ArticleWriteRequest,
): Promise<
  | { ok: true; article: ArticleDocument }
  | { ok: false; status: 409; server: ArticleDocument }
> {
  const signal =
    typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(10_000)
      : undefined;

  const response = await fetchImpl(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    signal,
    body: JSON.stringify({
      expectedVersion: request.expectedVersion,
      article: request.article,
    }),
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('yunpu:unauthorized'));
  }

  let raw: unknown = null;
  try {
    raw = await response.json();
  } catch {
    raw = null;
  }

  const envelopeData =
    raw &&
    typeof raw === 'object' &&
    'ok' in raw &&
    'data' in raw &&
    (raw as { ok: boolean }).ok === true
      ? (raw as { data: { article?: ArticleDocument } }).data
      : (raw as { article?: ArticleDocument } | null);

  if (response.status === 409 && envelopeData?.article) {
    return { ok: false, status: 409, server: envelopeData.article };
  }
  if (!response.ok || !envelopeData?.article) {
    throw new Error(`谱文保存失败：${response.status}`);
  }
  return { ok: true, article: envelopeData.article };
}