import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ArticleDocument } from '../types';
import { createArticleRemoteSaveSequencer } from './articleRemoteSave.ts';

const baseDoc = (version: number): ArticleDocument => ({
  id: 'a1',
  title: '谱文',
  subtitle: '',
  author: '',
  docType: 'custom',
  status: 'draft',
  privacy: 'clan',
  contentHtml: '<p>谱</p>',
  linkedPersonIds: [],
  linkedChartIds: [],
  citations: [],
  version,
  wordCount: 1,
  updatedAt: '刚刚',
});

test('远端保存串行且仅最新尝试应用 200', async () => {
  const sequencer = createArticleRemoteSaveSequencer();
  const applied: number[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as {
      expectedVersion: number;
    };
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(
      JSON.stringify({ article: baseDoc(payload.expectedVersion + 1) }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  void sequencer.enqueue('k1', 1, fetchImpl, '/api/articles/a1', {
    articleId: 'a1',
    expectedVersion: 1,
    article: baseDoc(2),
  }, {
    onSuccess: (article) => applied.push(article.version),
    onConflict: () => assert.fail('不应冲突'),
    onError: () => assert.fail('不应失败'),
  });

  void sequencer.enqueue('k1', 2, fetchImpl, '/api/articles/a1', {
    articleId: 'a1',
    expectedVersion: 2,
    article: baseDoc(3),
  }, {
    onSuccess: (article) => applied.push(article.version),
    onConflict: () => assert.fail('不应冲突'),
    onError: () => assert.fail('不应失败'),
  });

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(applied, [3]);
});

test('请求失败时回滚版本号', async () => {
  const sequencer = createArticleRemoteSaveSequencer();
  let reverted: number | null = null;
  const fetchImpl: typeof fetch = async () => {
    throw new Error('network');
  };

  await sequencer.enqueue('k2', 1, fetchImpl, '/api/articles/a2', {
    articleId: 'a2',
    expectedVersion: 4,
    article: baseDoc(5),
  }, {
    onSuccess: () => assert.fail('不应成功'),
    onConflict: () => assert.fail('不应冲突'),
    onError: (expectedVersion) => {
      reverted = expectedVersion;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(reverted, 4);
});

test('过期的 200 仍推进 acceptedVersion 供后续请求使用', async () => {
  const sequencer = createArticleRemoteSaveSequencer();
  const versionsSent: number[] = [];
  let acceptedVersion = 1;
  let secondChain: Promise<void> = Promise.resolve();
  let secondEnqueued: () => void = () => undefined;
  const secondEnqueuedPromise = new Promise<void>((resolve) => {
    secondEnqueued = resolve;
  });

  const handlers = {
    onSuccess: (article: ArticleDocument) => {
      acceptedVersion = article.version;
    },
    onConflict: () => assert.fail('不应冲突'),
    onError: () => assert.fail('不应失败'),
    onSupersededSuccess: (article: ArticleDocument) => {
      acceptedVersion = article.version;
    },
  };

  const resolveRequest = () => ({
    articleId: 'a3',
    expectedVersion: acceptedVersion,
    article: baseDoc(acceptedVersion),
  });

  const fetchImpl: typeof fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as {
      expectedVersion: number;
    };
    versionsSent.push(payload.expectedVersion);
    if (versionsSent.length === 1) {
      secondChain = sequencer.enqueue(
        'k3',
        2,
        fetchImpl,
        '/api/articles/a3',
        resolveRequest(),
        handlers,
        resolveRequest,
      );
      secondEnqueued();
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(
      JSON.stringify({ article: baseDoc(payload.expectedVersion + 1) }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const chain = sequencer.enqueue(
    'k3',
    1,
    fetchImpl,
    '/api/articles/a3',
    resolveRequest(),
    handlers,
    resolveRequest,
  );

  await secondEnqueuedPromise;
  await Promise.all([chain, secondChain]);
  assert.deepEqual(versionsSent, [1, 2]);
  assert.equal(acceptedVersion, 3);
});