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
  const response = await fetchImpl(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      expectedVersion: request.expectedVersion,
      article: request.article,
    }),
  });
  const body = (await response.json()) as { article: ArticleDocument };
  if (response.status === 409) return { ok: false, status: 409, server: body.article };
  if (!response.ok) throw new Error(`谱文保存失败：${response.status}`);
  return { ok: true, article: body.article };
}