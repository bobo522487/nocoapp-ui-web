
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
        group: 'Basic',
        setter: { component: 'text' }
      },
      {
          name: 'w',
          label: 'Width',
          type: 'number',
          target: 'root',
          defaultValue: 2,
          group: 'Basic',
          setter: {
              component: 'buttonGroup',
              props: {
                  options: [
                      { label: '1/4', value: 3 },
                      { label: '1/3', value: 4 },
                      { label: '1/2', value: 6 },
                      { label: '2/3', value: 8 },
                      { label: '3/4', value: 9 },
                      { label: 'Full', value: 12 },
                  ]
              }
          }
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
