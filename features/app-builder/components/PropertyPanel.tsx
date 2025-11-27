
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
  AlertCircle,
  FileCode,
  Play
} from 'lucide-react';
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { GridItemData, Page, QueryConfig } from '../../../types';
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

// --- Setter Controls ---

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

// --- Reusable Query Builder Component ---

interface QueryEditorProps {
    query: QueryConfig;
    onChange: (newQuery: QueryConfig) => void;
}

const QueryEditor: React.FC<QueryEditorProps> = ({ query, onChange }) => {
    const { tables } = useAppStore();
    const { definition } = query;

    const handleDefChange = (key: string, val: any) => {
        const newQuery = { 
            ...query, 
            definition: { ...definition, [key]: val } 
        };
        onChange(newQuery);
    };

    // Columns of selected table
    const selectedTable = tables.find(t => t.id === definition.tableId);
    const columns = selectedTable ? ['id', 'name', 'email', 'role', 'status', 'created_at', 'amount', 'category'] : [];

    return (
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

            {definition.tableId && (
                <>
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
                </>
            )}

            <div className="p-3 bg-muted/30 border border-border rounded-md">
                <ControlHeader label="Query Preview" fx={false} />
                <pre className="text-[10px] bg-muted p-2 rounded border border-border overflow-x-auto text-muted-foreground font-mono">
                    {JSON.stringify(query, null, 2)}
                </pre>
            </div>
        </div>
    );
};

// --- Page Data Tab ---

