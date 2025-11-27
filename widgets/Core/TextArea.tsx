
import React, { useState, useEffect } from 'react';
import { FileText, AlignLeft, AlignRight, AlignVerticalJustifyStart, Info } from 'lucide-react';
import { Textarea } from "../../components/ui/textarea";
import { WidgetDefinition, WidgetProps } from '../types';
import { cn } from '../../lib/utils';

const TextAreaComponent: React.FC<WidgetProps> = ({ 
    label, 
    placeholder, 
    defaultValue,
    showLabel = true, 
    labelPosition = 'top',
    labelTextColor,
    fieldTextColor,
    fieldBackgroundColor,
    fieldBorderColor,
    required,
    tooltip,
    disabled,
    readOnly,
    maxLength,
    rows
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  useEffect(() => {
      setInternalValue(defaultValue || '');
  }, [defaultValue]);

  const renderLabel = () => (
      <div className="flex items-center gap-1 mb-1.5" style={{ color: labelTextColor }}>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap">
            {label}
        </label>
        {required && <span className="text-destructive text-xs">*</span>}
        {tooltip && (
            <div title={tooltip} className="cursor-help">
                <Info size={12} className="text-muted-foreground" />
            </div>
        )}
      </div>
  );

  return (
    <div className={cn(
        "p-4 w-full h-full flex pointer-events-auto", 
        labelPosition === 'top' ? 'flex-col' : 'flex-row items-start gap-4'
    )}>
        {showLabel && label && (
            <div className={cn(
                labelPosition === 'top' ? 'w-full' : 'w-1/3 flex-shrink-0 pt-2',
                labelPosition === 'right' ? 'order-last' : ''
            )}>
               {renderLabel()}
            </div>
        )}
        
        <div className="flex-1 w-full relative group">
            <Textarea 
                placeholder={placeholder} 
                value={internalValue}
                onChange={(e) => setInternalValue(e.target.value)}
                disabled={disabled}
                readOnly={readOnly}
                maxLength={maxLength}
                rows={rows || 3}
                className="w-full resize-none"
                style={{
                    color: fieldTextColor,
                    backgroundColor: fieldBackgroundColor,
                    borderColor: fieldBorderColor
                }}
            />
        </div>
    </div>
  );
};

export const TextAreaWidget: WidgetDefinition = {
  manifest: {
    type: 'textarea',
    name: 'Text Area',
    icon: FileText,
    category: 'Text input',
    defaultSize: { w: 6, h: 3 },
    traits: { isFormItem: true },
    properties: [
      // --- Group: Basic ---
      { 
          name: 'name', 
          label: 'Field ID', 
          type: 'string', 
          defaultValue: 'textarea1', 
          group: 'Basic',
          description: 'Unique identifier',
          setter: { component: 'text' }
      },
      { 
          name: 'label', 
          label: 'Field Name', 
          type: 'string', 
          defaultValue: 'Description', 
          group: 'Basic',
          setter: { component: 'text' }
      },
      { 
          name: 'tooltip', 
          label: 'Tooltip', 
          type: 'string', 
          defaultValue: '', 
          group: 'Basic',
          setter: { component: 'text' }
      },
      {
          name: 'w',
          label: 'Width',
          type: 'number',
          target: 'root',
          defaultValue: 6,
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
          name: 'rows',
          label: 'Rows',
          type: 'number',
          defaultValue: 3,
          group: 'Basic',
          setter: { component: 'number' }
      },
      { 
          name: 'placeholder', 
          label: 'Placeholder', 
          type: 'string', 
          defaultValue: 'Enter details...', 
          group: 'Basic',
          setter: { component: 'textarea' }
      },
      {
        name: 'required',
        label: 'Required',
        type: 'boolean',
        defaultValue: false,
        group: 'Basic',
        setter: { component: 'switch' }
      },

      // --- Group: Advanced ---
      {
          name: 'disabled',
          label: 'Disabled',
          type: 'boolean',
          defaultValue: false,
          group: 'Advanced',
          setter: { component: 'switch' }
      },
      {
          name: 'readOnly',
          label: 'Read Only',
          type: 'boolean',
          defaultValue: false,
          group: 'Advanced',
          setter: { component: 'switch' }
      },
      {
          name: 'maxLength',
          label: 'Max Length',
          type: 'number',
          group: 'Advanced',
          setter: { component: 'number' }
      },

      // --- Group: Label (Styles) ---
      {
          name: 'showLabel',
          label: 'Show Label',
          type: 'boolean',
          defaultValue: true,
          group: 'Label',
          setter: { component: 'switch' }
      },
      {
          name: 'labelPosition',
          label: 'Position',
          type: 'string',
          defaultValue: 'top',
          group: 'Label',
          setter: {
              component: 'buttonGroup',
              props: {
                  options: [
                      { label: 'Top', value: 'top', icon: AlignVerticalJustifyStart },
                      { label: 'Left', value: 'left', icon: AlignLeft },
                      { label: 'Right', value: 'right', icon: AlignRight },
                  ]
              }
          }
      },
      {
          name: 'labelTextColor',
          label: 'Text Color',
          type: 'string',
          defaultValue: '',
          group: 'Label',
          setter: { component: 'color' }
      },

      // --- Group: Field (Styles) ---
      {
          name: 'fieldTextColor',
          label: 'Text Color',
          type: 'string',
          defaultValue: '',
          group: 'Field',
          setter: { component: 'color' }
      },
      {
          name: 'fieldBackgroundColor',
          label: 'Background',
          type: 'string',
          defaultValue: '',
          group: 'Field',
          setter: { component: 'color' }
      },
      {
          name: 'fieldBorderColor',
          label: 'Border Color',
          type: 'string',
          defaultValue: '',
          group: 'Field',
          setter: { component: 'color' }
      },
    ],
    events: [
        { name: 'change', label: 'On Change' },
        { name: 'focus', label: 'On Focus' },
        { name: 'blur', label: 'On Blur' }
    ]
  },
  component: TextAreaComponent
};
