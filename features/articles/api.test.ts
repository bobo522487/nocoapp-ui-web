import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveArticleRemote } from './api.ts';

test('409 解析出服务器文档', async () => {
  const server = { id: 'a1', version: 5, title: '服务器' };
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ article: server }), { status: 409 });
  const result = await saveArticleRemote(fetchImpl, '/api/articles/a1', {
    articleId: 'a1',
    expectedVersion: 4,
    article: server as never,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.equal(result.server.version, 5);
  }
});