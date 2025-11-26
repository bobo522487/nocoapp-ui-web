
import React, { useState } from 'react';
import Canvas from '../components/Canvas';
import PropertyPanel from '../components/PropertyPanel';
import { useResizable } from '../../../hooks/useResizable';
import { Button } from "../../../components/ui/button";
import { Undo2, Redo2, Monitor, Tablet, Smartphone, Save, Play, Rocket, MousePointer2, Hand, Trash2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Page, GridItemData } from '../../../types';

interface AppToolbarProps {
  device: 'desktop' | 'tablet' | 'mobile';
  setDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  onClearCanvas: () => void;
  pageName: string;
}

const AppToolbar: React.FC<AppToolbarProps> = ({ device, setDevice, onClearCanvas, pageName }) => {
  const [mode, setMode] = useState<'edit' | 'move'>('edit');

  return (
    <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0 z-10 transition-colors">
        {/* Left: Modes & History Actions */}
        <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex bg-muted/50 p-1 rounded-md">
                <Button 
                    variant={mode === 'edit' ? 'secondary' : 'ghost'} 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setMode('edit')}
                    title="Edit Mode"
                >
                    <MousePointer2 size={16} />
                </Button>
                <Button 
                    variant={mode === 'move' ? 'secondary' : 'ghost'} 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setMode('move')}
                    title="Move Mode"
                >
                    <Hand size={16} />
                </Button>
            </div>

            <div className="w-px h-6 bg-border"></div>

            <span className="text-sm font-medium text-muted-foreground">{pageName}</span>
        </div>

        {/* Center: Device Switcher */}
        <div className="flex bg-muted/50 p-1 rounded-md">
            <Button 
                variant={device === 'desktop' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setDevice('desktop')}
                title="Desktop"
            >
                <Monitor size={16} />
            </Button>
            <Button 
                variant={device === 'tablet' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setDevice('tablet')}
                title="Tablet"
            >
                <Tablet size={16} />
            </Button>
            <Button 
                variant={device === 'mobile' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setDevice('mobile')}
                title="Mobile"
            >
                <Smartphone size={16} />
            </Button>
        </div>

        {/* Right: Main Actions */}
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Undo">
                    <Undo2 size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Redo">
                    <Redo2 size={16} />
                </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={onClearCanvas} className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" title="Clear">
                <Trash2 size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Save">
                <Save size={16} />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" title="Preview">
                <Play size={16} />
            </Button>
            <Button variant="default" size="icon" className="h-8 w-8" title="Publish">
                <Rocket size={16} />
            </Button>
        </div>
    </div>
  );
};

interface AppBuilderPageProps {
  draggedItem?: any;
  droppedItem?: any;
  onItemConsumed?: () => void;
}

const AppBuilderPage: React.FC<AppBuilderPageProps> = ({ draggedItem, droppedItem, onItemConsumed }) => {
  const { 
      pages, 
      activePageId, 
      updatePage,
      pageLayouts,
      setLayouts,
      selectedComponentId,
      setSelectedComponentId,
      updateLayoutItem,
      activeDevice,
      setActiveDevice
  } = useAppStore();
  
  // Derived active page and layout
  const activePage = pages.find(p => p.id === activePageId);
  const layouts = pageLayouts[activePageId] || { lg: [] };
  
  // Get selected item properties. We use the 'lg' (desktop) layout as the source of truth for component metadata in panel for now, 
  // or ideally the currently active layout.
  // Map activeDevice to layout key to find the item in the current view
  const getLayoutKey = (dev: string) => {
      switch(dev) {
          case 'mobile': return 'xxs';
          case 'tablet': return 'sm';
          default: return 'lg';
      }
  };
  const currentKey = getLayoutKey(activeDevice);
  const selectedItem = (layouts[currentKey] || layouts['lg'])?.find(i => i.i === selectedComponentId) || null;

  const { width, startResizing } = useResizable({
    initialWidth: 260,
    minWidth: 240,
    maxWidth: 600,
    edge: 'right'
  });

  const handleClearCanvas = () => {
    // Clear layouts for all breakpoints for the current page
    setLayouts({ lg: [] });
    setSelectedComponentId(null);
  };

  const handlePageUpdate = (updates: Partial<Page>) => {
      if (activePageId) {
          updatePage(activePageId, updates);
      }
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <AppToolbar 
            device={activeDevice} 
            setDevice={setActiveDevice} 
            onClearCanvas={handleClearCanvas} 
            pageName={activePage?.name || 'Page'}
          />
          <div className="flex-1 flex overflow-hidden relative">
             <Canvas 
               device={activeDevice} 
               draggedItem={draggedItem}
               droppedItem={droppedItem}
               onItemConsumed={onItemConsumed}
               layouts={layouts}
               onLayoutChange={setLayouts}
               selectedItemId={selectedComponentId}
               onSelectItem={setSelectedComponentId}
             />
          </div>
      </div>
      
      {/* PropertyPanel Resizer */}
      <div
        className="w-[1px] bg-border hover:bg-primary cursor-col-resize z-50 relative transition-colors"
        onMouseDown={startResizing}
      >
        <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize z-50" />
      </div>

      <PropertyPanel 
        width={width} 
        selectedItem={selectedItem} 
        onUpdate={updateLayoutItem}
        pageSettings={activePage}
        onPageUpdate={handlePageUpdate}
      />
    </>
  );
};

export default AppBuilderPage;
