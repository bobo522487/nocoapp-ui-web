import { Node, Edge } from '@xyflow/react';
import { PersonRecord } from '../types';

export interface PersonNodeData extends Record<string, unknown> {
  person: PersonRecord;
  generation: number;
  clanSurname?: string;
  isSelected?: boolean;
  isEditingName?: boolean;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  childrenCount?: number;
  biographyPage?: number;
  biographyOrder?: number;
  onSelect?: (personId: string) => void;
  onAddChild?: (personId: string) => void;
  onAddSpouse?: (personId: string) => void;
  onDelete?: (personId: string) => void;
  onToggleCollapse?: (personId: string) => void;
  onCommitName?: (personId: string, name: string, openDrawer: boolean) => void;
  onCancelEditing?: (personId: string) => void;
}

export interface UnionNodeData extends Record<string, unknown> {
  unionId: string;
  fatherId: string;
  spouseName?: string;
  spouseId?: string;
  generation: number;
}

export interface QuickAddNodeData extends Record<string, unknown> {
  kind: 'spouse' | 'sibling' | 'child';
  label: string;
  targetPersonId: string;
  onAction?: () => void;
}

export interface GenHeaderNodeData extends Record<string, unknown> {
  generation: number;
  label: string;
  count?: number;
  onFilterGeneration?: (gen: number) => void;
}

export type PersonFlowNode = Node<PersonNodeData, 'person' | 'bookPerson'>;
export type UnionFlowNode = Node<UnionNodeData, 'union'>;
export type QuickAddFlowNode = Node<QuickAddNodeData, 'quickAdd'>;
export type GenHeaderFlowNode = Node<GenHeaderNodeData, 'genHeader'>;

export type GenealogyFlowNode =
  | PersonFlowNode
  | UnionFlowNode
  | QuickAddFlowNode
  | GenHeaderFlowNode;

export type GenealogyFlowEdge = Edge<{
  relationship?:
    | 'marriage'
    | 'bloodline'
    | 'adoption'
    | 'ghost_marriage'
    | 'ghost_bloodline';
  color?: string;
}>;
