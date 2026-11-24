import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ArticleDocument } from '../types';
import { resolveArticleConflict } from './articleConflict.ts';

function doc(version: number, title: string): ArticleDocument {
  return {
    id: 'a1',
    title,
    docType: 'custom',
    status: 'draft',
    privacy: 'clan',
    contentHtml: '<p></p>',
    contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: title }] }] },
    linkedPersonIds: [],
    linkedChartIds: [],
    citations: [],
    version,
    wordCount: 1,
    updatedAt: '',
  };
}

test('保留本地副本时改用服务器版本号', () => {
  const resolved = resolveArticleConflict('keep-local', doc(3, '本地'), doc(5, '服务器'));
  assert.equal(resolved.title, '本地');
  assert.equal(resolved.version, 5);
});

test('拉取最新时采用服务器文档', () => {
  const resolved = resolveArticleConflict('take-server', doc(3, '本地'), doc(5, '服务器'));
  assert.equal(resolved.title, '服务器');
  assert.equal(resolved.version, 5);
});