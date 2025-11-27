
import React, { useState, useEffect } from 'react';
import { TextCursor, AlignLeft, AlignRight, AlignVerticalJustifyStart, X, Info } from 'lucide-react';
import { Input } from "../../components/ui/input";
import { WidgetDefinition, WidgetProps } from '../types';
import { cn } from '../../lib/utils';

const InputComponent: React.FC<WidgetProps> = ({ 
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
    inputType,
    maxLength,
    allowClear
}) => {
  // Use local state to allow interaction within the builder/preview
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  // Sync with property updates
  useEffect(() => {
      setInternalValue(defaultValue || '');
  }, [defaultValue]);

  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInternalValue('');
  };

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
        labelPosition === 'top' ? 'flex-col' : 'flex-row items-center gap-4'
    )}>
        {showLabel && label && (
            <div className={cn(
                labelPosition === 'top' ? 'w-full' : 'w-1/3 flex-shrink-0',
                labelPosition === 'right' ? 'order-last' : ''
            )}>
               {renderLabel()}
            </div>
        )}
        
        <div className="flex-1 w-full relative group">
            <Input 
                type={inputType || 'text'}
                placeholder={placeholder} 
                value={internalValue}
                onChange={(e) => setInternalValue(e.target.value)}
                disabled={disabled}
                readOnly={readOnly}
                maxLength={maxLength}
                className="w-full pr-8"
                style={{
                    color: fieldTextColor,
                    backgroundColor: fieldBackgroundColor,
                    borderColor: fieldBorderColor
                }}
            />
            {allowClear && internalValue && !disabled && !readOnly && (
                <div 
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer z-10 p-1 hover:bg-muted/50 rounded-full transition-all"
                >
                    <X size={12} />
                </div>
            )}
        </div>
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
      // --- Group: Basic ---
      { 
          name: 'name', 
          label: 'Field ID', 
          type: 'string', 
          defaultValue: 'input1', 
          group: 'Basic',
          description: 'Unique identifier for the form field',
          setter: { component: 'text' }
      },
      { 
          name: 'label', 
          label: 'Field Name', 
          type: 'string', 
          defaultValue: 'Input Label', 
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
          target: 'root', // Updates the GridItemData directly
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
          name: 'inputType',
          label: 'Type',
          type: 'string',
          defaultValue: 'text',
          group: 'Basic',
          setter: {
              component: 'select',
              props: {
                  options: [
                      { label: 'Text', value: 'text' },
                      { label: 'Number', value: 'number' },
                      { label: 'Time', value: 'time' },
                      { label: 'Date', value: 'date' },
                      { label: 'Month', value: 'month' },
                      { label: 'Date & Time', value: 'datetime-local' },
                  ]
              }
          }
      },
      { 
          name: 'placeholder', 
          label: 'Placeholder', 
          type: 'string', 
          defaultValue: 'Enter text...', 
          group: 'Basic',
          setter: { component: 'text' }
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
      {
          name: 'allowClear',
          label: 'Allow Clear',
          type: 'boolean',
          defaultValue: false,
          group: 'Advanced',
          setter: { component: 'switch' }
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
  component: InputComponent
};
