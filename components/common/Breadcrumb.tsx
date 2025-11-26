
import React, { useState } from 'react';
import Dropdown from './Dropdown';
import { LayoutGrid, Database, Table, Plus, Box, File, Eye } from 'lucide-react';
import { ViewMode } from '../../types';
import { useAppStore } from '../../store/useAppStore';

const Breadcrumb: React.FC = () => {
  const { activeView, pages, activePageId, setActivePageId, activeTableId, setActiveTableId, tables } = useAppStore();

  // --- State ---
  const [selectedOrg, setSelectedOrg] = useState({ id: 'org-1', label: "bobo's Org" });

  // Data View State (Source is still mocked locally as it's not in store yet)
  const [selectedSource, setSelectedSource] = useState({ id: 'src-1', label: "nocoapp-db" });
  
  // Apps View State (App is still mocked locally)
  const [selectedApp, setSelectedApp] = useState({ id: 'app-1', label: "Order App" });

  // Dropdown control state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // --- Mock Data ---
  const orgs = [
    { id: 'org-1', label: "bobo's Org", group: 'Personal' },
    { id: 'org-2', label: "nocoapp", group: 'Personal' },
  ];

  // Data Context
  const sources = [
    { id: 'src-1', label: "nocoapp-db", group: 'Databases', icon: Database },
    { id: 'src-2', label: "production-db", group: 'Databases', icon: Database },
  ];
  
  // App Context
  const apps = [
    { id: 'app-1', label: "Order App", group: 'Apps', icon: LayoutGrid },
    { id: 'app-2', label: "CRM Dashboard", group: 'Apps', icon: LayoutGrid },
    { id: 'app-3', label: "Employee Portal", group: 'Apps', icon: LayoutGrid },
  ];
  
  // Derived state from Store
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
      group: t.kind === 'view' ? 'Views' : 'Tables',
      icon: t.kind === 'view' ? Eye : Table
  }));

  const Separator = () => (
    <span className="text-muted-foreground/40 mx-1 text-lg font-light">/</span>
  );

  return (
    <div className="flex items-center text-sm">
        {/* 1. Organization Selector (Always Visible) */}
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

        {/* 2. Apps View: Org / App / Page */}
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

        {/* 3. Data View: Org / Source / Table */}
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
                        <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-muted cursor-pointer w-full text-foreground gap-2 transition-colors">
                            <Plus size={14} className="text-muted-foreground" />
                            <span>New Source</span>
                        </div>
                    }
                />
                <Separator />
                <Dropdown
                    triggerLabel={activeTableItem?.name || activeTableId}
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
            </>
        )}
    </div>
  );
};

export default Breadcrumb;
