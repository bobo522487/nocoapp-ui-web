
import React, { useMemo, useState } from 'react';
import { List, X, ChevronDown, Loader2, Info } from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../types';
import { cn } from '../../lib/utils';

const SelectComponent: React.FC<WidgetProps> = ({ 
  // Data Group
  label, 
  placeholder,
  isDynamic,
  options,
  data,
  labelField,
  valueField,
  sortOptions,

  // Validation Group
  required,
  // customValidation, // Not implemented in visual logic

  // Additional Actions Group
  allowClear,
  // enableSearch, // Native select does not support search easily, placeholder for future
  loading,
  visible,
  disabled,
  tooltip,

  // Devices Group
  // desktopVisible,
  // mobileVisible,

  // Widget Props
  width
}) => {
  // Internal state for controlled component (if not fully controlled by parent)
  const [internalValue, setInternalValue] = useState<string>('');

  const finalOptions = useMemo(() => {
      let items: { label: string; value: string }[] = [];

      // 1. Dynamic Data
      if (isDynamic && Array.isArray(data)) {
          items = data.map((item: any) => {
              const lbl = labelField ? item[labelField] : (item.name || item.label || item.title || Object.values(item)[0]);
              const val = valueField ? item[valueField] : (item.id || item.value || item.key || Object.values(item)[0]);
              
              return { 
                  label: String(lbl !== undefined && lbl !== null ? lbl : 'Item'), 
                  value: String(val !== undefined && val !== null ? val : 'item') 
              };
          });
      } 
      // 2. Static Data
      else if (options && typeof options === 'string') {
          items = options.split(',').map((o: string) => {
              const parts = o.split(':');
              if (parts.length >= 2) {
                  return { label: parts[0].trim(), value: parts[1].trim() };
              }
              return { label: o.trim(), value: o.trim() };
          });
      } else {
          // Default Fallback
          items = [
              { label: 'Option 1', value: '1' }, 
              { label: 'Option 2', value: '2' }
          ];
      }

      // 3. Sorting
      if (sortOptions === 'asc') {
          items.sort((a, b) => a.label.localeCompare(b.label));
      } else if (sortOptions === 'desc') {
          items.sort((a, b) => b.label.localeCompare(a.label));
      }

      return items;
  }, [isDynamic, data, options, labelField, valueField, sortOptions]);

  // Handle Visibility
  if (visible === false) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setInternalValue(e.target.value);
  };

  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInternalValue('');
  };

  const showClear = allowClear && internalValue && !disabled && !loading;

  return (
    <div className={cn("p-4 w-full h-full flex flex-col gap-2 pointer-events-auto", disabled && "opacity-60 pointer-events-none")}>
        {label && (
            <div className="flex items-center gap-1">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                </label>
                {required && <span className="text-destructive text-xs">*</span>}
                {tooltip && (
                    <div title={tooltip} className="cursor-help">
                        <Info size={12} className="text-muted-foreground" />
                    </div>
                )}
            </div>
        )}
        <div className="relative group">
            <select 
                value={internalValue}
                onChange={handleChange}
                disabled={disabled || loading}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none text-foreground transition-all hover:border-primary/50",
                    !internalValue && "text-muted-foreground"
                )}
            >
                <option value="" disabled selected>{placeholder || 'Select an option'}</option>
                {finalOptions.map((opt: any, idx: number) => (
                    <option key={`${opt.value}-${idx}`} value={opt.value} className="text-foreground">{opt.label}</option>
                ))}
            </select>
            
            {/* Icons Area */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none gap-2">
                {loading ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                ) : (
                    <>
                        {/* Clear Button (Interactive via pointer-events-auto) */}
                        {showClear && (
                            <div 
                                onClick={handleClear}
                                className="pointer-events-auto cursor-pointer p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={12} />
                            </div>
                        )}
                        <ChevronDown size={14} className="text-muted-foreground opacity-50" />
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export const SelectWidget: WidgetDefinition = {
  manifest: {
    type: 'select',
    name: 'Select',
    icon: List,
    category: 'Forms',
    defaultSize: { w: 6, h: 2 },
    traits: { isFormItem: true },
    properties: [
      // --- Group: Data ---
      {
        name: 'label',
        label: 'Label',
        type: 'string',
        defaultValue: 'Select Label',
        group: 'Data',
        setter: { component: 'text' }
      },
      {
        name: 'placeholder',
        label: 'Placeholder',
        type: 'string',
        defaultValue: 'Select...',
        group: 'Data',
        setter: { component: 'text' }
      },
      {
        name: 'isDynamic',
        label: 'Dynamic options',
        type: 'boolean',
        defaultValue: false,
        group: 'Data',
        setter: { component: 'switch' }
      },
      {
        name: 'options',
        label: 'Static Options',
        type: 'string',
        defaultValue: 'Option 1:1, Option 2:2',
        description: 'Format: "Label:Value, Label2:Value2"',
        group: 'Data',
        setter: { component: 'textarea' }
      },
      {
        name: 'labelField',
        label: 'Label Key',
        type: 'string',
        defaultValue: 'name',
        description: 'Field to use for option label',
        group: 'Data',
        setter: { component: 'text' }
      },
      {
        name: 'valueField',
        label: 'Value Key',
        type: 'string',
        defaultValue: 'id',
        description: 'Field to use for option value',
        group: 'Data',
        setter: { component: 'text' }
      },
      {
        name: 'sortOptions',
        label: 'Sort options',
        type: 'string',
        defaultValue: 'none',
        group: 'Data',
        setter: { 
            component: 'select',
            props: {
                options: [
                    { label: 'None', value: 'none' },
                    { label: 'A-Z', value: 'asc' },
                    { label: 'Z-A', value: 'desc' }
                ]
            }
        }
      },

      // --- Group: Validation ---
      {
        name: 'required',
        label: 'Make this field mandatory',
        type: 'boolean',
        defaultValue: false,
        group: 'Validation',
        setter: { component: 'switch' }
      },
      {
        name: 'customValidation',
        label: 'Custom validation',
        type: 'string',
        group: 'Validation',
        setter: { component: 'text' }
      },

      // --- Group: Additional Actions ---
      {
        name: 'allowClear',
        label: 'Show clear selection button',
        type: 'boolean',
        defaultValue: true,
        group: 'Additional Actions',
        setter: { component: 'switch' }
      },
      {
        name: 'enableSearch',
        label: 'Show search in options',
        type: 'boolean',
        defaultValue: false,
        group: 'Additional Actions',
        setter: { component: 'switch' }
      },
      {
        name: 'loading',
        label: 'Loading state',
        type: 'boolean',
        defaultValue: false,
        group: 'Additional Actions',
        setter: { component: 'switch' }
      },
      {
        name: 'visible',
        label: 'Visibility',
        type: 'boolean',
        defaultValue: true,
        group: 'Additional Actions',
        setter: { component: 'switch' }
      },
      {
        name: 'disabled',
        label: 'Disable',
        type: 'boolean',
        defaultValue: false,
        group: 'Additional Actions',
        setter: { component: 'switch' }
      },
      {
        name: 'tooltip',
        label: 'Tooltip',
        type: 'string',
        group: 'Additional Actions',
        setter: { component: 'text' }
      },

      // --- Group: Devices ---
      {
        name: 'desktopVisible',
        label: 'Show on desktop',
        type: 'boolean',
        defaultValue: true,
        group: 'Devices',
        setter: { component: 'switch' }
      },
      {
        name: 'mobileVisible',
        label: 'Show on mobile',
        type: 'boolean',
        defaultValue: true,
        group: 'Devices',
        setter: { component: 'switch' }
      }
    ],
    data: {
        hasDataSource: true,
        dataType: 'array'
    },
    events: [
        { name: 'change', label: 'On Change' },
        { name: 'focus', label: 'On Focus' },
        { name: 'blur', label: 'On Blur' }
    ]
  },
  component: SelectComponent
};
