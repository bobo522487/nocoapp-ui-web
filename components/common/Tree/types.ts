
import { UniqueIdentifier } from '@dnd-kit/core';

export interface TreeItem {
  id: UniqueIdentifier;
  children: TreeItem[];
  collapsed?: boolean;
  [key: string]: any;
}

export interface TreeItemData {
  id: UniqueIdentifier;
  parentId: UniqueIdentifier | null;
  depth: number;
  index: number;
  children: TreeItem[];
  collapsed?: boolean;
  [key: string]: any;
}

export interface FlattenedItem extends TreeItemData {
  parentId: UniqueIdentifier | null;
  depth: number;
  index: number;
}

export type SensorContext = React.MutableRefObject<{
  items: FlattenedItem[];
  offset: number;
}>;
