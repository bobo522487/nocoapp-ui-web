export type AppTheme = 'archival';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Workspace {
  id: string;
  name: string;
  kind: 'personal' | 'team';
  color: string;
  plan: string;
  createdAt: string;
}

export type { ProjectColorTheme as AssetColorTheme } from './features/dashboard/api';

export interface WorkspaceNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  bio?: string;
}