import { useLocation, useMatch } from 'react-router-dom';
import { ViewMode } from '../types';

export interface RouteContext {
  activeView: ViewMode;
  appId: string;
  activePageId: string;
  activeTableId: string;
  datasourceId?: string;
  isWorkspaceShell: boolean;
}

export const useRouteContext = (): RouteContext => {
  const { pathname } = useLocation();
  const appPageMatch = useMatch('/apps/:appId/pages/:pageId');
  const appMatch = useMatch('/apps/:appId');
  const dataMatch = useMatch('/data/:tableId');
  const pgMatch = useMatch('/datasources/postgresql/:id');

  let activeView = ViewMode.PROJECTS;
  let isWorkspaceShell = true;

  if (pathname === '/home') {
    activeView = ViewMode.HOME;
  } else if (pathname === '/' || pathname === '/projects') {
    activeView = ViewMode.PROJECTS;
  } else if (pathname.startsWith('/members')) {
    activeView = ViewMode.MEMBERS;
  } else if (pathname.startsWith('/settings')) {
    activeView = ViewMode.WORKSPACE_SETTINGS;
  } else if (pathname.startsWith('/apps')) {
    activeView = ViewMode.APPS;
    isWorkspaceShell = false;
  } else if (pathname.startsWith('/data')) {
    activeView = ViewMode.DATA;
    isWorkspaceShell = false;
  } else if (pathname.startsWith('/datasources')) {
    activeView = ViewMode.DATASOURCE;
    isWorkspaceShell = false;
  } else if (pathname.startsWith('/files')) {
    activeView = ViewMode.SETTINGS;
    isWorkspaceShell = false;
  }

  return {
    activeView,
    appId: appPageMatch?.params.appId || appMatch?.params.appId || 'app-order-mgmt',
    activePageId: appPageMatch?.params.pageId || '',
    activeTableId: dataMatch?.params.tableId || '',
    datasourceId: pgMatch?.params.id,
    isWorkspaceShell,
  };
};
