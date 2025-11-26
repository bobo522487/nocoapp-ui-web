import React, { useState } from 'react';
import { 
  MoreVertical, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  Plus, 
  ExternalLink
} from 'lucide-react';

// --- Reusable UI Components for the Panel ---

const FxButton = ({ active = false }: { active?: boolean }) => (
  <button 
    className={`ml-auto p-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
        active 
        ? 'text-primary hover:text-primary/80' 
        : 'text-muted-foreground hover:text-foreground'
    }`}
    title="Toggle Dynamic Value"
  >
    Fx
  </button>
);

const ControlHeader = ({ label, fx = true }: { label: string, fx?: boolean }) => (
  <div className="flex items-center justify-between mb-2">
    <label className="text-[11px] text-muted-foreground font-medium">{label}</label>
    {fx && <FxButton />}
  </div>
);

const InputControl = ({ value, placeholder, className = "" }: { value?: string, placeholder?: string, className?: string }) => (
  <div className={`relative ${className}`}>
    <input 
        type="text" 
        defaultValue={value} 
        placeholder={placeholder}
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
  </div>
);

const ToggleControl = ({ label, checked = false }: { label: string, checked?: boolean }) => {
    const [isChecked, setIsChecked] = useState(checked);
    return (
        <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] text-muted-foreground font-medium">{label}</label>
            <div className="flex items-center gap-2">
                <FxButton />
                <button 
                    onClick={() => setIsChecked(!isChecked)}
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

const ColorPickerControl = ({ label, color, colorLabel }: { label: string, color: string, colorLabel: string }) => (
    <div className="mb-4">
        <ControlHeader label="Label" fx={false} />
        <div className="flex items-center gap-2 p-1 border border-input rounded-md bg-card cursor-pointer hover:border-ring transition-colors shadow-sm">
            <div className="w-8 h-6 rounded-sm border border-border" style={{ backgroundColor: color }}></div>
            <span className="text-xs text-muted-foreground">{colorLabel}</span>
        </div>
    </div>
);

const Accordion = ({ title, children, defaultOpen = true, icon: Icon }: { title: string, children?: React.ReactNode, defaultOpen?: boolean, icon?: any }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2">
            {Icon && <Icon size={14} className="text-muted-foreground" />}
            <span className="text-xs font-semibold text-foreground capitalize">{title}</span>
        </div>
        {isOpen ? (
            <ChevronDown size={14} className="text-muted-foreground group-hover:text-foreground" />
        ) : (
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

interface PropertyPanelProps {
  width: number;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ width }) => {
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'STYLES'>('PROPERTIES');

  return (
    <div 
      style={{ width }}
      className="bg-card flex flex-col h-full shrink-0 overflow-hidden transition-colors border-l border-border"
    >
      
      {/* Header */}
      <div className="p-4 border-b border-border bg-card shrink-0">
         <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
                <input 
                    type="text" 
                    defaultValue="textinput1" 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                <MoreVertical size={16} />
            </button>
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
        
        {activeTab === 'PROPERTIES' ? (
            <div className="pb-8">
                <Accordion title="Data">
                    <div className="space-y-4">
                        <div>
                            <ControlHeader label="Label" />
                            <InputControl value="Name" />
                        </div>
                        <div>
                            <ControlHeader label="Placeholder" />
                            <InputControl value="Enter your input" />
                        </div>
                        <div>
                            <ControlHeader label="Default value" />
                            <InputControl placeholder="" />
                        </div>
                    </div>
                </Accordion>

                <Accordion title="Events">
                    <div className="border border-dashed border-border rounded-md p-4 flex flex-col items-center justify-center text-center mb-3 bg-muted/20">
                        <Info size={16} className="text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">No event handlers attached</span>
                    </div>
                    <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 gap-2">
                        <Plus size={14} /> New event handler
                    </button>
                </Accordion>

                <Accordion title="Validation">
                    <div className="space-y-4">
                        <ToggleControl label="Make this field mandatory" />
                        <div>
                            <ControlHeader label="Regex" />
                            <InputControl placeholder="^[a-zA-Z0-9_ -]{3,16}$" className="text-muted-foreground" />
                        </div>
                        <div>
                            <ControlHeader label="Min length" />
                            <InputControl placeholder="Enter min length" />
                        </div>
                        <div>
                            <ControlHeader label="Max length" />
                            <InputControl placeholder="Enter max length" />
                        </div>
                        <div>
                            <ControlHeader label="Custom validation" />
                            <InputControl placeholder="{{components.text2.text=='yes' && 'valid'}}" />
                        </div>
                    </div>
                </Accordion>

                <Accordion title="Additional Actions">
                    <div className="space-y-4">
                        <ToggleControl label="Loading state" />
                        <ToggleControl label="Visibility" checked={true} />
                        <ToggleControl label="Disable" />
                        <div>
                            <ControlHeader label="Tooltip" />
                            <InputControl placeholder="Enter tooltip text" />
                        </div>
                    </div>
                </Accordion>

                <Accordion title="Devices">
                    <div className="space-y-4">
                        <ToggleControl label="Show on desktop" checked={true} />
                        <ToggleControl label="Show on mobile" />
                    </div>
                </Accordion>
            </div>
        ) : (
            <div className="pb-8">
                <Accordion title="Label">
                    <ColorPickerControl label="Text Color" color="#374151" colorLabel="Text/Primary" />
                </Accordion>

                <Accordion title="Container">
                    <div className="mb-4">
                        <ControlHeader label="Padding" fx={false} />
                        <div className="flex bg-muted rounded-md p-1">
                            <button className="flex-1 py-1 text-[10px] rounded-sm bg-background text-foreground shadow-sm">Default</button>
                            <button className="flex-1 py-1 text-[10px] rounded-sm text-muted-foreground hover:text-foreground transition-colors">None</button>
                        </div>
                    </div>
                </Accordion>

                <Accordion title="Field">
                    <div className="space-y-4">
                        <ColorPickerControl label="Background" color="#ffffff" colorLabel="Surface/Surface1" />
                        <ColorPickerControl label="Border" color="#e5e7eb" colorLabel="Border/Default" />
                        <ColorPickerControl label="Accent" color="#3b82f6" colorLabel="Brand/Primary" />
                        <ColorPickerControl label="Text" color="#374151" colorLabel="Text/Primary" />
                        
                        <div className="pt-2 border-t border-border"></div>
                        
                        <div className="mb-4">
                            <ControlHeader label="Border Radius" fx={true} />
                            <div className="flex items-center gap-2 relative">
                                <input type="number" defaultValue={6} className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                <span className="text-[10px] text-muted-foreground absolute right-3 pointer-events-none">px</span>
                            </div>
                        </div>

                        <ColorPickerControl label="Box Shadow" color="rgba(0,0,0,0.1)" colorLabel="#00000040" />
                    </div>
                </Accordion>
            </div>
        )}

        {/* Documentation Link */}
        <div className="p-4 mt-4 border-t border-border bg-muted/20">
            <a href="#" className="flex items-center gap-2 text-xs text-primary hover:underline transition-colors group">
                <ExternalLink size={12} />
                <span className="group-hover:underline">Read documentation for TextInput</span>
            </a>
        </div>

      </div>
    </div>
  );
};

export default PropertyPanel;