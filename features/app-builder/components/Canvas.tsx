
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Responsive as ResponsiveGridLayout } from "react-grid-layout";
import { GripVertical, MousePointerClick, Copy, Trash2, AlertCircle } from 'lucide-react';
import { useDroppable, useDndMonitor, DragMoveEvent } from '@dnd-kit/core';
import { GridItemData } from '../../../types';
import { registry } from '../../../widgets/registry';
import BaseWidget from '../../../widgets/BaseWidget';
import _ from 'lodash';

interface CanvasProps {
  device?: 'desktop' | 'tablet' | 'mobile';
  draggedItem?: any;
  droppedItem?: any;
  onItemConsumed?: () => void;
  layouts: Record<string, GridItemData[]>;
  onLayoutChange: (layouts: Record<string, GridItemData[]>) => void;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
}

const Canvas: React.FC<CanvasProps> = ({ 
  device = 'desktop', 
  droppedItem, 
  onItemConsumed, 
  layouts, 
  onLayoutChange, 
  selectedItemId,
  onSelectItem
}) => {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // RGL Dropping Item State
  const [droppingItem, setDroppingItem] = useState<{ i: string; w: number; h: number; x: number; y: number } | undefined>(undefined);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  // Keep a ref to layouts to use inside callbacks without triggering recreation
  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;

  // Columns configuration to match RGL props
  const colsConfig = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
  const margin: [number, number] = [12, 12];
  const rowHeight = 30;

  // Setup Droppable for detection
  const { setNodeRef } = useDroppable({
    id: 'canvas-droppable',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Monitor DnD events to update dropping placeholder
  useDndMonitor({
    onDragMove(event: DragMoveEvent) {
      const { active, over } = event;

      if (!over || over.id !== 'canvas-droppable' || !containerRef.current) {
        if (droppingItem) setDroppingItem(undefined);
        return;
      }

      const type = active.data.current?.type;
      if (!type) return;

      const widgetDef = registry.get(type);
      
      // Default size fallback if not in registry
      const { w, h } = widgetDef ? widgetDef.manifest.defaultSize : { w: 4, h: 4 };
      
      const activeRect = active.rect.current.translated;
      if (!activeRect) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      
      const itemCenterX = activeRect.left + (activeRect.width / 2);
      const itemCenterY = activeRect.top + (activeRect.height / 2);

      const relativeX = itemCenterX - containerRect.left;
      const relativeY = itemCenterY - containerRect.top;

      const currentCols = colsConfig[currentBreakpoint as keyof typeof colsConfig] || 12;
      const containerWidth = containerRect.width;
      
      const marginX = margin[0];
      const colWidth = (containerWidth - (marginX * (currentCols + 1))) / currentCols;
      
      let gridX = Math.floor((relativeX - marginX) / (colWidth + marginX));
      let gridY = Math.floor((relativeY - marginX) / (rowHeight + margin[1]));

      gridX = Math.max(0, Math.min(gridX, currentCols - w));
      gridY = Math.max(0, gridY);

      setDroppingItem(prev => {
        if (prev && prev.x === gridX && prev.y === gridY && prev.w === w && prev.h === h) {
          return prev;
        }
        return {
          i: '__dropping-elem__',
          w,
          h,
          x: gridX,
          y: gridY
        };
      });
    },
    onDragEnd() {
      setDroppingItem(undefined);
    },
    onDragCancel() {
      setDroppingItem(undefined);
    }
  });

  // Handle Drop (Finalize)
  useEffect(() => {
    if (droppedItem && onItemConsumed) {
      const widgetDef = registry.get(droppedItem.type);
      const { w, h } = widgetDef ? widgetDef.manifest.defaultSize : { w: 4, h: 4 };

      // Initialize default values for properties defined in manifest
      const initialContent: any = {};
      widgetDef?.manifest.properties.forEach(prop => {
         if (prop.defaultValue !== undefined) {
             initialContent[prop.name] = prop.defaultValue;
         }
      });

      const newItemBase: GridItemData = {
        i: droppedItem.id,
        x: droppingItem ? droppingItem.x : 0, 
        y: droppingItem ? droppingItem.y : Infinity, 
        w,
        h,
        type: droppedItem.type,
        title: droppedItem.name,
        content: initialContent
      };

      // Add to all existing layouts to ensure availability across breakpoints
      const newLayouts = { ...layouts };
      // Ensure 'lg' exists at minimum
      if (!newLayouts['lg']) newLayouts['lg'] = [];

      // Add to all keys
      ['lg', 'md', 'sm', 'xs', 'xxs'].forEach(bp => {
          const currentBpLayout = newLayouts[bp] || newLayouts['lg']; // Fallback to lg structure
          
          // Check for duplicate
          if (!currentBpLayout.find(i => i.i === newItemBase.i)) {
              // Adjust width for smaller screens if needed
              let adjustedW = w;
              if (bp === 'xs' && adjustedW > 4) adjustedW = 4;
              if (bp === 'xxs' && adjustedW > 2) adjustedW = 2;

              newLayouts[bp] = [...currentBpLayout, { ...newItemBase, w: adjustedW }];
          }
      });

      onLayoutChange(newLayouts);
      if (onSelectItem) onSelectItem(newItemBase.i);
      onItemConsumed();
    }
  }, [droppedItem, onItemConsumed, layouts, onLayoutChange, droppingItem, onSelectItem]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Remove from all layouts
    const currentLayouts = layoutsRef.current;
    const newLayouts: Record<string, GridItemData[]> = {};
    Object.keys(currentLayouts).forEach(bp => {
        newLayouts[bp] = currentLayouts[bp].filter(item => item.i !== id);
    });

    onLayoutChange(newLayouts);
    if (selectedItemId === id && onSelectItem) {
        onSelectItem(null);
    }
  }, [onLayoutChange, selectedItemId, onSelectItem]);

  const handleDuplicate = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const newId = `${id.split('-')[0]}-${Date.now()}`;
    const currentLayouts = layoutsRef.current;
    const newLayouts: Record<string, GridItemData[]> = {};

    Object.keys(currentLayouts).forEach(bp => {
        const item = currentLayouts[bp].find(l => l.i === id);
        if (item) {
            newLayouts[bp] = [...currentLayouts[bp], {
                ...item,
                i: newId,
                y: Infinity, // Let grid reflow
                x: item.x
            }];
        } else {
            newLayouts[bp] = currentLayouts[bp];
        }
    });

    onLayoutChange(newLayouts);
    if (onSelectItem) onSelectItem(newId);
  }, [onLayoutChange, onSelectItem]);
  
  const handleResponsiveLayoutChange = useCallback((currentLayout: any[], allLayouts: any) => {
      const currentLayoutsState = layoutsRef.current;
      
      // Sync RGL layouts back to our GridItemData structure
      const newLayoutsState: Record<string, GridItemData[]> = {};
      const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs'];
      
      breakpoints.forEach(bp => {
          const bpLayoutRGL = allLayouts[bp] || [];
          // We try to find the original object in the current breakpoint state, or fallback to LG
          const sourceLayout = currentLayoutsState[bp] || currentLayoutsState['lg'] || [];
          
          if (bpLayoutRGL.length === 0 && sourceLayout.length === 0) {
             newLayoutsState[bp] = [];
             return;
          }

          newLayoutsState[bp] = bpLayoutRGL.map((l: any) => {
              if (l.i === '__dropping-elem__') return null;

              const original = sourceLayout.find(o => o.i === l.i) || currentLayoutsState['lg']?.find(o => o.i === l.i);
              
              if (!original) return null;
              
              return {
                  ...original,
                  x: l.x,
                  y: l.y,
                  w: l.w,
                  h: l.h
              };
          }).filter(Boolean) as GridItemData[];
      });

      // Optimization: Only update if layouts have actually changed deeply
      // This prevents the React #310 error which is often caused by infinite render loops 
      // or updates during render phase in RGL.
      if (!_.isEqual(newLayoutsState, currentLayoutsState)) {
          onLayoutChange(newLayoutsState);
      }
  }, [onLayoutChange]);

  const getContainerWidth = () => {
    switch(device) {
        case 'mobile': return 375;
        case 'tablet': return 768;
        case 'desktop': default: return 1200;
    }
  };

  const getContainerClass = () => {
    const base = "bg-background border border-border shadow-sm transition-all duration-300 ease-in-out relative";
    switch(device) {
        case 'mobile': return `${base} w-[375px] min-h-[667px] my-8 rounded-[2rem] border-8 border-gray-800 dark:border-gray-800`;
        case 'tablet': return `${base} w-[768px] min-h-[1024px] my-8 rounded-lg`;
        case 'desktop': default: return `${base} w-full max-w-[1200px] min-h-[800px] my-8 rounded-md`;
    }
  };

  // Determine which items to render.
  const renderItems = layouts['lg'] || [];

  // Cast ResponsiveGridLayout to any to workaround potential type definition mismatches with react-grid-layout versions
  const ResponsiveGrid = ResponsiveGridLayout as any;

  return (
    <div className="flex-1 flex flex-col bg-muted/10 min-w-0 overflow-auto transition-colors relative">
      
      <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none" 
           style={{ 
               backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)', 
               backgroundSize: '20px 20px' 
           }}
      ></div>

      <div 
        className="flex-1 flex justify-center p-8 z-10 min-h-full cursor-default"
        onClick={(e) => {
             if (e.target === e.currentTarget && onSelectItem) {
                onSelectItem(null);
             }
        }}
      >
         
         <div 
            ref={containerRef}
            className={getContainerClass()}
            style={{ width: device !== 'desktop' ? undefined : '100%', maxWidth: device === 'desktop' ? '1200px' : undefined }}
         >
            <div ref={setNodeRef} className="w-full h-full">

            {mounted && (
                <ResponsiveGrid
                    className="layout"
                    layouts={layouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={colsConfig}
                    rowHeight={rowHeight}
                    width={getContainerWidth()}
                    margin={margin}
                    isDraggable={true}
                    isResizable={true}
                    isDropping={!!droppingItem}
                    droppingItem={droppingItem}
                    onLayoutChange={handleResponsiveLayoutChange}
                    onBreakpointChange={setCurrentBreakpoint}
                    draggableHandle=".drag-handle"
                    compactType="vertical"
                    measureBeforeMount={false}
                >
                    {renderItems.map((item) => {
                        const isSelected = item.i === selectedItemId;
                        const widgetDef = registry.get(item.type);

                        return (
                          <div 
                            key={item.i} 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectItem) onSelectItem(item.i);
                            }}
                            className={`bg-card border rounded-lg transition-all duration-200 ease-in-out group overflow-hidden ${
                                isSelected 
                                ? 'border-primary shadow-md z-50 ring-1 ring-primary' 
                                : 'border-border/60 hover:border-primary hover:shadow-sm'
                            }`}
                          >
                              <div className="drag-handle absolute top-2 left-2 z-50 p-1 rounded-sm cursor-grab active:cursor-grabbing hover:bg-muted bg-background/80 border border-border backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                  <GripVertical size={14} className="text-muted-foreground" />
                              </div>

                              <div className="absolute top-2 right-2 z-50 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div 
                                      onClick={(e) => handleDuplicate(e, item.i)} 
                                      className="p-1 rounded-sm cursor-pointer hover:bg-muted bg-background/80 border border-border backdrop-blur-sm"
                                      title="Duplicate"
                                  >
                                      <Copy size={14} className="text-muted-foreground hover:text-foreground" />
                                  </div>
                                  <div 
                                      onClick={(e) => handleDelete(e, item.i)} 
                                      className="p-1 rounded-sm cursor-pointer hover:bg-muted bg-background/80 border border-border backdrop-blur-sm"
                                      title="Delete"
                                  >
                                      <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                                  </div>
                              </div>

                              {widgetDef ? (
                                <BaseWidget definition={widgetDef} item={item} />
                              ) : (
                                <div className="p-4 flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <AlertCircle size={24} className="mb-2 text-destructive opacity-50"/>
                                    <span className="text-xs">Unknown Type: {item.type}</span>
                                </div>
                              )}
                          </div>
                      );
                    })}
                </ResponsiveGrid>
            )}
            
            {renderItems.length === 0 && !droppingItem && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                    <div className="text-center">
                        <MousePointerClick size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Drag components here</p>
                    </div>
                </div>
            )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Canvas;
