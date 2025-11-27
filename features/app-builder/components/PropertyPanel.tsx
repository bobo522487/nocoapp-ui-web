
import React, { useState, useMemo } from 'react';
import { 
  MoreVertical, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink,
  LayoutGrid
} from 'lucide-react';
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { GridItemData, Page } from '../../../types';
import { registry } from '../../../widgets/registry';
import { PropDefinition } from '../../../widgets/types';

// --- Dynamic Control Renderers ---

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
                <button 
                    onClick={() => onChange(!isChecked)}
                    className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                        isChecked ? 'bg-primary' : 'bg-input'
                    }`}
                >
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                        isChecked ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                </button>
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

// --- Component Map ---
const SETTER_COMPONENTS: Record<string, React.FC<ControlProps>> = {
    text: TextControl,
    number: NumberControl,
    textarea: TextareaControl,
    select: SelectControl,
    switch: SwitchControl,
    color: ColorControl
};

// --- Accordion Component ---

interface AccordionProps {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = true }) => {
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
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'STYLES'>('PROPERTIES');

  // Prepare widget definitions unconditionaly to adhere to Rules of Hooks
  const widgetDef = selectedItem ? registry.get(selectedItem.type) : null;
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

  // Handle Page Properties Render (Early Return is now safe as hooks are above)
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
                                <input 
                                    type="checkbox" 
                                    checked={pageSettings?.isHome}
                                    onChange={(e) => onPageUpdate && onPageUpdate({ isHome: e.target.checked })}
                                />
                             </div>
                             <div className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">Disable</Label>
                                <input 
                                    type="checkbox" 
                                    checked={pageSettings?.isDisabled}
                                    onChange={(e) => onPageUpdate && onPageUpdate({ isDisabled: e.target.checked })}
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

  const styleGroups = ['Style', 'Layout'];

  const renderPropertyGroups = (forStylesTab: boolean) => {
      const entries = Object.entries(groupedProps);
      if (entries.length === 0) return null;

      return entries.map(([groupName, props]) => {
          const isStyleGroup = styleGroups.includes(groupName);
          
          // Filter groups based on active tab
          if (forStylesTab && !isStyleGroup) return null;
          if (!forStylesTab && isStyleGroup) return null;

          if (props.length === 0) return null;

          return (
              <Accordion key={groupName} title={groupName}>
                  <div className="space-y-4">
                      {props.map(prop => {
                          const Control = SETTER_COMPONENTS[prop.setter?.component || 'text'] || TextControl;
                          const isSwitch = prop.setter?.component === 'switch';
                          
                          // Resolve value: item content > default
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
          );
      }).filter(Boolean);
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
         <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full">
            <button 
                onClick={() => setActiveTab('PROPERTIES')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                    activeTab === 'PROPERTIES' 
                    ? 'bg-background text-foreground shadow' 
                    : 'hover:bg-background/50 hover:text-foreground'
                }`}
            >
                Properties
            </button>
            <button 
                onClick={() => setActiveTab('STYLES')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                    activeTab === 'STYLES' 
                    ? 'bg-background text-foreground shadow' 
                    : 'hover:bg-background/50 hover:text-foreground'
                }`}
            >
                Styles
            </button>
         </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
        
        <div className="pb-8">
            {renderPropertyGroups(activeTab === 'STYLES')}
        </div>

        {/* Documentation Link */}
        <div className="p-4 mt-4 border-t border-border bg-muted/20">
            <a href="#" className="flex items-center gap-2 text-xs text-primary hover:underline transition-colors group">
                <ExternalLink size={12} />
                <span className="group-hover:underline">Read documentation</span>
            </a>
        </div>

      </div>
    </div>
  );
};

export default PropertyPanel;
