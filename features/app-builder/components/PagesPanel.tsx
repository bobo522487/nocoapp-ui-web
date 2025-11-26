
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Plus, 
    File, 
    MoreVertical, 
    Pencil, 
    Trash2, 
    LayoutGrid, 
    ShoppingCart, 
    Settings, 
    Home, 
    Monitor,
    Tablet,
    Smartphone,
    Table,
    Type,
    MousePointerClick,
    BarChart3,
    TextCursor,
    FileText,
    ChevronDown,
    ChevronRight,
    Eye,
    Copy,
    FolderPlus,
    Folder,
    FolderOpen
} from 'lucide-react';
import ComponentsPanel from './ComponentsPanel';
import { Button } from "../../../components/ui/button";
import { useAppStore } from '../../../store/useAppStore';
import { Page } from '../../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    DndContext, 
    closestCenter, 
    PointerSensor, 
    useSensor, 
    useSensors, 
    DragOverlay, 
    defaultDropAnimationSideEffects, 
    DropAnimation,
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core';
import { 
    SortableContext, 
    verticalListSortingStrategy, 
    useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Item Component ---

interface SortablePageItemProps {
    page: Page;
    depth: number;
    activePageId: string;
    onSelect: (page: Page) => void;
    onToggleFolder: (id: string) => void;
    onMenuOpen: (e: React.MouseEvent, id: string) => void;
    isRenaming: boolean;
    renameValue: string;
    onRenameChange: (val: string) => void;
    onRenameSave: () => void;
    onRenameCancel: () => void;
    childCount?: number;
}

const SortablePageItem = ({ 
    page, 
    depth, 
    activePageId, 
    onSelect, 
    onToggleFolder, 
    onMenuOpen,
    isRenaming,
    renameValue,
    onRenameChange,
    onRenameSave,
    onRenameCancel
}: SortablePageItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ 
        id: page.id, 
        data: { type: 'PAGE', page, depth },
        disabled: isRenaming
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        paddingLeft: `${16 + (depth * 12)}px`
    };

    const isActive = page.id === activePageId;
    
    // Icon Logic
    const getPageIcon = () => {
        if (page.type === 'folder') {
            return page.isOpen 
              ? <FolderOpen size={14} className="mr-2 text-yellow-500" /> 
              : <Folder size={14} className="mr-2 text-yellow-500" />;
        }
  
        switch(page.icon) {
            case 'LayoutGrid': return <LayoutGrid size={14} className="mr-2" />;
            case 'ShoppingCart': return <ShoppingCart size={14} className="mr-2" />;
            case 'Settings': return <Settings size={14} className="mr-2" />;
            case 'Home': return <Home size={14} className="mr-2" />;
            default: return <File size={14} className="mr-2" />;
        }
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                if (!isRenaming) {
                    onSelect(page);
                }
            }}
            className={`relative pr-2 py-2 flex items-center text-sm cursor-pointer transition-colors group select-none outline-none ${
                isActive 
                ? 'bg-accent text-accent-foreground font-medium' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            } ${isDragging ? 'opacity-50 z-50 bg-muted' : ''}`}
        >
            {/* Folder Toggle */}
            <span 
                className="mr-1 opacity-70 w-4 h-4 flex items-center justify-center cursor-pointer z-10"
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on toggle
                onClick={(e) => {
                    e.stopPropagation();
                    if (page.type === 'folder') onToggleFolder(page.id);
                }}
            >
                {page.type === 'folder' && (
                     page.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                )}
            </span>
            
            <div className={`${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} transition-colors flex items-center`}>
                {getPageIcon()}
            </div>
            
            {isRenaming ? (
                <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => onRenameChange(e.target.value)}
                    onBlur={onRenameSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRenameSave();
                        if (e.key === 'Escape') onRenameCancel();
                        e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 w-full h-7 -my-1 bg-background border border-primary rounded-sm px-2 text-xs outline-none text-foreground focus:ring-2 focus:ring-primary/20"
                />
            ) : (
                <span className="flex-1 truncate leading-tight">{page.name}</span>
            )}

            {!isRenaming && page.isHome && <Home size={10} className="text-muted-foreground mr-1" />}
            
            {/* Action Menu Button */}
            {!isRenaming && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    <div 
                        className={`p-1 hover:bg-muted rounded ${isActive ? 'opacity-100' : ''}`}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on menu
                        onClick={(e) => onMenuOpen(e, page.id)}
                    >
                         <MoreVertical size={14} />
                    </div>
                </div>
            )}
        </div>
    );
};


