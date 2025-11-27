
import React from 'react';
import { TextCursor } from 'lucide-react';
import { Input } from "../../components/ui/input";
import { WidgetDefinition, WidgetProps } from '../types';

const InputComponent: React.FC<WidgetProps> = ({ label, placeholder, defaultValue }) => {
  return (
    <div className="p-4 w-full h-full flex flex-col gap-2 pointer-events-none">
        {label && (
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label}
            </label>
        )}
        <Input 
            placeholder={placeholder} 
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
    defaultSize: { w: 6, h: 2 },
    traits: { isFormItem: true },
    properties: [
      { 
          name: 'label', 
          label: 'Label', 
          type: 'string', 
          defaultValue: 'Input Label', 
          group: 'General',
          setter: { component: 'text' }
      },
      { 
          name: 'placeholder', 
          label: 'Placeholder', 
          type: 'string', 
          defaultValue: 'Enter text...', 
          group: 'General',
          setter: { component: 'text' }
      },
      { 
          name: 'defaultValue', 
          label: 'Default Value', 
          type: 'string', 
          group: 'Data',
          setter: { component: 'text' }
      }
    ],
    events: [
        { name: 'change', label: 'On Change' },
        { name: 'focus', label: 'On Focus' },
        { name: 'blur', label: 'On Blur' }
    ]
  },
  component: InputComponent
};
