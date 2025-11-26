import React from 'react';
import { TextCursor } from 'lucide-react';
import { Input } from "../../components/ui/input";
import { WidgetDefinition } from '../types';

const InputComponent: React.FC<any> = ({ title, placeholder, defaultValue }) => {
  return (
    <div className="p-4 w-full h-full flex flex-col gap-2 pointer-events-none">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {title || 'Input Label'}
        </label>
        <Input 
            placeholder={placeholder || "Enter text..."} 
            defaultValue={defaultValue} 
            className="bg-background" 
        />
    </div>
  );
};

export const InputWidget: WidgetDefinition = {
  manifest: {
    type: 'input',
    name: 'Input',
    icon: TextCursor,
    category: 'Commonly used',
    defaultSize: { w: 12, h: 2 },
    properties: [
      {
        group: 'General',
        fields: [
          { name: 'title', label: 'Label', type: 'text', defaultValue: 'Input Label' },
          { name: 'placeholder', label: 'Placeholder', type: 'text', defaultValue: 'Enter text...' },
          { name: 'defaultValue', label: 'Default Value', type: 'text' }
        ]
      }
    ]
  },
  component: InputComponent
};
