import React, { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useAuthStore } from '../features/auth/useAuthStore';
import {
  resolveIsDarkMode,
  usePreferencesStore,
} from '../store/usePreferencesStore';

const App: React.FC = () => {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // 认证状态切换（会话自举完成、登出、401 失效）时刷新路由守卫。
  useEffect(() => {
    let prevStatus = useAuthStore.getState().status;
    let prevOnboarding = useAuthStore.getState().onboarding;
    let prevOrgId = useAuthStore.getState().defaultOrganization?.id ?? null;

    return useAuthStore.subscribe((state) => {
      const nextOrgId = state.defaultOrganization?.id ?? null;
      if (
        state.status !== prevStatus ||
        state.onboarding !== prevOnboarding ||
        nextOrgId !== prevOrgId
      ) {
        prevStatus = state.status;
        prevOnboarding = state.onboarding;
        prevOrgId = nextOrgId;
        void router.invalidate();
      }
    });
  }, []);

  // 会话失效（任意请求 401）→ 清会话，触发路由守卫跳转登录（SC-009）。
  useEffect(() => {
    const onUnauthorized = () => useAuthStore.getState().markUnauthorized();
    window.addEventListener('yunpu:unauthorized', onUnauthorized);
    return () => window.removeEventListener('yunpu:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    const applyThemeClass = () => {
      const root = document.documentElement;
      const dark = resolveIsDarkMode(themeMode);
      if (dark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      root.classList.remove(
        'theme-slack',
        'theme-supabase',
        'theme-vscode',
        'theme-vercel'
      );
    };

    applyThemeClass();

    if (themeMode === 'system' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        setThemeMode('system');
        applyThemeClass();
      };
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
  }, [themeMode, setThemeMode]);

  return <RouterProvider router={router} />;
};

export default App;
