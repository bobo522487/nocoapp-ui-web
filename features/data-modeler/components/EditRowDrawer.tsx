
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, FileKey, Type, Hash, DollarSign, ToggleLeft, Calendar, Braces, Save, Trash2 } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { SchemaField } from '../../../types';
import { cn } from '../../../lib/utils';

interface EditRowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Record<string, any> | null;
  onSave: (record: Record<string, any>) => void;
  schema: SchemaField[];
}

const EditRowDrawer: React.FC<EditRowDrawerProps> = ({ 
    isOpen, 
    onClose, 
    initialData, 
    onSave, 
    schema
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [nullStates, setNullStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && initialData) {
        const currentData: Record<string, any> = { ...initialData };
        const currentNulls: Record<string, boolean> = {};

        schema.forEach(field => {
            const val = initialData[field.id];
            
            // Check if value is strictly null (not just undefined or empty string)
            if (val === null) {
                currentNulls[field.id] = true;
                currentData[field.id] = null; // Ensure data reflects null
            } else {
                currentNulls[field.id] = false;
                // Ensure form has a value even if undefined (default to empty string for inputs)
                if (val === undefined) {
                    currentData[field.id] = field.type === 'boolean' ? false : '';
                }
            }
        });

        setFormData(currentData);
        setNullStates(currentNulls);
    }
  }, [isOpen, initialData, schema]);

  if (!isMounted) return null;

  const handleChange = (id: string, value: any) => {
      setFormData(prev => ({ ...prev, [id]: value }));
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
      const field = schema.find(f => f.id === id);
      if (formData[id] === null) {
          const defaultVal = field?.type === 'boolean' ? false : '';
          setFormData(prev => ({ ...prev, [id]: defaultVal }));
      }
  };

  const handleSubmit = () => {
      onSave(formData);
      onClose();
  };

  const renderInput = (field: SchemaField) => {
      const value = formData[field.id];
      const isNullMode = nullStates[field.id];
      
      const inputValue = isNullMode ? '' : (value === null || value === undefined ? '' : value);
      const placeholderValue = isNullMode 
        ? '' 
        : (field.type === 'jsonb' ? '{ "key": "value" }' : "Enter value");

      if (field.type === 'serial') {
          return (
              <div className="relative">
                  <Input 
                      disabled 
                      value={inputValue}
                      className="bg-muted/30 text-muted-foreground italic border-border/50"
                  />
              </div>
          );
      }

      let inputElement;

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
            <h3 className="text-xl font-semibold text-foreground tracking-tight">Edit row</h3>
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
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <field.icon size={16} className="text-muted-foreground/70" />
                                    </div>
                                    <span className="text-foreground">{field.name}</span>
                                </div>
                                
                                {field.type !== 'serial' && (
                                    <div className="flex bg-muted/20 rounded-lg p-0.5">
                                        <button 
                                            onClick={() => handleSetNull(field.id)}
                                            className={cn(
                                                "text-[10px] px-3 py-1 rounded-md transition-all font-medium",
                                                isNullMode 
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground bg-transparent"
                                            )}
                                        >
                                            Null
                                        </button>
                                        <button 
                                            onClick={() => handleSetCustom(field.id)}
                                            className={cn(
                                                "text-[10px] px-3 py-1 rounded-md transition-all font-medium",
                                                !isNullMode 
                                                    ? "bg-background text-blue-600 shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground bg-transparent"
                                            )}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                )}
                            </div>
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
                     Save
                 </Button>
             </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default EditRowDrawer;
