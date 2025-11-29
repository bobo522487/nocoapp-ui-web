
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, FileKey, Type, Hash, DollarSign, ToggleLeft, Calendar, Braces } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { SchemaField } from '../../../types';
import { cn } from '../../../lib/utils';

interface CreateRowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (record: Record<string, any>) => void;
  schema: SchemaField[];
}

const CreateRowDrawer: React.FC<CreateRowDrawerProps> = ({ 
    isOpen, 
    onClose, 
    onCreate, 
    schema
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [nullStates, setNullStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
        // Initialize form data and null states based on schema defaults
        const initialData: Record<string, any> = {};
        const initialNulls: Record<string, boolean> = {};

        schema.forEach(field => {
            if (field.type === 'serial') return;

            // Determine initial value
            let val: any = field.defaultValue;
            if (field.type === 'boolean') {
                val = val === 'true' || val === true;
            }

            // If it has a concrete default value, use it and set Custom mode
            if (val !== undefined && val !== null && val !== '' && val !== 'null') {
                initialData[field.id] = val;
                initialNulls[field.id] = false;
            } 
            // If it is explicitly nullable (or generally for this UI), default to Null mode if no default value
            else if (field.isNullable) {
                initialData[field.id] = null;
                initialNulls[field.id] = true;
            } 
            // Otherwise default to empty value (Custom mode)
            else {
                initialData[field.id] = field.type === 'boolean' ? false : '';
                initialNulls[field.id] = false;
            }
        });
        setFormData(initialData);
        setNullStates(initialNulls);
    }
  }, [isOpen, schema]);

  if (!isMounted) return null;

  const handleChange = (id: string, value: any) => {
      setFormData(prev => ({ ...prev, [id]: value }));
      // If user types, automatically switch to Custom mode if currently Null
      if (nullStates[id]) {
          setNullStates(prev => ({ ...prev, [id]: false }));
      }
  };

  const handleSetNull = (id: string) => {
      setNullStates(prev => ({ ...prev, [id]: true }));
      setFormData(prev => ({ ...prev, [id]: null }));
  };

  const handleSetCustom = (id: string) => {
      setNullStates(prev => ({ ...prev, [id]: false }));
      // If current value is null, set to empty default so input is usable
      const field = schema.find(f => f.id === id);
      if (formData[id] === null) {
          const defaultVal = field?.type === 'boolean' ? false : '';
          setFormData(prev => ({ ...prev, [id]: defaultVal }));
      }
  };

  const handleSubmit = () => {
      onCreate(formData);
      onClose();
  };

  const renderInput = (field: SchemaField) => {
      const value = formData[field.id];
      const isNullMode = nullStates[field.id];
      
      // Convert null to empty string for controlled inputs to avoid warnings
      // If Null Mode is active, we force empty string to clear the UI
      const inputValue = isNullMode ? '' : (value === null ? '' : value);
      
      // Hide placeholder in Null mode to prevent "Enter value" from showing under the badge
      const placeholderValue = isNullMode 
        ? '' 
        : (field.type === 'jsonb' ? '{ "key": "value" }' : "Enter value");

      if (field.type === 'serial') {
          return (
              <div className="relative">
                  <Input 
                      disabled 
                      value="Auto-generated" 
                      className="bg-muted/30 text-muted-foreground italic border-border/50"
                  />
              </div>
          );
      }

      let inputElement;

      // Use text type when null to hide browser masks (like date) and spinners (number)
      if (field.type === 'boolean') {
          inputElement = (
              <div className="flex items-center h-10 px-1">
                  {!isNullMode && (
                      <Switch 
                          checked={!!inputValue}
                          onCheckedChange={(checked) => handleChange(field.id, checked)}
                      />
                  )}
              </div>
          );
      } else if (field.type === 'date with time') {
           inputElement = (
              <Input 
                  type={isNullMode ? "text" : "datetime-local"}
                  value={inputValue}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="bg-background"
                  placeholder=""
              />
           );
      } else if (field.type === 'int' || field.type === 'float' || field.type === 'bigint') {
          inputElement = (
              <Input 
                  type={isNullMode ? "text" : "number"}
                  placeholder={placeholderValue}
                  value={inputValue}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="bg-background"
              />
          );
      } else {
          // Default Text / Varchar / JSONB
          inputElement = (
              <Input 
                  type="text"
                  placeholder={placeholderValue}
                  value={inputValue}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className="bg-background"
              />
          );
      }

      return (
          <div className="relative">
              {inputElement}
              
              {/* Null Overlay */}
              {isNullMode && (
                  <div 
                      style={{
                          position: 'absolute', 
                          top: '0px', 
                          left: '0px', 
                          width: '100%', 
                          height: '100%', 
                          zIndex: 1, 
                          cursor: 'pointer', 
                          backgroundColor: 'transparent'
                      }}
                      onClick={() => handleSetCustom(field.id)}
                  >
                      {/* Visual Badge to indicate Null state inside the overlay */}
                      <div className="absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none">
                          <span className="text-xs text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border shadow-sm">Null</span>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const content = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-[480px] bg-background shadow-2xl transform transition-transform duration-300 z-[70] flex flex-col border-l border-border ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">Create row</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X size={18} />
            </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="space-y-6">
                {schema.map(field => {
                    const isNullMode = nullStates[field.id];
                    
                    return (
                        <div key={field.id} className="space-y-2">
                            {/* Label Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <field.icon size={16} className="text-muted-foreground/70" />
                                    </div>
                                    <span className="text-foreground">{field.name}</span>
                                </div>
                                
                                {/* Null / Custom Toggle - Shown for all fields except serial */}
                                {field.type !== 'serial' && (
                                    <div className="flex bg-muted/20 rounded-lg p-0.5">
                                        <button 
                                            onClick={() => handleSetNull(field.id)}
                                            className={cn(
                                                "text-[10px] px-3 py-1 rounded-md transition-all font-medium",
                                                isNullMode 
                                                    ? "bg-background text-foreground shadow-sm" // Active Null Style
                                                    : "text-muted-foreground hover:text-foreground bg-transparent" // Inactive
                                            )}
                                        >
                                            Null
                                        </button>
                                        <button 
                                            onClick={() => handleSetCustom(field.id)}
                                            className={cn(
                                                "text-[10px] px-3 py-1 rounded-md transition-all font-medium",
                                                !isNullMode 
                                                    ? "bg-background text-blue-600 shadow-sm" // Active Custom Style
                                                    : "text-muted-foreground hover:text-foreground bg-transparent" // Inactive
                                            )}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div>
                                {renderInput(field)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background mt-auto flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                 <span className="bg-muted px-1.5 py-0.5 rounded border border-border">Cmd</span>
                 <span>+</span>
                 <span className="bg-muted px-1.5 py-0.5 rounded border border-border">Enter</span>
                 <span className="ml-1">to save</span>
             </div>
             
             <div className="flex gap-3">
                 <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="h-9 px-4"
                 >
                     Cancel
                 </Button>
                 <Button 
                    onClick={handleSubmit}
                    className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                 >
                     Create
                 </Button>
             </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default CreateRowDrawer;
