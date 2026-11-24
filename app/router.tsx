import React, { Suspense, lazy } from 'react';
import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import WorkspaceShellLayout from '../components/layout/WorkspaceShellLayout';
import ProjectShellLayout from '../components/layout/ProjectShellLayout';
import { CommandPaletteProvider } from '../components/layout/CommandPaletteModal';
import { useAuthStore } from '../features/auth/useAuthStore';

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      }))
    )
  : () => null;

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
    {import.meta.env.DEV && (
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    )}
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

const ConsoleShellProvider: React.FC = () => (
  <CommandPaletteProvider>
    <Outlet />
  </CommandPaletteProvider>
);

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
  component: lazyRouteComponent(() => import('../features/auth/pages/LoginPage')),
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
  component: lazyRouteComponent(
    () => import('../features/auth/pages/RegisterPage')
  ),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: lazyRouteComponent(
    () => import('../features/auth/pages/ForgotPasswordPage')
  ),
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
      throw redirect({ to: '/home', replace: true });
    }
  },
  component: lazyRouteComponent(
    () => import('../features/auth/pages/OnboardingPage')
  ),
});

/** 引导状态（无可用组织）时不渲染控制台，整体重定向到 /onboarding。 */
const consoleGateRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  id: '_console',
  beforeLoad: () => {
    const { status, onboarding } = useAuthStore.getState();
    if (status === 'authenticated' && onboarding) {
      throw redirect({ to: '/onboarding', replace: true });
    }
  },
  component: ConsoleShellProvider,
});

// Workspace Shell Layout & Routes
const workspaceShellRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  id: '_workspaceShell',
  component: WorkspaceShellLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => workspaceShellRoute,
  path: '/',
  component: lazyRouteComponent(
    () => import('../features/dashboard/pages/DashboardPage')
  ),
});

const projectsIndexRoute = createRoute({
  getParentRoute: () => workspaceShellRoute,
  path: '/projects',
  component: lazyRouteComponent(
    () => import('../features/dashboard/pages/DashboardPage')
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => workspaceShellRoute,
  path: '/home',
  component: lazyRouteComponent(
    () => import('../features/dashboard/pages/WorkspaceHomePage')
  ),
});

const membersRoute = createRoute({
  getParentRoute: () => workspaceShellRoute,
  path: '/members',
  component: lazyRouteComponent(
    () => import('../features/dashboard/pages/MembersPage')
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => workspaceShellRoute,
  path: '/settings',
  component: lazyRouteComponent(
    () => import('../features/dashboard/pages/WorkspaceSettingsPage')
  ),
});

// Project Shell Layout & Routes
const projectShellRoute = createRoute({
  getParentRoute: () => consoleGateRoute,
  id: '_projectShell',
  component: ProjectShellLayout,
});

const projectHomeRoute = createRoute({
  getParentRoute: () => projectShellRoute,
  path: '/projects/$projectId',
  component: lazyRouteComponent(
    () => import('../features/project/pages/ProjectHomePage')
  ),
});

const projectLineageRoute = createRoute({
  getParentRoute: () => projectShellRoute,
  path: '/projects/$projectId/lineage',
  component: lazyRouteComponent(
    () => import('../features/lineage/pages/LineagePage')
  ),
});

const projectArticlesRoute = createRoute({
  getParentRoute: () => projectShellRoute,
  path: '/projects/$projectId/articles',
  component: lazyRouteComponent(
    () => import('../features/articles/pages/ArticlesPage')
  ),
});

const projectBooksRoute = createRoute({
  getParentRoute: () => projectShellRoute,
  path: '/projects/$projectId/books',
  component: lazyRouteComponent(
    () => import('../features/books/pages/BooksPage')
  ),
});

const projectSettingsRoute = createRoute({
  getParentRoute: () => projectShellRoute,
  path: '/projects/$projectId/settings',
  component: lazyRouteComponent(
    () => import('../features/project/pages/ProjectSettingsPage')
  ),
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
      workspaceShellRoute.addChildren([
        indexRoute,
        projectsIndexRoute,
        homeRoute,
        membersRoute,
        settingsRoute,
      ]),
      projectShellRoute.addChildren([
        projectHomeRoute,
        projectLineageRoute,
        projectArticlesRoute,
        projectBooksRoute,
        projectSettingsRoute,
      ]),
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
