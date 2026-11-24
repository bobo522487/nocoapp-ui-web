import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveApiMode } from './apiMode.ts';

test('无代理时走 direct-mock，供 AI Studio 单独运行', () => {
  assert.equal(resolveApiMode({}), 'direct-mock');
  assert.equal(resolveApiMode({ VITE_ENABLE_MOCK: '1' }), 'direct-mock');
});

test('设置了代理就只走 network，即使 VITE_ENABLE_MOCK=1', () => {
  assert.equal(
    resolveApiMode({ VITE_API_PROXY_TARGET: 'http://127.0.0.1:3001' }),
    'network',
  );
  assert.equal(
    resolveApiMode({
      VITE_ENABLE_MOCK: '1',
      VITE_API_PROXY_TARGET: 'http://127.0.0.1:3001',
    }),
    'network',
  );
});

test('VITE_ENABLE_MOCK=0 强制 network', () => {
  assert.equal(resolveApiMode({ VITE_ENABLE_MOCK: '0' }), 'network');
});