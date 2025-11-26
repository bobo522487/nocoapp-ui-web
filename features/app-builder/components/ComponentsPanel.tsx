
import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  LayoutGrid,
  GripVertical,
  X
} from 'lucide-react';
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { useDraggable } from '@dnd-kit/core';
import { registry } from '../../../widgets/registry';
import { WidgetManifest } from '../../../widgets/types';

interface DraggableItemProps {
  manifest: WidgetManifest;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ manifest }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draggable-${manifest.type}`,
    data: manifest
  });

  return (
    <div 
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`flex flex-col items-center justify-center p-2 rounded border border-transparent hover:bg-primary/10 hover:border-primary/20 cursor-grab active:cursor-grabbing transition-all group relative ${isDragging ? 'opacity-50' : ''}`}
    >
        <div className="w-10 h-10 flex items-center justify-center mb-1 relative bg-muted/50 rounded-md group-hover:bg-background transition-colors border border-transparent group-hover:border-border">
            <manifest.icon size={20} strokeWidth={1.5} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-[10px] text-muted-foreground text-center leading-tight group-hover:text-foreground mt-1">
            {manifest.name}
        </span>
    </div>
  );
};

interface ComponentsPanelProps {
    onClose: () => void;
}

const ComponentsPanel: React.FC<ComponentsPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'components' | 'modules'>('components');
  
  // Initialize open sections based on registry categories
  const categories = registry.getCategories();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in slide-in-from-left-4 duration-200">
      {/* Header (Unified) */}
      <div className="h-12 px-4 border-b border-border flex justify-between items-center shrink-0 bg-muted/10">
          <span className="font-medium text-sm text-muted-foreground">Components</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
             <X size={14} className="text-muted-foreground hover:text-foreground"/>
          </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 pt-3 pb-0 border-b border-border shrink-0 bg-background">
         <div className="flex-1 flex gap-4">
            <button 
                onClick={() => setActiveTab('components')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'components' 
                    ? 'text-primary border-primary' 
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
            >
                Components
            </button>
            <button 
                onClick={() => setActiveTab('modules')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'modules' 
                    ? 'text-primary border-primary' 
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
            >
                Modules
            </button>
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent p-0">
        
        {/* Search Bar */}
        <div className="px-3 my-4 relative">
             <Search size={12} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <Input 
               type="text" 
               placeholder="Search components..." 
               className="pl-8 h-8 text-xs bg-muted/30 focus-visible:ring-primary"
             />
        </div>

        <div className="px-3 pb-4">
            {activeTab === 'components' ? (
                /* Components Tab */
                <div className="space-y-1">
                    {categories.map((category) => {
                        const widgets = registry.getByCategory(category);
                        return (
                            <div key={category} className="border-b border-transparent">
                                <button 
                                    onClick={() => toggleSection(category)}
                                    className="w-full flex items-center justify-between py-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors group"
                                >
                                    <span>{category}</span>
                                    {openSections[category] ? (
                                        <ChevronDown size={12} className="text-muted-foreground group-hover:text-primary" />
                                    ) : (
                                        <ChevronRight size={12} className="text-muted-foreground group-hover:text-primary" />
                                    )}
                                </button>
                                
                                {openSections[category] && (
                                    <div className="grid grid-cols-3 gap-2 pb-3 animate-in fade-in zoom-in-95 duration-150">
                                        {widgets.map((def) => (
                                            <DraggableItem key={def.manifest.type} manifest={def.manifest} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Modules Tab (Static for now) */
                <div className="space-y-3">
                    {[
                        { id: 1, title: 'Auth Form', icon: LayoutGrid },
                        { id: 2, title: 'Header', icon: GripVertical }
                    ].map((mod) => (
                        <div 
                            key={mod.id} 
                            className="flex items-center p-2 rounded border border-transparent hover:bg-muted hover:border-border cursor-pointer transition-all group"
                        >
                            <div className="w-12 h-10 flex items-center justify-center bg-muted/50 rounded mr-3 group-hover:bg-background transition-colors">
                                <mod.icon size={20} strokeWidth={1.5} className="text-muted-foreground group-hover:text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{mod.title}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default ComponentsPanel;
