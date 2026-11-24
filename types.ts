import type { GenealogyPlace } from './features/place-input/place.types';

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

export type AssetColorTheme = 'sky' | 'pink' | 'orange' | 'indigo' | 'emerald' | 'violet';

export interface ProjectItem {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  colorTheme: AssetColorTheme;
  ownerType: 'owned' | 'shared';
  defaultTableId: string;
  updatedAt: string;
  primarySurname?: string;
  ancestor?: string;
  region?: GenealogyPlace | null;
  primaryName?: string;
  projectState?: '0' | '1';
  projectLevel?: number;
}

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
