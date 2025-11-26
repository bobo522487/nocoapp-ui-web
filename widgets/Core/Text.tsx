import React from 'react';
import { Type } from 'lucide-react';
import { WidgetDefinition } from '../types';

const TextComponent: React.FC<any> = ({ title, fontSize, align }) => {
  return (
    <div className={`p-4 w-full h-full flex flex-col justify-center pointer-events-none text-${align || 'left'}`}>
        <p style={{ fontSize: `${fontSize || 14}px` }} className="text-foreground">
            {title || 'Text Content'}
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
        group: 'General',
        fields: [
          { name: 'title', label: 'Content', type: 'text', defaultValue: 'Text Content' },
          { name: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 14 },
          { name: 'align', label: 'Alignment', type: 'select', options: ['left', 'center', 'right'], defaultValue: 'left' }
        ]
      }
    ]
  },
  component: TextComponent
};
