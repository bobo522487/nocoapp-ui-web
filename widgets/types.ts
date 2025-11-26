import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GridItemData } from '../types';

export type ControlType = 'text' | 'number' | 'select' | 'switch' | 'color';

export interface PropertyField {
  name: string; // The key in content object (e.g., 'label', 'variant')
  label: string;
  type: ControlType;
  options?: string[]; // For select inputs
  placeholder?: string;
  defaultValue?: any;
}

export interface PropertyGroup {
  group: string;
  fields: PropertyField[];
}

export interface WidgetManifest {
  type: string;
  name: string;
  icon: LucideIcon;
  category: string;
  defaultSize: { w: number; h: number };
  properties: PropertyGroup[];
}

export interface WidgetProps {
  item: GridItemData;
  // Content is passed as spread props or specific object
  [key: string]: any; 
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
