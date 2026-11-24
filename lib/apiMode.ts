export type ApiMode = 'direct-mock' | 'network';

export type ApiModeEnv = {
  VITE_ENABLE_MOCK?: string;
  VITE_API_PROXY_TARGET?: string;
};

export function resolveApiMode(env: ApiModeEnv | ImportMetaEnv): ApiMode {
  if (env.VITE_ENABLE_MOCK === '0') return 'network';
  if (env.VITE_API_PROXY_TARGET) return 'network';
  return 'direct-mock';
}