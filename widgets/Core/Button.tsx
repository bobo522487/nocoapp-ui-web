
import React from 'react';
import { MousePointerClick } from 'lucide-react';
import { Button as ShadButton } from "../../components/ui/button";
import { WidgetDefinition, WidgetProps } from '../types';

const ButtonComponent: React.FC<WidgetProps> = ({ label, variant, size, disabled }) => {
  return (
    <div className="p-4 w-full h-full flex items-center justify-center pointer-events-none">
        <ShadButton 
            className="w-full h-full" 
            variant={variant || 'default'}
            size={size || 'default'}
            disabled={disabled}
        >
            {label || 'Button'}
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
    defaultSize: { w: 3, h: 2 },
    traits: {
        isResizable: true,
        isFormItem: false
    },
    properties: [
      { 
          name: 'label', 
          label: 'Label', 
          type: 'string', 
          defaultValue: 'Button',
          group: 'Basic',
          setter: { component: 'text' }
      },
      {
          name: 'w',
          label: 'Width',
          type: 'number',
          target: 'root',
          defaultValue: 3,
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
          name: 'disabled',
          label: 'Disabled',
          type: 'boolean',
          defaultValue: false,
          group: 'Basic',
          setter: { component: 'switch' }
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
                      { label: 'Outline', value: 'outline' },
                      { label: 'Ghost', value: 'ghost' },
                      { label: 'Link', value: 'link' }
                  ] 
              } 
          }
      },
      {
          name: 'size',
          label: 'Size',
          type: 'string',
          defaultValue: 'default',
          group: 'Style',
          setter: {
              component: 'select',
              props: {
                  options: [
                      { label: 'Default', value: 'default' },
                      { label: 'Small', value: 'sm' },
                      { label: 'Large', value: 'lg' },
                      { label: 'Icon', value: 'icon' }
                  ]
              }
          }
      }
    ],
    events: [
      { name: 'click', label: 'On Click' },
      { name: 'hover', label: 'On Hover' }
    ]
  },
  component: ButtonComponent
};
