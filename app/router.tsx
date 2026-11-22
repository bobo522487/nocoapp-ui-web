import React from 'react';
import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import MainLayout from '../components/layout/MainLayout';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import WorkspaceHomePage from '../features/dashboard/pages/WorkspaceHomePage';
import MembersPage from '../features/dashboard/pages/MembersPage';
import WorkspaceSettingsPage from '../features/dashboard/pages/WorkspaceSettingsPage';
import ProjectHomePage from '../features/project/pages/ProjectHomePage';
import ProjectSettingsPage from '../features/project/pages/ProjectSettingsPage';
import GenealogySectionPage from '../features/project/pages/GenealogySectionPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import OnboardingPage from '../features/auth/pages/OnboardingPage';
import { useAuthStore } from '../features/auth/useAuthStore';

export function sanitizeRedirectPath(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return undefined;
  return trimmed;
}

function parseInviteSearch(search: Record<string, unknown>): { invite?: string } {
  const raw = search.invite;
  if (typeof raw === 'string' && raw.trim()) {
    return { invite: raw.trim() };
  }
  return {};
}

const RootComponent: React.FC = () => (
  <>
    <Outlet />
    <TanStackRouterDevtools position="bottom-right" />
  </>
);

const AuthGuardLayout: React.FC = () => {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        正在检查登录状态...
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return <Outlet />;
};

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <Navigate to="/home" replace />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: sanitizeRedirectPath(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    const { status, onboarding } = useAuthStore.getState();
    if (status === 'authenticated') {
      if (onboarding) {
        throw redirect({ to: '/onboarding', replace: true });
      }
      if (search.redirect) {
        throw redirect({ href: search.redirect, replace: true });
      }
      throw redirect({ to: '/home', replace: true });
    }
  },
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: parseInviteSearch,
  beforeLoad: () => {
    const { status, onboarding } = useAuthStore.getState();
    if (status === 'authenticated') {
      throw redirect({
        to: onboarding ? '/onboarding' : '/home',
        replace: true,
      });
    }
  },
  component: RegisterPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
});

/** 邀请链接入口：`/invite/$token` → 引导页并预填令牌。 */
const inviteRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/onboarding',
      search: { invite: params.token || undefined },
      replace: true,
    });
  },
});

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  beforeLoad: ({ location }) => {
    const { status } = useAuthStore.getState();
    if (status === 'anonymous') {
      throw redirect({
        to: '/login',
        search: {
          redirect: sanitizeRedirectPath(location.href),
        },
        replace: true,
      });
    }
  },
  component: AuthGuardLayout,
});

const onboardingRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/onboarding',
  validateSearch: parseInviteSearch,
  beforeLoad: ({ search }) => {
    const { status, defaultOrganization } = useAuthStore.getState();
    if (status === 'authenticated' && defaultOrganization && !search.invite) {
      // 带邀请链接进入时即使已有组织也允许兑换（spec 003 US3 场景 7）。
      throw redirect({ to: '/home', replace: true });
    }
  },
  component: OnboardingPage,
});

/** 引导状态（无可用组织）时不渲染控制台四页，整体重定向到 /onboarding。 */
const consoleGateRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  id: '_console',
  beforeLoad: () => {
    const { status, onboarding } = useAuthStore.getState();
    if (status === 'authenticated' && onboarding) {
      throw redirect({ to: '/onboarding', replace: true });
    }
  },
  component: MainLayout,
});

// Workspace Shell Routes
const indexRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/',
  component: DashboardPage,
});

const projectsIndexRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects',
  component: DashboardPage,
});

const homeRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/home',
  component: WorkspaceHomePage,
});

const membersRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/members',
  component: MembersPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/settings',
  component: WorkspaceSettingsPage,
});

// Project Shell Routes
const projectHomeRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId',
  component: ProjectHomePage,
});

const projectLineageRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/lineage',
  component: () => <GenealogySectionPage section="lineage" />,
});

const projectArticlesRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/articles',
  component: () => <GenealogySectionPage section="articles" />,
});

const projectBooksRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/books',
  component: () => <GenealogySectionPage section="books" />,
});

const projectSettingsRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/settings',
  component: ProjectSettingsPage,
});

// 已下线的模板功能（应用构建/数据表/数据源/代码文件）统一回落到项目首页或工作区首页
const projectDataFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/data/$tableId',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId',
      params: { projectId: params.projectId },
      replace: true,
    });
  },
});

const projectDatasourcesFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/datasources/$',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId',
      params: { projectId: params.projectId },
      replace: true,
    });
  },
});

const projectFilesFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/files',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId',
      params: { projectId: params.projectId },
      replace: true,
    });
  },
});

const projectAppsFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/projects/$projectId/apps/$',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId',
      params: { projectId: params.projectId },
      replace: true,
    });
  },
});

const appsFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/apps/$',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
});

const dataFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/data/$',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
});

const datasourcesFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/datasources/$',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
});

const filesFallbackRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/files',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
});

const consoleCatchAllRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  path: '/$',
  beforeLoad: () => {
    throw redirect({ to: '/home', replace: true });
  },
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  inviteRedirectRoute,
  authLayoutRoute.addChildren([
    onboardingRoute,
    consoleGateRoute.addChildren([
      indexRoute,
      projectsIndexRoute,
      homeRoute,
      membersRoute,
      settingsRoute,
      projectHomeRoute,
      projectLineageRoute,
      projectArticlesRoute,
      projectBooksRoute,
      projectSettingsRoute,
      projectDataFallbackRoute,
      projectDatasourcesFallbackRoute,
      projectFilesFallbackRoute,
      projectAppsFallbackRoute,
      appsFallbackRoute,
      dataFallbackRoute,
      datasourcesFallbackRoute,
      filesFallbackRoute,
      consoleCatchAllRoute,
    ]),
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
