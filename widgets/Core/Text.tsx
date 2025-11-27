
import React from 'react';
import { Type } from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../types';

const TextComponent: React.FC<WidgetProps> = ({ content, fontSize, align, color }) => {
  return (
    <div className={`p-4 w-full h-full flex flex-col justify-center pointer-events-none text-${align || 'left'}`}>
        <p style={{ fontSize: `${fontSize || 14}px`, color: color }} className="text-foreground whitespace-pre-wrap">
            {content || 'Text Content'}
        </p>
    </div>
  );
};

export const TextWidget: WidgetDefinition = {
  manifest: {
    type: 'text',
    name: 'Text',
    icon: Type,
    category: 'Commonly used',
    defaultSize: { w: 4, h: 2 },
    properties: [
      { 
          name: 'content', 
          label: 'Content', 
          type: 'string', 
          defaultValue: 'Text Content', 
          group: 'Basic',
          setter: { component: 'textarea' }
      },
      {
          name: 'w',
          label: 'Width',
          type: 'number',
          target: 'root',
          defaultValue: 4,
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
          name: 'fontSize', 
          label: 'Font Size', 
          type: 'number', 
          defaultValue: 14, 
          group: 'Style',
          setter: { component: 'number' }
      },
      { 
          name: 'align', 
          label: 'Alignment', 
          type: 'string', 
          defaultValue: 'left', 
          group: 'Style',
          setter: { 
              component: 'select',
              props: {
                  options: [
                      { label: 'Left', value: 'left' },
                      { label: 'Center', value: 'center' },
                      { label: 'Right', value: 'right' }
                  ]
              }
          }
      },
      {
          name: 'color',
          label: 'Text Color',
          type: 'string',
          group: 'Style',
          setter: { component: 'color' }
      }
    ]
  },
  component: TextComponent
};
