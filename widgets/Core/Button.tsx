import React from 'react';
import { MousePointerClick } from 'lucide-react';
import { Button as ShadButton } from "../../components/ui/button";
import { WidgetDefinition } from '../types';

const ButtonComponent: React.FC<any> = ({ title, variant }) => {
  return (
    <div className="p-4 w-full h-full flex items-center justify-center pointer-events-none">
        <ShadButton className="w-full h-full" variant={variant || 'default'}>
            {title || 'Button'}
        </ShadButton>
    </div>
  );
};

export const ButtonWidget: WidgetDefinition = {
  manifest: {
    type: 'button',
    name: 'Button',
    icon: MousePointerClick,
    category: 'Commonly used',
    defaultSize: { w: 2, h: 2 },
    properties: [
      {
        group: 'General',
        fields: [
          { name: 'title', label: 'Label', type: 'text', defaultValue: 'Button' },
          { name: 'variant', label: 'Variant', type: 'select', options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'], defaultValue: 'default' }
        ]
      }
    ]
  },
  component: ButtonComponent
};
