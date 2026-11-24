import { saveArticleRemote } from './api';
import type { ArticleSavePort } from './domain/articleWrite';

export function createHttpArticleSave(
  fetchImpl: typeof fetch,
  urlFor: (articleId: string) => string,
): ArticleSavePort {
  return (request) => saveArticleRemote(fetchImpl, urlFor(request.articleId), request);
}
