
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GridItemData } from '../types';

export type SetterType = 'text' | 'number' | 'select' | 'switch' | 'color' | 'textarea' | 'icon';

export interface PropSetter {
  component: SetterType;
  props?: Record<string, any>;
}

export interface PropDefinition {
  name: string;
  label: string;
  type: string;
  defaultValue?: any;
  description?: string;
  group?: string; // e.g., 'General', 'Style', 'Layout', 'Data'
  setter?: PropSetter;
}

export interface WidgetTraits {
  isContainer?: boolean;
  isResizable?: boolean;
  isFormItem?: boolean;
}

export interface WidgetManifest {
  type: string;
  name: string;
  icon: LucideIcon;
  category: string;
  defaultSize: { w: number; h: number };
  traits?: WidgetTraits;
  properties: PropDefinition[];
}

export interface WidgetProps {
  item: GridItemData;
  [key: string]: any; // Content properties spread
}

export interface WidgetDefinition {
  manifest: WidgetManifest;
  component: React.FC<WidgetProps>;
}

export interface WidgetRegistry {
  register: (def: WidgetDefinition) => void;
  get: (type: string) => WidgetDefinition | undefined;
  getAll: () => WidgetDefinition[];
  getByCategory: (category: string) => WidgetDefinition[];
  getCategories: () => string[];
}
