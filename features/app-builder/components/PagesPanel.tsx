
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Plus, 
    File, 
    LayoutGrid, 
    ShoppingCart, 
    Settings, 
    Home, 
    Folder,
    FolderOpen,
    FolderPlus,
    Monitor,
    Tablet,
    Smartphone,
    Eye,
    ChevronDown,
    MousePointerClick,
    Type,
    TextCursor,
    FileText,
    BarChart3,
    Table as TableIcon
} from 'lucide-react';
import ComponentsPanel from './ComponentsPanel';
import { Button } from "../../../components/ui/button";
import { useAppStore } from '../../../store/useAppStore';
import { Page } from '../../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { Tree } from '../../../components/common/Tree/Tree';
import { TreeItem } from '../../../components/common/Tree/types';
import { flatten } from '../../../components/common/Tree/utilities';

const PagesPanel = () => {
  const navigate = useNavigate();
  const { appId } = useParams(); 
  const { 
      pages, 
      activePageId, 
      addPage, 
      deletePage, 
      updatePage, 
      duplicatePage,
      reorderPages,
      togglePageFolder,
      pageLayouts, 
      selectedComponentId, 
      setSelectedComponentId,
      activeDevice 
  } = useAppStore();

  const [showComponents, setShowComponents] = useState(false);
  const [pagesHeight, setPagesHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);

  // --- Tree Data Conversion ---
  const treeItems = useMemo(() => {
      const buildTree = (parentId?: string): TreeItem[] => {
          return pages
              .filter(p => p.parentId === parentId)
              .map(p => ({
                  id: p.id,
                  children: buildTree(p.id),
                  collapsed: !p.isOpen,
                  type: p.type,
                  data: {
                      name: p.name,
                      icon: p.icon,
                      isHome: p.isHome
                  }
              }));
      };
      return buildTree(undefined); // Root items
  }, [pages]);

  const handleTreeChange = (newItems: TreeItem[]) => {
      // Convert nested tree back to flat pages list for store
      const flattened = flatten(newItems);
      const newPages: Page[] = flattened.map(item => {
          const original = pages.find(p => p.id === item.id);
          if (!original) return null;
          return {
              ...original,
              parentId: item.parentId ? (item.parentId as string) : undefined,
              isOpen: !item.collapsed, // Sync collapse state
          };
      }).filter(Boolean) as Page[];

      reorderPages(newPages);
  };

  // --- Actions ---
  const handleAddPage = () => {
      const newId = `page-${Date.now()}`;
      addPage({ id: newId, name: 'New Page', type: 'page', icon: 'File', isHome: false, height: '800', isHidden: false, isDisabled: false } as any);
      navigate(`/apps/${appId || 'default-app'}/pages/${newId}`);
  };

  const handleAddGroup = () => {
      const newId = `group-${Date.now()}`;
      addPage({ id: newId, name: 'New Group', type: 'folder', isOpen: true, icon: 'Folder', isHome: false, height: '0', isHidden: false, isDisabled: false } as any);
  };

  const handleSelectPage = (item: any) => {
      if (item.type === 'folder') {
          togglePageFolder(item.id);
      } else {
          navigate(`/apps/${appId || 'default-app'}/pages/${item.id}`);
      }
  };

  // Handle adding a child item to a folder via the TreeItem action
  const handleAddItemToFolder = (parentId: string) => {
      const newId = `page-${Date.now()}`;
      addPage({ 
          id: newId, 
          name: 'New Page', 
          type: 'page', 
          icon: 'File', 
          parentId: parentId, // Set the parent ID
          isHome: false, 
          height: '800',
          isHidden: false, 
          isDisabled: false 
      } as any);
      
      // Ensure folder is open
      const parent = pages.find(p => p.id === parentId);
      if (parent && !parent.isOpen) {
          togglePageFolder(parentId);
      }
      
      navigate(`/apps/${appId || 'default-app'}/pages/${newId}`);
  };

  const renderPageIcon = (item: any) => {
      if (item.type === 'folder') {
          return item.collapsed 
            ? <Folder size={16} className="text-yellow-500/80" />
            : <FolderOpen size={16} className="text-yellow-500/80" />;
      }
      switch(item.data?.icon) {
          case 'LayoutGrid': return <LayoutGrid size={16} />;
          case 'ShoppingCart': return <ShoppingCart size={16} />;
          case 'Settings': return <Settings size={16} />;
          case 'Home': return <Home size={16} />;
          default: return <File size={16} />;
      }
  };

  // --- Layout Outline Logic ---
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

  const getComponentIcon = (type: string) => {
      switch(type) {
          case 'button': return <MousePointerClick size={14} className="text-muted-foreground" />;
          case 'input': return <TextCursor size={14} className="text-muted-foreground" />;
          case 'textarea': return <FileText size={14} className="text-muted-foreground" />;
          case 'text': return <Type size={14} className="text-muted-foreground" />;
          case 'table': return <TableIcon size={14} className="text-muted-foreground" />;
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

  // --- Effects ---
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

  if (showComponents) {
    return (
        <div ref={panelRef} className="h-full">
            <ComponentsPanel onClose={() => setShowComponents(false)} />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-background">
      
      {/* 1. Header */}
      <div className="h-12 px-4 border-b border-border flex justify-between items-center shrink-0 bg-muted/10">
          <span className="font-medium text-sm text-muted-foreground">Application</span>
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

          {/* 2. Top Pane: Pages (Generic Tree) */}
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

              {/* Tree */}
              <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                 <div className="px-2">
                    <Tree 
                        items={treeItems} 
                        onItemsChange={handleTreeChange}
                        activeId={activePageId}
                        onSelect={handleSelectPage}
                        onRename={(id, name) => updatePage(id, { name })}
                        onRemove={(id) => deletePage(id)}
                        // Only pass onAdd for folder items to create children
                        onAdd={(id) => {
                            const item = pages.find(p => p.id === id);
                            if (item && item.type === 'folder') {
                                handleAddItemToFolder(id);
                            }
                        }}
                        onDuplicate={(id) => duplicatePage(id)}
                        renderIcon={renderPageIcon}
                        collapsible
                        removable
                        indicator
                        canHaveChildren={(item) => item.type === 'folder'}
                        hideCollapseButton
                    />
                 </div>
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
                        {activeDevice === 'mobile' ? <Smartphone size={12} className="mr-2 text-muted-foreground" /> :
                         activeDevice === 'tablet' ? <Tablet size={12} className="mr-2 text-muted-foreground" /> :
                         <Monitor size={12} className="mr-2 text-muted-foreground" />}
                        {activeDevice.charAt(0).toUpperCase() + activeDevice.slice(1)}
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
    </div>
  );
};

export default PagesPanel;