const PagesPanel = () => {
  const navigate = useNavigate();
  const { appId } = useParams(); 
  const { 
      pages, 
      activePageId, 
      addPage, 
      deletePage, 
      updatePage,
      togglePageFolder,
      reorderPages,
      pageLayouts, 
      selectedComponentId, 
      setSelectedComponentId,
      activeDevice 
  } = useAppStore();

  const [activeMenu, setActiveMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showComponents, setShowComponents] = useState(false);
  const [pagesHeight, setPagesHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  
  // Rename State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);

  // DnD Sensors - Smart Activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8, // Require 8px movement to start drag, preventing accidental drags on click
        },
    })
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Derive layout key from activeDevice
  const getLayoutKey = (device: string) => {
      switch(device) {
          case 'mobile': return 'xxs';
          case 'tablet': return 'sm'; 
          case 'desktop': default: return 'lg';
      }
  };

  const currentLayoutKey = getLayoutKey(activeDevice);
  const currentLayouts = pageLayouts[activePageId] || { lg: [] };
  const visibleLayout = currentLayouts[currentLayoutKey] || [];

  // --- Helpers to Flatten Tree ---
  const flattenedPages = useMemo(() => {
    const rootNodes: Page[] = [];
    const childrenMap: Record<string, Page[]> = {};
    
    pages.forEach(p => childrenMap[p.id] = []);

    pages.forEach(p => {
        if (p.parentId) {
            if (!childrenMap[p.parentId]) childrenMap[p.parentId] = [];
            childrenMap[p.parentId].push(p);
        } else {
            rootNodes.push(p);
        }
    });

    const flattened: { id: string; depth: number; page: Page }[] = [];
    
    function traverse(nodes: Page[], depth: number) {
        nodes.forEach(node => {
            flattened.push({ id: node.id, depth, page: node });
            if (node.isOpen && childrenMap[node.id]) {
                traverse(childrenMap[node.id], depth + 1);
            }
        });
    }

    traverse(rootNodes, 0);
    return flattened;
  }, [pages]);

  const activeDragItem = activeDragId ? pages.find(p => p.id === activeDragId) : null;

  // --- Effects ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
      if (showComponents && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowComponents(false);
      }
    };
    const handleScroll = () => { if (activeMenu) setActiveMenu(null); };
    const handleResize = () => { if (activeMenu) setActiveMenu(null); };

    document.addEventListener('mousedown', handleClickOutside);
    if (activeMenu) {
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showComponents, activeMenu]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizing) {
            const newHeight = e.clientY - 120;
            if (newHeight > 100 && newHeight < window.innerHeight - 200) {
                setPagesHeight(newHeight);
            }
          }
      };
      const handleMouseUp = () => {
          setIsResizing(false);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
      };
      if (isResizing) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = 'row-resize';
          document.body.style.userSelect = 'none';
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing]);

  // --- Actions ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveDragId(null);

    if (!over) return;
    
    const activeId = active.id as string;
    const activeIndex = flattenedPages.findIndex(i => i.id === activeId);
    const overIndex = flattenedPages.findIndex(i => i.id === over.id);
    
    const overId = over.id as string;
    const currentItem = flattenedPages[activeIndex];
    
    // Projected depth based on drag offset (each level is 12px indentation)
    const projectedDepth = currentItem.depth + Math.round(delta.x / 12);
    
    const newPages = [...pages];
    const activePage = newPages.find(p => p.id === activeId);
    if (!activePage) return;

    // Remove active page from array
    const oldIndex = newPages.findIndex(p => p.id === activeId);
    newPages.splice(oldIndex, 1);

    // Calculate insertion index
    let newIndex = newPages.findIndex(p => p.id === overId);
    
    if (activeIndex < overIndex) {
        newIndex += 1; // Moving down, insert after
    }
    
    let newParentId: string | undefined = undefined;

    if (newIndex > 0) {
        const prevItem = newPages[newIndex - 1];
        const prevItemFlat = flattenedPages.find(f => f.id === prevItem.id);
        const prevItemDepth = prevItemFlat?.depth ?? 0;
        
        // Logic to determine nesting based on drag position and previous item
        if (prevItem.type === 'folder' && projectedDepth > prevItemDepth) {
            // Indent: Make child of prevItem
            newParentId = prevItem.id;
            prevItem.isOpen = true; 
        } else {
             // Keep same parent as prevItem (sibling) or outdent (grandparent)
             // For simple logic, we default to prevItem's parent
             // Ideally we check if projectedDepth matches prevItemDepth or less
             // But without full tree reconstruction in drag end, we stick to:
             // 1. If dragging right significantly -> Nest
             // 2. Otherwise -> Sibling of where it landed
             
             if (projectedDepth < prevItemDepth) {
                 // Try to outdent? Requires finding grandparent.
                 // For now, simple reorder
                 newParentId = prevItem.parentId;
             } else {
                 newParentId = prevItem.parentId;
             }
        }
    } else {
        newParentId = undefined; // First item is always root
    }

    activePage.parentId = newParentId;
    newPages.splice(newIndex, 0, activePage);

    reorderPages(newPages);
  };

  // --- Handlers ---
  const handleMenuOpen = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveMenu({ id, x: rect.left, y: rect.bottom + 4 });
  };

  const handleAddPage = () => {
      const newId = `page-${Date.now()}`;
      addPage({ id: newId, name: 'New Page', type: 'page', icon: 'File', isHome: false, height: '800' } as any);
      navigate(`/apps/${appId || 'default-app'}/pages/${newId}`);
  };

  const handleAddGroup = () => {
      const newId = `group-${Date.now()}`;
      addPage({ id: newId, name: 'New Group', type: 'folder', isOpen: true, icon: 'Folder', isHome: false, height: '0' } as any);
  };

  const handleDuplicatePage = (page: Page, e: React.MouseEvent) => {
      e.stopPropagation();
      const newId = `page-${Date.now()}`;
      addPage({ ...page, id: newId, name: `${page.name} Copy`, isHome: false });
      setActiveMenu(null);
  };

  const handleItemClick = (page: Page) => {
      if (renamingId === page.id) return; 
      if (page.type === 'folder') {
          togglePageFolder(page.id);
      } else {
          navigate(`/apps/${appId || 'default-app'}/pages/${page.id}`);
      }
  };

  const startRenaming = (page: Page, e: React.MouseEvent) => {
      e.stopPropagation();
      setRenamingId(page.id);
      setRenameValue(page.name);
      setActiveMenu(null);
  };

  const saveRename = () => {
      if (renamingId && renameValue.trim()) {
          updatePage(renamingId, { name: renameValue.trim() });
      }
      setRenamingId(null);
      setRenameValue("");
  };

  const getComponentIcon = (type: string) => {
      switch(type) {
          case 'button': return <MousePointerClick size={14} className="text-muted-foreground" />;
          case 'input': return <TextCursor size={14} className="text-muted-foreground" />;
          case 'textarea': return <FileText size={14} className="text-muted-foreground" />;
          case 'text': return <Type size={14} className="text-muted-foreground" />;
          case 'table': return <Table size={14} className="text-muted-foreground" />;
          case 'chart': return <BarChart3 size={14} className="text-muted-foreground" />;
          case 'stat': return <BarChart3 size={14} className="text-muted-foreground" />;
          default: return <LayoutGrid size={14} className="text-muted-foreground" />;
      }
  };

  const getComponentLabel = (type: string) => {
      switch(type) {
          case 'button': return 'Button';
          case 'input': return 'Input';
          case 'textarea': return 'Text Area';
          case 'text': return 'Text';
          case 'table': return 'Table';
          case 'chart': return 'Chart';
          case 'stat': return 'Stat Card';
          default: return 'Component';
      }
  };

  const getDeviceIcon = () => {
      switch(activeDevice) {
          case 'mobile': return <Smartphone size={12} className="mr-2 text-muted-foreground" />;
          case 'tablet': return <Tablet size={12} className="mr-2 text-muted-foreground" />;
          case 'desktop': default: return <Monitor size={12} className="mr-2 text-muted-foreground" />;
      }
  };

  const getDeviceLabel = () => {
      switch(activeDevice) {
          case 'mobile': return 'Mobile';
          case 'tablet': return 'Tablet';
          case 'desktop': default: return 'Desktop';
      }
  };

  if (showComponents) {
    return (
        <div ref={panelRef} className="h-full">
            <ComponentsPanel onClose={() => setShowComponents(false)} />
        </div>
    );
  }

  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: {
            opacity: '0.5',
          },
        },
      }),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-background">
      
      {/* 1. Header */}
      <div className="h-12 px-4 border-b border-border flex justify-between items-center shrink-0 bg-muted/10">
          <span className="font-medium text-sm text-muted-foreground">Application</span>
          {/* Action buttons removed from here */}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
          {/* Add Component Button */}
          <div className="px-3 mb-2 mt-4 shrink-0">
            <Button 
                variant="secondary" 
                className="w-full justify-start h-8 text-xs font-medium" 
                size="sm"
                onClick={() => setShowComponents(true)}
            >
               <Plus size={14} className="mr-2" /> Add Component
            </Button>
          </div>

          {/* 2. Top Pane: Pages */}
          <div style={{ height: pagesHeight }} className="flex flex-col shrink-0 min-h-[100px]">
              <div className="px-4 py-1 text-xs font-bold text-muted-foreground uppercase mb-2 flex justify-between items-center shrink-0">
                 <span>Pages</span>
                 <div className="flex items-center gap-1">
                     <button 
                        onClick={handleAddGroup}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors"
                        title="New Group"
                     >
                        <FolderPlus size={14} />
                     </button>
                     <button 
                        onClick={handleAddPage}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors"
                        title="New Page"
                     >
                        <Plus size={14} />
                     </button>
                 </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                 <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                 >
                     <SortableContext 
                        items={flattenedPages.map(p => p.id)} 
                        strategy={verticalListSortingStrategy}
                     >
                        {flattenedPages.map(({ id, page, depth }) => (
                            <SortablePageItem 
                                key={id} 
                                page={page} 
                                depth={depth}
                                activePageId={activePageId}
                                onSelect={handleItemClick}
                                onToggleFolder={togglePageFolder}
                                onMenuOpen={handleMenuOpen}
                                isRenaming={renamingId === id}
                                renameValue={renameValue}
                                onRenameChange={setRenameValue}
                                onRenameSave={saveRename}
                                onRenameCancel={() => { setRenamingId(null); setRenameValue(""); }}
                            />
                        ))}
                     </SortableContext>

                     <DragOverlay dropAnimation={dropAnimation}>
                        {activeDragItem ? (
                             <div className="flex items-center px-4 py-2 bg-background border border-primary/50 shadow-lg rounded opacity-80">
                                 <File size={14} className="mr-2 text-primary" />
                                 <span className="text-sm font-medium">{activeDragItem.name}</span>
                             </div>
                        ) : null}
                     </DragOverlay>
                 </DndContext>
              </div>
          </div>

          {/* 3. Resizer */}
          <div 
             ref={splitterRef}
             onMouseDown={() => setIsResizing(true)}
             className="h-1 bg-border hover:bg-primary/50 cursor-row-resize shrink-0 transition-colors z-10"
          />

          {/* 4. Bottom Pane: Component Tree */}
          <div className="flex-1 flex flex-col min-h-[100px] overflow-hidden pt-2">
              <div className="px-4 py-1 text-xs font-bold text-muted-foreground uppercase mb-2 flex justify-between items-center shrink-0">
                 <span>Outline</span>
              </div>

              {/* Tree View */}
              <div className="flex-1 overflow-y-auto p-0">
                  <div className="mb-1">
                     <div className="flex items-center px-4 py-2 text-xs font-medium text-foreground">
                        <ChevronDown size={12} className="mr-1 text-muted-foreground" />
                        {getDeviceIcon()}
                        {getDeviceLabel()}
                     </div>
                     
                     <div className="ml-4 border-l border-border/50 pl-0">
                         {visibleLayout.length === 0 ? (
                             <div className="px-4 py-2 text-[10px] text-muted-foreground italic">
                                 No components
                             </div>
                         ) : (
                             visibleLayout.map((item) => {
                                 const isSelected = item.i === selectedComponentId;
                                 return (
                                     <div 
                                        key={item.i}
                                        onClick={() => setSelectedComponentId(item.i)}
                                        className={`group flex items-center px-4 py-2 cursor-pointer text-xs transition-colors ${
                                            isSelected 
                                            ? 'bg-accent text-accent-foreground' 
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        }`}
                                     >
                                        <div className="flex items-center flex-1 min-w-0">
                                            <span className="mr-2 opacity-70">
                                                {getComponentIcon(item.type)}
                                            </span>
                                            <span className="truncate font-medium leading-tight">
                                                {item.title || getComponentLabel(item.type)}
                                            </span>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Eye size={12} className="text-muted-foreground hover:text-foreground" />
                                        </div>
                                     </div>
                                 );
                             })
                         )}
                     </div>
                  </div>
              </div>
          </div>
      </div>
      
      {/* Portal for Context Menu */}
      {activeMenu && createPortal(
        <div 
            ref={menuRef}
            className="fixed z-[9999] w-48 bg-popover border border-border rounded-lg shadow-xl overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: activeMenu.y, left: activeMenu.x }}
            onClick={(e) => e.stopPropagation()}
        >
            {pages.find(p => p.id === activeMenu.id) && (
                <div className="flex flex-col py-1">
                    <div className="px-1">
                        <button 
                            onClick={(e) => startRenaming(pages.find(p => p.id === activeMenu.id)!, e)} 
                            className="flex items-center w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-md transition-colors gap-2"
                        >
                            <Pencil size={14} className="opacity-70" /> Rename
                        </button>
                    </div>
                    <div className="px-1">
                        <button 
                            onClick={(e) => handleDuplicatePage(pages.find(p => p.id === activeMenu.id)!, e)} 
                            className="flex items-center w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-md transition-colors gap-2"
                        >
                            <Copy size={14} className="opacity-70" /> Duplicate
                        </button>
                    </div>
                    <div className="px-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); deletePage(activeMenu.id); setActiveMenu(null); }} 
                            className="flex items-center w-full px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors gap-2"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default PagesPanel;
