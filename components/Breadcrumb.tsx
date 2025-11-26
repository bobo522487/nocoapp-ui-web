import React, { useState } from 'react';
import Dropdown from './Dropdown';
import { LayoutGrid, Database, Table, Plus, Box, File } from 'lucide-react';
import { ViewMode } from '../types';

interface BreadcrumbProps {
  activeView: ViewMode;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ activeView }) => {
  // --- State ---
  const [selectedOrg, setSelectedOrg] = useState({ id: 'org-1', label: "bobo's Org" });

  // Data View State
  const [selectedSource, setSelectedSource] = useState({ id: 'src-1', label: "nocoapp-db" });
  const [selectedTable, setSelectedTable] = useState({ id: 'table-1', label: "users" });

  // Apps View State
  const [selectedApp, setSelectedApp] = useState({ id: 'app-1', label: "Order App" });
  const [selectedPage, setSelectedPage] = useState({ id: 'page-1', label: "Dashboard" });

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
  const tables = [
    { id: 'table-1', label: "users", group: 'Public', icon: Table },
    { id: 'table-2', label: "orders", group: 'Public', icon: Table },
    { id: 'table-3', label: "products", group: 'Public', icon: Table },
    { id: 'table-4', label: "inventory_logs", group: 'Public', icon: Table },
  ];

  // App Context
  const apps = [
    { id: 'app-1', label: "Order App", group: 'Apps', icon: LayoutGrid },
    { id: 'app-2', label: "CRM Dashboard", group: 'Apps', icon: LayoutGrid },
    { id: 'app-3', label: "Employee Portal", group: 'Apps', icon: LayoutGrid },
  ];
  const pages = [
    { id: 'page-1', label: "Dashboard", group: 'Pages', icon: File },
    { id: 'page-2', label: "Settings", group: 'Pages', icon: File },
    { id: 'page-3', label: "Login", group: 'Pages', icon: File },
    { id: 'page-4', label: "404 Error", group: 'Pages', icon: File },
  ];

  const Separator = () => (
    <span className="text-gray-300 dark:text-gray-700 mx-1 text-lg font-light">/</span>
  );

  return (
    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
        {/* 1. Organization Selector (Always Visible) */}
        <Dropdown
            triggerLabel={selectedOrg.label}
            triggerIcon={Box}
            items={orgs}
            selectedId={selectedOrg.id}
            onSelect={(item) => setSelectedOrg({ id: item.id, label: item.label })}
            searchPlaceholder="Find organization..."
            footer={
                <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-gray-100 dark:hover:bg-[#2b2b2b] cursor-pointer w-full text-ide-text gap-2 transition-colors">
                    <Plus size={14} />
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
                    footer={
                         <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-gray-100 dark:hover:bg-[#2b2b2b] cursor-pointer w-full text-ide-text gap-2 transition-colors">
                            <Plus size={14} />
                            <span>New App</span>
                        </div>
                    }
                />
                <Separator />
                <Dropdown
                    triggerLabel={selectedPage.label}
                    triggerIcon={File}
                    items={pages}
                    selectedId={selectedPage.id}
                    onSelect={(item) => setSelectedPage({ id: item.id, label: item.label })}
                    searchPlaceholder="Find page..."
                     footer={
                         <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-gray-100 dark:hover:bg-[#2b2b2b] cursor-pointer w-full text-ide-text gap-2 transition-colors">
                            <Plus size={14} />
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
                    footer={
                        <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-gray-100 dark:hover:bg-[#2b2b2b] cursor-pointer w-full text-ide-text gap-2 transition-colors">
                            <Plus size={14} />
                            <span>New Source</span>
                        </div>
                    }
                />
                <Separator />
                <Dropdown
                    triggerLabel={selectedTable.label}
                    triggerIcon={Table}
                    items={tables}
                    selectedId={selectedTable.id}
                    onSelect={(item) => setSelectedTable({ id: item.id, label: item.label })}
                    searchPlaceholder="Find table..."
                    footer={
                        <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-gray-100 dark:hover:bg-[#2b2b2b] cursor-pointer w-full text-ide-text gap-2 transition-colors">
                            <Plus size={14} />
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