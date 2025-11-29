
import React, { useState } from 'react';
import Dropdown from './Dropdown';
import { LayoutGrid, Database, Table, Plus, Box, File, Eye, Filter, TableIcon, Server } from 'lucide-react';
import { ViewMode } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Button } from "../ui/button";
import { useNavigate } from 'react-router-dom';

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
  const [selectedOrg, setSelectedOrg] = useState({ id: 'org-1', label: "bobo's Org" });
  const [selectedSource, setSelectedSource] = useState({ id: 'src-1', label: "nocoapp-db" });
  const [selectedApp, setSelectedApp] = useState({ id: 'app-1', label: "Order App" });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // --- Mock Data ---
  const orgs = [
    { id: 'org-1', label: "bobo's Org", group: 'Personal' },
    { id: 'org-2', label: "nocoapp", group: 'Personal' },
  ];

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

  return (
    <div className="flex items-center text-sm">
        {/* 1. Organization Selector */}
        <Dropdown
            triggerLabel={selectedOrg.label}
            triggerIcon={Box}
            items={orgs}
            selectedId={selectedOrg.id}
            onSelect={(item) => setSelectedOrg({ id: item.id, label: item.label })}
            searchPlaceholder="Find organization..."
            open={activeDropdown === 'org'}
            onOpenChange={(isOpen) => setActiveDropdown(isOpen ? 'org' : null)}
            footer={
                <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-muted cursor-pointer w-full text-foreground gap-2 transition-colors">
                    <Plus size={14} className="text-muted-foreground" />
                    <span>New Organization</span>
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
    </div>
  );
};

export default Breadcrumb;