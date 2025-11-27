export enum FileType {
  FILE = 'FILE',
  FOLDER = 'FOLDER'
}

export interface FileSystemNode {
  id: string;
  name: string;
  type: FileType;
  content?: string;
  isOpen?: boolean; // For folders
  children?: FileSystemNode[];
  language?: string;
}

export enum ViewMode {
  HOME = 'HOME',
  APPS = 'APPS',
  DATA = 'DATA',
  SETTINGS = 'SETTINGS'
}

export interface Tab {
  id: string;
  fileId: string;
  title: string;
  isDirty?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface QueryConfig {
  id?: string;
  type?: string;
  definition: {
    source?: string;
    tableId?: string;
    select?: string[];
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
    limit?: number;
    [key: string]: any;
  };
}

export interface Page {
  id: string;
  name: string;
  type: 'page' | 'folder';
  parentId?: string;
  isOpen?: boolean;
  icon: string; // Icon name string
  isHome: boolean;
  isHidden: boolean;
  isDisabled: boolean;
  height: string;
  content?: {
    state?: Record<string, any>;
    queries?: Record<string, QueryConfig>;
    lifecycle?: {
      onMount?: any[];
    };
    [key: string]: any;
  };
}

export interface DbTable {
  id: string;
  orgId?: string;
  sourceId?: string;
  name: string;
  code: string;
  physicalName?: string;
  kind: 'table' | 'view';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface GridItemData {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  type: string;
  title?: string;
  content?: any;
}

export interface SchemaField {
  id: string;
  name: string;
  type: 'serial' | 'varchar' | 'int' | 'bigint' | 'float' | 'boolean' | 'date with time' | 'jsonb';
  defaultValue: string;
  isPrimary: boolean;
  isForeignKey?: boolean;
  isUnique: boolean;
  isNullable: boolean;
  description?: string;
  flex?: boolean;
  width?: number;
  icon?: any;
  timeZone?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  bio?: string;
}