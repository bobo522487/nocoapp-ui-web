import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { buildApiProxyConfig, resolveProxyTarget } from './lib/apiMode';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = resolveProxyTarget(process.env, fileEnv);
  const proxy = buildApiProxyConfig(apiProxyTarget);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      ...(proxy ? { proxy } : {}),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('elkjs')) return 'vendor-elkjs';
            if (id.includes('@xyflow/react')) return 'vendor-xyflow';
            if (id.includes('@tiptap/')) return 'vendor-tiptap';
            if (id.includes('element-china-area-data')) return 'vendor-area-data';
            if (id.includes('tyme4ts')) return 'vendor-tyme4ts';
            if (id.includes('pinyin-pro')) return 'vendor-pinyin';
            if (id.includes('@dnd-kit/')) return 'vendor-dndkit';
            if (id.includes('@tanstack/react-router')) return 'vendor-router';
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
  };
});
