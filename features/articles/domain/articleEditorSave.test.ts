import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { JSONContent } from '@tiptap/core';
import { persistArticleSaveCommit } from './articleEditorSave.ts';

test('persistArticleSaveCommit 按 commit.articleId 写入而非当前屏幕篇章', () => {
  const calls: Array<{ projectId: string; articleId: string }> = [];
  const contentJson: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '甲篇' }] }],
  };
  persistArticleSaveCommit(
    'project-1',
    {
      articleId: 'article-a',
      contentJson,
      contentHtml: '<p>甲篇</p>',
      wordCount: 2,
      paragraphCount: 1,
      linkedPersonIds: [],
      linkedChartIds: [],
    },
    (projectId, articleId) => {
      calls.push({ projectId, articleId });
    },
  );
  assert.deepEqual(calls, [{ projectId: 'project-1', articleId: 'article-a' }]);
  assert.notEqual(calls[0]?.articleId, 'article-b');
});