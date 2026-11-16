/**
 * Mock 后端开关。
 *
 * 当未配置外部后端代理（VITE_API_PROXY_TARGET）且未显式关闭（VITE_ENABLE_MOCK=0），
 * 或显式设置 VITE_ENABLE_MOCK=1 时，启用本地离线后端以保证前端独立运行。
 */
export function shouldEnableMock(): boolean {
  if (import.meta.env.VITE_ENABLE_MOCK === '0') return false;
  if (import.meta.env.VITE_ENABLE_MOCK === '1') return true;
  return !import.meta.env.VITE_API_PROXY_TARGET;
}

/** 按需加载并注册本地 mock 后端；返回是否实际启用。 */
export async function maybeEnableMock(): Promise<boolean> {
  if (!shouldEnableMock()) return false;
  const { registerMockHandler } = await import('../../lib/api');
  const { handleMockRequest } = await import('./mockAuth');
  registerMockHandler(handleMockRequest, {
    direct: !import.meta.env.VITE_API_PROXY_TARGET,
  });
  return true;
}
