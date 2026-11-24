import type { ArticleSaveCommit } from './articleSaveQueue';

export function articleSaveCommitUpdates(
  commit: ArticleSaveCommit,
): { contentJson: ArticleSaveCommit['contentJson'] } {
  return { contentJson: commit.contentJson };
}

export function persistArticleSaveCommit(
  projectId: string,
  commit: ArticleSaveCommit,
  updateArticleContent: (
    projectId: string,
    articleId: string,
    updates: ReturnType<typeof articleSaveCommitUpdates>,
  ) => void,
) {
  updateArticleContent(projectId, commit.articleId, articleSaveCommitUpdates(commit));
}