import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
  const apiProxyTarget = process.env.VITE_API_PROXY_TARGET;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      ...(apiProxyTarget
        ? {
            proxy: {
              '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
              },
            },
          }
        : {}),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
