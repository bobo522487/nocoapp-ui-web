
import React, { useState } from 'react';
import Dropdown, { DropdownItem } from './Dropdown';
import { LayoutGrid, Database, Table, Plus, Box, File, Eye, Filter, TableIcon, Server, Copy } from 'lucide-react';
import { ViewMode } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Button } from "../ui/button";
import { useNavigate } from 'react-router-dom';
import CreateWorkspaceDialog from '../../features/workspace/components/CreateWorkspaceDialog';

const Breadcrumb: React.FC = () => {
  const navigate = useNavigate();
  const { 
      activeView, 
      pages, 
      activePageId, 
      setActivePageId, 
      activeTableId, 
      setActiveTableId, 
      tables, 
      views, 
      activeViewId, 
      setActiveViewId,
      dataViewMode,
      setDataViewMode
  } = useAppStore();

  // --- State ---
  const [selectedOrg, setSelectedOrg] = useState({ id: 'org-1', label: "bobo's Org", color: 'bg-blue-500' });
  const [selectedSource, setSelectedSource] = useState({ id: 'src-1', label: "nocoapp-db" });
  const [selectedApp, setSelectedApp] = useState({ id: 'app-1', label: "Order App" });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Organization State
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [orgs, setOrgs] = useState([
    { id: 'org-1', label: "bobo's Org", group: 'Personal', description: 'Free Plan • 2 members', color: 'bg-indigo-500' },
    { id: 'org-2', label: "nocoapp", group: 'Organization', description: 'Pro Plan • 15 members', color: 'bg-emerald-500' },
    { id: 'org-3', label: "Test Workspace", group: 'Personal', description: 'Free Plan • 1 member', color: 'bg-orange-500' },
  ]);

  const sources = [
    { id: 'src-1', label: "nocoapp-db", group: 'Databases', icon: Database },
    { id: 'src-2', label: "production-db", group: 'Databases', icon: Database },
  ];
  
  const apps = [
    { id: 'app-1', label: "Order App", group: 'Apps', icon: LayoutGrid },
    { id: 'app-2', label: "CRM Dashboard", group: 'Apps', icon: LayoutGrid },
    { id: 'app-3', label: "Employee Portal", group: 'Apps', icon: LayoutGrid },
  ];
  
  // Derived state
  const activePage = pages.find(p => p.id === activePageId);
  const pageItems = pages.map(p => ({
      id: p.id,
      label: p.name,
      group: 'Pages',
      icon: File
  }));

  const activeTableItem = tables.find(t => t.id === activeTableId);
  const tableItems = tables.map(t => ({
      id: t.id,
      label: t.name,
      group: t.kind === 'view' ? 'DB Views' : 'Tables',
      icon: t.kind === 'view' ? Eye : Table
  }));

  const activeViewItem = views.find(v => v.id === activeViewId);
  const currentTableViews = views.filter(v => v.tableId === activeTableId).map(v => ({
      id: v.id,
      label: v.name,
      group: v.isDefault ? 'Default' : 'Custom',
      icon: Filter
  }));

  const Separator = () => (
    <span className="text-muted-foreground/40 mx-1 text-lg font-light">/</span>
  );

  // Org Dropdown Item Helpers
  const renderOrgAvatar = (label: string, color: string) => (
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
          {label.substring(0, 2).toUpperCase()}
      </div>
  );

  const orgItems: DropdownItem[] = orgs.map(o => ({
      id: o.id,
      label: o.label,
      group: o.group,
      description: o.description,
      avatar: renderOrgAvatar(o.label, o.color)
  }));

  const renderOrgHeader = () => (
      <div className="px-3 py-3">
          <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${selectedOrg.color} flex items-center justify-center text-white text-base font-bold shadow-sm`}>
                  {selectedOrg.label.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{selectedOrg.label}</div>
                  <div className="text-xs text-muted-foreground truncate">Free • 2 members</div>
              </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded-md border border-border/50">
              <span className="font-mono">ID: {selectedOrg.id}</span>
              <button className="ml-auto hover:text-foreground transition-colors" title="Copy ID">
                  <Copy size={12} />
              </button>
          </div>
      </div>
  );

  const handleCreateWorkspace = (name: string) => {
      const newOrg = {
          id: `org-${Date.now()}`,
          label: name,
          group: 'Personal',
          description: 'Free Plan • 1 member',
          color: 'bg-blue-500' // Default color
      };
      setOrgs(prev => [...prev, newOrg]);
      setSelectedOrg({ id: newOrg.id, label: newOrg.label, color: newOrg.color });
  };

  return (
    <div className="flex items-center text-sm">
        {/* 1. Organization Selector */}
        <Dropdown
            triggerLabel={selectedOrg.label}
            triggerIcon={Box}
            items={orgItems}
            selectedId={selectedOrg.id}
            onSelect={(item) => {
                const org = orgs.find(o => o.id === item.id);
                if (org) setSelectedOrg({ id: org.id, label: org.label, color: org.color });
            }}
            width={280}
            header={renderOrgHeader()}
            searchPlaceholder="Find workspace..."
            open={activeDropdown === 'org'}
            onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'org' : null)}
            footer={
                <div 
                    className="relative flex select-none items-center rounded-md px-2 py-2 text-xs outline-none hover:bg-muted cursor-pointer w-full text-foreground gap-2 transition-colors"
                    onClick={() => {
                        setActiveDropdown(null);
                        setIsCreateWorkspaceOpen(true);
                    }}
                >
                    <div className="w-6 h-6 rounded-md border border-dashed border-muted-foreground/50 flex items-center justify-center">
                        <Plus size={14} className="text-muted-foreground" />
                    </div>
                    <span className="font-medium">Create New Workspace</span>
                </div>
            }
        />

        {/* 2. Apps View */}
        {activeView === ViewMode.APPS && (
            <>
                <Separator />
                <Dropdown
                    triggerLabel={selectedApp.label}
                    triggerIcon={LayoutGrid}
                    items={apps}
                    selectedId={selectedApp.id}
                    onSelect={(item) => setSelectedApp({ id: item.id, label: item.label })}
                    searchPlaceholder="Find app..."
                    open={activeDropdown === 'app'}
                    onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'app' : null)}
                    footer={
                         <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-muted cursor-pointer w-full text-foreground gap-2 transition-colors">
                            <Plus size={14} className="text-muted-foreground" />
                            <span>New App</span>
                        </div>
                    }
                />
                <Separator />
                <Dropdown
                    triggerLabel={activePage?.name || 'Select Page'}
                    triggerIcon={File}
                    items={pageItems}
                    selectedId={activePageId}
                    onSelect={(item) => setActivePageId(item.id)}
                    searchPlaceholder="Find page..."
                    open={activeDropdown === 'page'}
                    onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'page' : null)}
                     footer={
                         <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-muted cursor-pointer w-full text-foreground gap-2 transition-colors">
                            <Plus size={14} className="text-muted-foreground" />
                            <span>New Page</span>
                        </div>
                    }
                />
            </>
        )}

        {/* 3. Data View: Org / Source / Table / View */}
        {activeView === ViewMode.DATA && (
            <>
                <Separator />
                 <Dropdown
                    triggerLabel={selectedSource.label}
                    triggerIcon={Database}
                    items={sources}
                    selectedId={selectedSource.id}
                    onSelect={(item) => setSelectedSource({ id: item.id, label: item.label })}
                    searchPlaceholder="Find data source..."
                    open={activeDropdown === 'source'}
                    onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'source' : null)}
                    footer={
                        <div 
                            className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-muted cursor-pointer w-full text-foreground gap-2 transition-colors"
                            onClick={() => {
                                setActiveDropdown(null);
                                navigate('/datasources');
                            }}
                        >
                            <Plus size={14} className="text-muted-foreground" />
                            <span>New Source</span>
                        </div>
                    }
                />
                <Separator />
                <Dropdown
                    triggerLabel={activeTableItem?.name || activeTableId || 'Select Table'}
                    triggerIcon={activeTableItem?.kind === 'view' ? Eye : Table}
                    items={tableItems}
                    selectedId={activeTableId}
                    onSelect={(item) => setActiveTableId(item.id)}
                    searchPlaceholder="Find table..."
                    open={activeDropdown === 'table'}
                    onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'table' : null)}
                    footer={
                        <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-muted cursor-pointer w-full text-foreground gap-2 transition-colors">
                            <Plus size={14} className="text-muted-foreground" />
                            <span>New Table</span>
                        </div>
                    }
                />
                {activeViewId && activeTableId && (
                    <>
                        <Separator />
                        <Dropdown
                            triggerLabel={activeViewItem?.name || 'View'}
                            triggerIcon={Filter}
                            items={currentTableViews}
                            selectedId={activeViewId}
                            onSelect={(item) => setActiveViewId(item.id)}
                            searchPlaceholder="Find view..."
                            open={activeDropdown === 'view'}
                            onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'view' : null)}
                            width={200}
                        />
                    </>
                )}

                {/* View Mode Toggle */}
                {activeTableId && (
                    <>
                        <div className="h-4 w-px bg-border mx-2"></div>
                        <div className="flex bg-muted/50 p-0.5 rounded-md">
                            <Button 
                                variant={dataViewMode === 'DATA' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setDataViewMode('DATA')}
                                className="h-6 text-xs gap-1.5 px-2"
                            >
                                <TableIcon size={12} /> Data
                            </Button>
                            <Button 
                                variant={dataViewMode === 'MODEL' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setDataViewMode('MODEL')}
                                className="h-6 text-xs gap-1.5 px-2"
                            >
                                <Database size={12} /> Model
                            </Button>
                        </div>
                    </>
                )}
            </>
        )}
        
        {/* 4. Datasource View */}
        {activeView === ViewMode.DATASOURCE && (
            <>
               <Separator />
               <div className="flex items-center gap-2 text-foreground font-medium px-2 py-1 rounded hover:bg-muted/50 cursor-pointer">
                   <Server size={14} className="text-muted-foreground" />
                   <span>Datasources</span>
               </div>
               <Separator />
               <span className="text-muted-foreground">New Source</span>
            </>
        )}

        <CreateWorkspaceDialog
            isOpen={isCreateWorkspaceOpen}
            onClose={() => setIsCreateWorkspaceOpen(false)}
            onCreate={handleCreateWorkspace}
        />
    </div>
  );
};

export default Breadcrumb;
