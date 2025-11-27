
import React from 'react';
import { Tag } from 'lucide-react';
import { Badge } from "../../components/ui/badge";
import { WidgetDefinition, WidgetProps } from '../types';

const BadgeComponent: React.FC<WidgetProps> = ({ label, variant }) => {
  return (
    <div className="w-full h-full flex items-center justify-center p-2 pointer-events-none">
      <Badge variant={variant || 'default'}>
        {label || 'Status'}
      </Badge>
    </div>
  );
};

export const BadgeWidget: WidgetDefinition = {
  manifest: {
    type: 'badge',
    name: 'Badge',
    icon: Tag,
    category: 'Data',
    defaultSize: { w: 2, h: 1 },
    properties: [
      {
        name: 'label',
        label: 'Label',
        type: 'string',
        defaultValue: 'In Stock',
        group: 'Data',
        setter: { component: 'text' }
      },
      {
        name: 'variant',
        label: 'Variant',
        type: 'string',
        defaultValue: 'default',
        group: 'Style',
        setter: {
          component: 'select',
          props: {
            options: [
              { label: 'Default', value: 'default' },
              { label: 'Secondary', value: 'secondary' },
              { label: 'Destructive', value: 'destructive' },
              { label: 'Outline', value: 'outline' }
            ]
          }
        }
      }
    ]
  },
  component: BadgeComponent
};
