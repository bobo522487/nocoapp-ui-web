
import React, { useState, useMemo, useEffect } from 'react';
import { 
  MoreVertical, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink,
  LayoutGrid,
  Database,
  Zap,
  Palette,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { GridItemData, Page } from '../../../types';
import { registry } from '../../../widgets/registry';
import { PropDefinition } from '../../../widgets/types';
import { useAppStore } from '../../../store/useAppStore';

// --- Types ---

type PanelTab = 'DESIGN' | 'DATA' | 'INTERACTION';

// --- Shared Components ---

const FxButton = ({ active = false }: { active?: boolean }) => (
  <Button 
    variant="ghost"
    size="sm"
    className={`ml-auto h-5 px-1 text-[10px] font-mono font-medium ${
        active 
        ? 'text-primary' 
        : 'text-muted-foreground'
    }`}
    title="Toggle Dynamic Value"
  >
    Fx
  </Button>
);

const ControlHeader = ({ label, fx = true }: { label: string, fx?: boolean }) => (
  <div className="flex items-center justify-between mb-2">
    <Label className="text-[11px] text-muted-foreground font-medium">{label}</Label>
    {fx && <FxButton />}
  </div>
);

const Accordion = ({ title, children, defaultOpen = true }: { title: string, children?: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <Button 
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 h-auto hover:bg-muted/50 rounded-none group"
      >
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground capitalize group-hover:text-primary transition-colors">{title}</span>
        </div>
        {isOpen ? (
            <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </Button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

// --- Design Tab Components ---

interface ControlProps {
  value: any;
  onChange: (val: any) => void;
  propDef: PropDefinition;
}

const TextControl: React.FC<ControlProps> = ({ value, onChange, propDef }) => (
  <div className="relative">
    <Input 
        type="text" 
        value={value ?? ''} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={propDef.description}
        className="h-8 text-xs"
    />
  </div>
);

const NumberControl: React.FC<ControlProps> = ({ value, onChange, propDef }) => (
    <div className="relative">
      <Input 
          type="number" 
          value={value ?? 0} 
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={propDef.description}
          className="h-8 text-xs"
      />
    </div>
);

const TextareaControl: React.FC<ControlProps> = ({ value, onChange, propDef }) => (
    <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={propDef.description}
        className="text-xs min-h-[80px]"
    />
);

const SelectControl: React.FC<ControlProps> = ({ value, onChange, propDef }) => {
  const options = propDef.setter?.props?.options || [];
  return (
      <select 
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((opt: any) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            return <option key={val} value={val}>{label}</option>;
        })}
      </select>
  );
};

const SwitchControl: React.FC<ControlProps> = ({ value, onChange, propDef }) => {
    const isChecked = !!value;
    return (
        <div className="flex items-center justify-between mb-3">
            <Label className="text-[11px] text-muted-foreground font-medium cursor-pointer" onClick={() => onChange(!isChecked)}>
                {propDef.label}
            </Label>
            <div className="flex items-center gap-2">
                <FxButton />
                <Switch checked={isChecked} onCheckedChange={onChange} />
            </div>
        </div>
    );
};

const ColorControl: React.FC<ControlProps> = ({ value, onChange, propDef }) => (
    <div className="mb-4">
        <ControlHeader label={propDef.label} fx={false} />
        <div className="flex items-center gap-2">
             <div className="relative border border-input rounded-md overflow-hidden w-8 h-8 shrink-0">
                <input 
                    type="color" 
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute -top-2 -left-2 w-12 h-12 p-0 border-0 cursor-pointer"
                />
             </div>
             <Input 
                type="text" 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className="h-8 text-xs font-mono"
            />
        </div>
    </div>
);

const SETTER_COMPONENTS: Record<string, React.FC<ControlProps>> = {
    text: TextControl,
    number: NumberControl,
    textarea: TextareaControl,
    select: SelectControl,
    switch: SwitchControl,
    color: ColorControl
};

// --- Data Tab Components ---

const DataTabContent = ({ item, onUpdate }: { item: GridItemData, onUpdate: (id: string, updates: Partial<GridItemData>) => void }) => {
    const { tables } = useAppStore();
    const widgetDef = registry.get(item.type);
    
    // Check if widget supports data
    if (!widgetDef?.manifest.data) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center opacity-60">
                <Database size={32} className="mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">This component does not support data binding.</p>
            </div>
        );
    }

    const query = item.content?._query || { source: 'managed', type: 'sql', definition: { limit: 50 } };
    const { definition } = query;

    const handleDefChange = (key: string, val: any) => {
        const newQuery = { 
            ...query, 
            definition: { ...definition, [key]: val } 
        };
        onUpdate(item.i, { 
            content: { ...item.content, _query: newQuery } 
        });
    };

    // Columns of selected table
    const selectedTable = tables.find(t => t.id === definition.tableId);
    // Mock columns for now since tables store doesn't hold columns deeply yet in this mock
    const columns = selectedTable ? ['id', 'name', 'email', 'role', 'status', 'created_at', 'amount', 'category'] : [];

    return (
        <div className="pb-8">
            <Accordion title="Source Configuration">
                <div className="space-y-4">
                    <div>
                        <ControlHeader label="Data Source" fx={false} />
                        <select 
                            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs"
                            value={definition.source}
                            onChange={(e) => handleDefChange('source', e.target.value)}
                        >
                            <option value="managed">Managed Database</option>
                            <option value="external">External API</option>
                        </select>
                    </div>

                    {definition.source === 'managed' && (
                        <div>
                            <ControlHeader label="Table" fx={false} />
                            <select 
                                className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs"
                                value={definition.tableId || ''}
                                onChange={(e) => handleDefChange('tableId', e.target.value)}
                            >
                                <option value="">Select a table...</option>
                                {tables.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </Accordion>

            {definition.tableId && (
                <Accordion title="Query Settings">
                    <div className="space-y-4">
                        <div>
                            <ControlHeader label="Fields" fx={false} />
                            <div className="border border-input rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                                {columns.map(col => {
                                    const isSelected = definition.select?.includes(col);
                                    return (
                                        <div key={col} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`col-${col}`} 
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                    const current = definition.select || [];
                                                    const next = checked 
                                                        ? [...current, col]
                                                        : current.filter((c: string) => c !== col);
                                                    handleDefChange('select', next);
                                                }}
                                            />
                                            <label
                                                htmlFor={`col-${col}`}
                                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {col}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <ControlHeader label="Sort By" fx={false} />
                                <select 
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                    value={definition.orderBy || ''}
                                    onChange={(e) => handleDefChange('orderBy', e.target.value)}
                                >
                                    <option value="">None</option>
                                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="w-24">
                                <ControlHeader label="Order" fx={false} />
                                <select 
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                    value={definition.orderDir || 'asc'}
                                    onChange={(e) => handleDefChange('orderDir', e.target.value)}
                                >
                                    <option value="asc">ASC</option>
                                    <option value="desc">DESC</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <ControlHeader label="Limit" fx={false} />
                            <Input 
                                type="number" 
                                className="h-8 text-xs"
                                value={definition.limit}
                                onChange={(e) => handleDefChange('limit', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </Accordion>
            )}

            <div className="p-4 mt-4 bg-muted/30 border-t border-border">
                <ControlHeader label="Query Preview" fx={false} />
                <pre className="text-[10px] bg-muted p-2 rounded border border-border overflow-x-auto text-muted-foreground">
                    {JSON.stringify(query, null, 2)}
                </pre>
            </div>
        </div>
    );
};

// --- Interaction Tab Components ---

const InteractionTabContent = ({ item, onUpdate }: { item: GridItemData, onUpdate: (id: string, updates: Partial<GridItemData>) => void }) => {
    const widgetDef = registry.get(item.type);
    const events = widgetDef?.manifest.events || [];
    const interactions = item.content?._interactions || [];

    const handleAddInteraction = () => {
        if (events.length === 0) return;
        const newInteraction = { 
            id: `int_${Date.now()}`, 
            event: events[0].name, 
            action: 'navigate', 
            params: {} 
        };
        onUpdate(item.i, { 
            content: { ...item.content, _interactions: [...interactions, newInteraction] } 
        });
    };

    const handleRemoveInteraction = (id: string) => {
        onUpdate(item.i, { 
            content: { ...item.content, _interactions: interactions.filter((i: any) => i.id !== id) } 
        });
    };

    const handleUpdateInteraction = (id: string, key: string, value: any) => {
        onUpdate(item.i, { 
            content: { 
                ...item.content, 
                _interactions: interactions.map((i: any) => i.id === id ? { ...i, [key]: value } : i) 
            } 
        });
    };

    if (events.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center opacity-60">
                <Zap size={32} className="mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">This component has no interactive events.</p>
            </div>
        );
    }

    return (
        <div className="pb-8">
            <div className="p-4 border-b border-border">
                <Button onClick={handleAddInteraction} size="sm" className="w-full gap-2 text-xs" variant="outline">
                    <Plus size={14} /> Add Event Handler
                </Button>
            </div>

            {interactions.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No interactions configured.
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {interactions.map((interaction: any, idx: number) => (
                        <div key={interaction.id} className="p-4 space-y-3 bg-card">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground">Handler #{idx + 1}</span>
                                <button onClick={() => handleRemoveInteraction(interaction.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            
                            <div className="space-y-3 pl-2 border-l-2 border-border ml-1">
                                <div>
                                    <ControlHeader label="Event" fx={false} />
                                    <select 
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                        value={interaction.event}
                                        onChange={(e) => handleUpdateInteraction(interaction.id, 'event', e.target.value)}
                                    >
                                        {events.map(ev => (
                                            <option key={ev.name} value={ev.name}>{ev.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <ControlHeader label="Action" fx={false} />
                                    <select 
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                        value={interaction.action}
                                        onChange={(e) => handleUpdateInteraction(interaction.id, 'action', e.target.value)}
                                    >
                                        <option value="navigate">Navigate to Page</option>
                                        <option value="showToast">Show Toast</option>
                                        <option value="runQuery">Run Query</option>
                                        <option value="openModal">Open Modal</option>
                                    </select>
                                </div>

                                {/* Param Config based on Action */}
                                {interaction.action === 'navigate' && (
                                    <div>
                                        <ControlHeader label="URL / Path" />
                                        <Input 
                                            className="h-8 text-xs" 
                                            placeholder="/home"
                                            value={interaction.params?.url || ''}
                                            onChange={(e) => handleUpdateInteraction(interaction.id, 'params', { ...interaction.params, url: e.target.value })}
                                        />
                                    </div>
                                )}
                                {interaction.action === 'showToast' && (
                                    <div>
                                        <ControlHeader label="Message" />
                                        <Input 
                                            className="h-8 text-xs" 
                                            placeholder="Success!"
                                            value={interaction.params?.message || ''}
                                            onChange={(e) => handleUpdateInteraction(interaction.id, 'params', { ...interaction.params, message: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Main Panel ---

interface PropertyPanelProps {
  width: number;
  selectedItem?: GridItemData | null;
  onUpdate?: (id: string, updates: Partial<GridItemData>) => void;
  pageSettings?: Page;
  onPageUpdate?: (updates: Partial<Page>) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
  width, 
  selectedItem, 
  onUpdate,
  pageSettings,
  onPageUpdate
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('DESIGN');

  // Prepare widget definitions
  const widgetDef = selectedItem ? registry.get(selectedItem.type) : null;
  
  // Define available tabs based on widget definition
  const availableTabs = useMemo(() => {
      const tabs: { id: PanelTab; label: string; icon: any }[] = [
          { id: 'DESIGN', label: 'Design', icon: Palette }
      ];

      if (widgetDef?.manifest.data) {
          tabs.push({ id: 'DATA', label: 'Data', icon: Database });
      }

      tabs.push({ id: 'INTERACTION', label: 'Behavior', icon: Zap });

      return tabs;
  }, [widgetDef]);

  // Ensure activeTab is valid for current selection
  useEffect(() => {
      if (selectedItem && !availableTabs.some(t => t.id === activeTab)) {
          setActiveTab('DESIGN');
      }
  }, [selectedItem, availableTabs, activeTab]);

  const properties = widgetDef ? widgetDef.manifest.properties : [];

  const groupedProps = useMemo(() => {
      const groups: Record<string, PropDefinition[]> = {};
      if (!properties) return groups;
      
      properties.forEach(prop => {
          const groupName = prop.group || 'General';
          if (!groups[groupName]) groups[groupName] = [];
          groups[groupName].push(prop);
      });
      return groups;
  }, [properties]);

  // Page Properties Render
  if (!selectedItem) {
      return (
        <div 
            style={{ width }}
            className="bg-card flex flex-col h-full shrink-0 overflow-hidden transition-colors border-l border-border"
        >
             <div className="p-4 border-b border-border bg-card shrink-0">
                 <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid size={16} className="text-primary" />
                    <span className="text-sm font-semibold">Page Properties</span>
                 </div>
                 <p className="text-xs text-muted-foreground">Configure general page settings.</p>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
                <Accordion title="General">
                    <div className="space-y-4">
                        <div>
                            <ControlHeader label="Page name" fx={false} />
                            <Input 
                                value={pageSettings?.name || ''} 
                                onChange={(e) => onPageUpdate && onPageUpdate({ name: e.target.value })}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="pt-2 space-y-2">
                             <div className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">Mark as Home</Label>
                                <Switch 
                                    checked={pageSettings?.isHome}
                                    onCheckedChange={(checked) => onPageUpdate && onPageUpdate({ isHome: checked })}
                                />
                             </div>
                             <div className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">Disable</Label>
                                <Switch 
                                    checked={pageSettings?.isDisabled}
                                    onCheckedChange={(checked) => onPageUpdate && onPageUpdate({ isDisabled: checked })}
                                />
                             </div>
                        </div>
                    </div>
                </Accordion>
                <Accordion title="Layout">
                    <div>
                        <ControlHeader label="Height (px)" fx={false} />
                        <Input 
                            value={pageSettings?.height} 
                            onChange={(e) => onPageUpdate && onPageUpdate({ height: e.target.value })}
                            className="h-8 text-xs"
                        />
                    </div>
                </Accordion>
            </div>
        </div>
      );
  }

  // --- Widget Properties Render ---

  const handleContentChange = (key: string, val: any) => {
      if (onUpdate && selectedItem) {
          onUpdate(selectedItem.i, { 
              content: { ...selectedItem.content, [key]: val } 
          });
      }
  };

  const renderDesignTab = () => {
      const entries = Object.entries(groupedProps);
      if (entries.length === 0) return <div className="p-4 text-xs text-muted-foreground">No configurable properties.</div>;

      return entries.map(([groupName, props]) => (
          <Accordion key={groupName} title={groupName}>
              <div className="space-y-4">
                  {props.map(prop => {
                      const Control = SETTER_COMPONENTS[prop.setter?.component || 'text'] || TextControl;
                      const isSwitch = prop.setter?.component === 'switch';
                      const value = selectedItem.content?.[prop.name] ?? prop.defaultValue;

                      return (
                          <div key={prop.name}>
                              {!isSwitch && <ControlHeader label={prop.label} />}
                              <Control 
                                  value={value}
                                  onChange={(val) => handleContentChange(prop.name, val)}
                                  propDef={prop}
                              />
                          </div>
                      );
                  })}
              </div>
          </Accordion>
      ));
  };

  return (
    <div 
      style={{ width }}
      className="bg-card flex flex-col h-full shrink-0 overflow-hidden transition-colors border-l border-border"
    >
      
      {/* Header */}
      <div className="p-4 border-b border-border bg-card shrink-0">
         <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
                <div className="text-[10px] text-muted-foreground font-mono mb-1 uppercase tracking-wider flex items-center gap-1">
                    {widgetDef?.manifest.icon && <widgetDef.manifest.icon size={10} />}
                    {selectedItem.type}
                </div>
                <div className="flex items-center bg-muted/50 rounded border border-border px-2">
                    <span className="text-xs text-muted-foreground mr-2">ID:</span>
                    <input 
                        type="text" 
                        value={selectedItem.i}
                        readOnly
                        className="flex-1 h-7 text-xs font-mono bg-transparent outline-none text-foreground truncate"
                    />
                </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-4">
                <MoreVertical size={16} className="text-muted-foreground" />
            </Button>
         </div>

         {/* Tabs */}
         <div className="flex items-center bg-muted rounded-lg p-1 w-full">
            {availableTabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as PanelTab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeTab === tab.id 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                >
                    <tab.icon size={12} />
                    {tab.label}
                </button>
            ))}
         </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
        
        {activeTab === 'DESIGN' && (
            <>
                <div className="pb-8">
                    {renderDesignTab()}
                </div>
                <div className="p-4 mt-4 border-t border-border bg-muted/20">
                    <a href="#" className="flex items-center gap-2 text-xs text-primary hover:underline transition-colors group">
                        <ExternalLink size={12} />
                        <span className="group-hover:underline">Read documentation</span>
                    </a>
                </div>
            </>
        )}

        {activeTab === 'DATA' && widgetDef?.manifest.data && (
            <DataTabContent item={selectedItem} onUpdate={onUpdate!} />
        )}

        {activeTab === 'INTERACTION' && (
            <InteractionTabContent item={selectedItem} onUpdate={onUpdate!} />
        )}

      </div>
    </div>
  );
};

export default PropertyPanel;