const PageDataTab = ({ page, onUpdate }: { page: Page, onUpdate: (updates: Partial<Page>) => void }) => {
    const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
    const content = page.content || {};
    const stateVars = content.state || {};
    const queries = content.queries || {};

    const handleAddVariable = () => {
        const key = `var${Object.keys(stateVars).length + 1}`;
        onUpdate({
            content: {
                ...content,
                state: { ...stateVars, [key]: '' }
            }
        });
    };

    const handleUpdateVariable = (oldKey: string, newKey: string, newVal: any) => {
        const newState = { ...stateVars };
        if (oldKey !== newKey) {
            delete newState[oldKey];
        }
        newState[newKey] = newVal;
        onUpdate({ content: { ...content, state: newState } });
    };

    const handleDeleteVariable = (key: string) => {
        const newState = { ...stateVars };
        delete newState[key];
        onUpdate({ content: { ...content, state: newState } });
    };

    const handleAddQuery = () => {
        const id = `query${Object.keys(queries).length + 1}`;
        onUpdate({
            content: {
                ...content,
                queries: {
                    ...queries,
                    [id]: { 
                        id, 
                        type: 'sql', 
                        definition: { source: 'managed', limit: 10 } 
                    }
                }
            }
        });
        setActiveQueryId(id);
    };

    const handleUpdateQuery = (query: QueryConfig) => {
        onUpdate({
            content: {
                ...content,
                queries: {
                    ...queries,
                    [query.id]: query
                }
            }
        });
    };

    if (activeQueryId && queries[activeQueryId]) {
        return (
            <div className="pb-8">
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActiveQueryId(null)}>
                        <ChevronDown className="rotate-90" size={14} />
                    </Button>
                    <span className="text-xs font-semibold">Editing: {activeQueryId}</span>
                </div>
                <div className="p-4">
                    <QueryEditor query={queries[activeQueryId]} onChange={handleUpdateQuery} />
                </div>
            </div>
        );
    }

    return (
        <div className="pb-8">
            <Accordion title="State Variables" defaultOpen={true}>
                <div className="space-y-2">
                    {Object.entries(stateVars).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2 mb-2">
                            <Input 
                                className="h-7 text-xs font-mono w-1/3" 
                                value={key} 
                                onChange={(e) => handleUpdateVariable(key, e.target.value, val)}
                            />
                            <span className="text-muted-foreground text-xs">=</span>
                            <Input 
                                className="h-7 text-xs flex-1" 
                                value={val as string} 
                                onChange={(e) => handleUpdateVariable(key, key, e.target.value)}
                                placeholder="Value"
                            />
                            <button onClick={() => handleDeleteVariable(key)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-2" onClick={handleAddVariable}>
                        <Plus size={12} className="mr-1" /> Add Variable
                    </Button>
                </div>
            </Accordion>

            <Accordion title="Queries">
                <div className="space-y-1">
                    {Object.values(queries).map((q: any) => (
                        <div 
                            key={q.id} 
                            className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer group"
                            onClick={() => setActiveQueryId(q.id)}
                        >
                            <div className="flex items-center gap-2">
                                <Database size={12} className="text-blue-500" />
                                <span className="text-xs font-medium">{q.id}</span>
                            </div>
                            <ChevronRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-2" onClick={handleAddQuery}>
                        <Plus size={12} className="mr-1" /> Add Query
                    </Button>
                </div>
            </Accordion>
        </div>
    );
};

// --- Widget Data Tab ---

const WidgetDataTab = ({ item, onUpdate }: { item: GridItemData, onUpdate: (id: string, updates: Partial<GridItemData>) => void }) => {
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

    const handleQueryUpdate = (newQuery: QueryConfig) => {
        onUpdate(item.i, { 
            content: { ...item.content, _query: newQuery } 
        });
    };

    return (
        <div className="pb-8">
            <Accordion title="Data Source">
                <div className="space-y-4">
                    <QueryEditor query={query} onChange={handleQueryUpdate} />
                </div>
            </Accordion>
        </div>
    );
};

// --- Interaction Tab Components (Shared) ---

const InteractionList = ({ events, interactions, onAdd, onRemove, onUpdate }: any) => {
    if (events.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center opacity-60">
                <Zap size={32} className="mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No events available.</p>
            </div>
        );
    }

    return (
        <div className="pb-8">
            <div className="p-4 border-b border-border">
                <Button onClick={onAdd} size="sm" className="w-full gap-2 text-xs" variant="outline">
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
                                <button onClick={() => onRemove(interaction.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            
                            <div className="space-y-3 pl-2 border-l-2 border-border ml-1">
                                <div>
                                    <ControlHeader label="Event" fx={false} />
                                    <select 
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                        value={interaction.event}
                                        onChange={(e) => onUpdate(interaction.id, 'event', e.target.value)}
                                    >
                                        {events.map((ev: any) => (
                                            <option key={ev.name} value={ev.name}>{ev.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <ControlHeader label="Action" fx={false} />
                                    <select 
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                        value={interaction.action}
                                        onChange={(e) => onUpdate(interaction.id, 'action', e.target.value)}
                                    >
                                        <option value="navigate">Navigate to Page</option>
                                        <option value="showToast">Show Toast</option>
                                        <option value="runQuery">Run Query</option>
                                        <option value="setState">Set State</option>
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
                                            onChange={(e) => onUpdate(interaction.id, 'params', { ...interaction.params, url: e.target.value })}
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
                                            onChange={(e) => onUpdate(interaction.id, 'params', { ...interaction.params, message: e.target.value })}
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
}

const WidgetInteractionTab = ({ item, onUpdate }: { item: GridItemData, onUpdate: (id: string, updates: Partial<GridItemData>) => void }) => {
    const widgetDef = registry.get(item.type);
    const events = widgetDef?.manifest.events || [];
    const interactions = item.content?._interactions || [];

    const handleAdd = () => {
        if (events.length === 0) return;
        const newInteraction = { id: `int_${Date.now()}`, event: events[0].name, action: 'navigate', params: {} };
        onUpdate(item.i, { content: { ...item.content, _interactions: [...interactions, newInteraction] } });
    };

    const handleRemove = (id: string) => {
        onUpdate(item.i, { content: { ...item.content, _interactions: interactions.filter((i: any) => i.id !== id) } });
    };

    const handleUpdateInteraction = (id: string, key: string, value: any) => {
        onUpdate(item.i, { content: { ...item.content, _interactions: interactions.map((i: any) => i.id === id ? { ...i, [key]: value } : i) } });
    };

    return <InteractionList events={events} interactions={interactions} onAdd={handleAdd} onRemove={handleRemove} onUpdate={handleUpdateInteraction} />;
};

const PageInteractionTab = ({ page, onUpdate }: { page: Page, onUpdate: (updates: Partial<Page>) => void }) => {
    const events = [{ name: 'onMount', label: 'On Page Load' }];
    const content = page.content || {};
    const interactions = content.lifecycle?.onMount || [];

    // Helper to store interactions in the flat list for UI, but map back to structured 'lifecycle' object in Page
    const handleAdd = () => {
        const newInteraction = { id: `int_${Date.now()}`, event: 'onMount', action: 'showToast', params: { message: 'Page Loaded' } };
        onUpdate({ 
            content: { 
                ...content, 
                lifecycle: { ...content.lifecycle, onMount: [...interactions, newInteraction] } 
            } 
        });
    };

    const handleRemove = (id: string) => {
        onUpdate({ 
            content: { 
                ...content, 
                lifecycle: { ...content.lifecycle, onMount: interactions.filter((i: any) => i.id !== id) } 
            } 
        });
    };

    const handleUpdateInteraction = (id: string, key: string, value: any) => {
        const updated = interactions.map((i: any) => i.id === id ? { ...i, [key]: value } : i);
        onUpdate({ 
            content: { 
                ...content, 
                lifecycle: { ...content.lifecycle, onMount: updated } 
            } 
        });
    };

    return <InteractionList events={events} interactions={interactions} onAdd={handleAdd} onRemove={handleRemove} onUpdate={handleUpdateInteraction} />;
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

  // Prepare definitions
  const widgetDef = selectedItem ? registry.get(selectedItem.type) : null;
  
  // Calculate Available Tabs
  const availableTabs = useMemo(() => {
      const tabs: { id: PanelTab; label: string; icon: any }[] = [
          { id: 'DESIGN', label: 'Design', icon: Palette }
      ];

      // Page always has Data (State/Query) and Interaction (Lifecycle)
      if (!selectedItem) {
          tabs.push({ id: 'DATA', label: 'Data', icon: Database });
          tabs.push({ id: 'INTERACTION', label: 'Behavior', icon: Zap });
      } else {
          // Widget specific
          if (widgetDef?.manifest.data) {
              tabs.push({ id: 'DATA', label: 'Data', icon: Database });
          }
          // Widget interactions
          if (widgetDef?.manifest.events && widgetDef.manifest.events.length > 0) {
              tabs.push({ id: 'INTERACTION', label: 'Behavior', icon: Zap });
          }
      }

      return tabs;
  }, [widgetDef, selectedItem]);

  // Ensure activeTab is valid
  useEffect(() => {
      if (!availableTabs.some(t => t.id === activeTab)) {
          setActiveTab('DESIGN');
      }
  }, [selectedItem, availableTabs, activeTab]);

  // --- Page Design Tab Render ---
  const renderPageDesign = () => (
      <>
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
      </>
  );

  // --- Widget Design Tab Render ---
  const renderWidgetDesign = () => {
      const properties = widgetDef ? widgetDef.manifest.properties : [];
      const groupedProps = properties.reduce((acc, prop) => {
          const groupName = prop.group || 'General';
          if (!acc[groupName]) acc[groupName] = [];
          acc[groupName].push(prop);
          return acc;
      }, {} as Record<string, PropDefinition[]>);

      if (Object.keys(groupedProps).length === 0) return <div className="p-4 text-xs text-muted-foreground">No configurable properties.</div>;

      return Object.entries(groupedProps).map(([groupName, props]) => (
          <Accordion key={groupName} title={groupName}>
              <div className="space-y-4">
                  {props.map(prop => {
                      const Control = SETTER_COMPONENTS[prop.setter?.component || 'text'] || TextControl;
                      const isSwitch = prop.setter?.component === 'switch';
                      const value = selectedItem?.content?.[prop.name] ?? prop.defaultValue;

                      return (
                          <div key={prop.name}>
                              {!isSwitch && <ControlHeader label={prop.label} />}
                              <Control 
                                  value={value}
                                  onChange={(val) => onUpdate && selectedItem && onUpdate(selectedItem.i, { content: { ...selectedItem.content, [prop.name]: val } })}
                                  propDef={prop}
                              />
                          </div>
                      );
                  })}
              </div>
          </Accordion>
      ));
  };

  const panelTitle = selectedItem ? (selectedItem.title || selectedItem.type) : (pageSettings?.name || 'Page');
  const panelIcon = selectedItem ? (widgetDef?.manifest.icon || LayoutGrid) : LayoutGrid;
  const PanelIcon = panelIcon;

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
                    <PanelIcon size={12} />
                    {selectedItem ? 'COMPONENT' : 'PAGE'}
                </div>
                <div className="flex items-center bg-muted/50 rounded border border-border px-2 py-1">
                    <span className="text-sm font-semibold truncate">{panelTitle}</span>
                </div>
            </div>
            {selectedItem && (
                <Button variant="ghost" size="icon" className="h-8 w-8 mt-4">
                    <MoreVertical size={16} className="text-muted-foreground" />
                </Button>
            )}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
        
        {/* DESIGN */}
        {activeTab === 'DESIGN' && (
            <div className="pb-8">
                {selectedItem ? renderWidgetDesign() : renderPageDesign()}
            </div>
        )}

        {/* DATA */}
        {activeTab === 'DATA' && (
            selectedItem 
                ? <WidgetDataTab item={selectedItem} onUpdate={onUpdate!} />
                : pageSettings && <PageDataTab page={pageSettings} onUpdate={onPageUpdate!} />
        )}

        {/* INTERACTION */}
        {activeTab === 'INTERACTION' && (
            selectedItem
                ? <WidgetInteractionTab item={selectedItem} onUpdate={onUpdate!} />
                : pageSettings && <PageInteractionTab page={pageSettings} onUpdate={onPageUpdate!} />
        )}

      </div>
    </div>
  );
};

export default PropertyPanel;
