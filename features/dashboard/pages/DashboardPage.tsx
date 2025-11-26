
import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Database, Plus, MoreVertical, Search, Box, Table, Eye, ArrowRight, FolderPlus } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { useNavigate } from 'react-router-dom';
import { cn } from "../../../lib/utils";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMenuAppId, setActiveMenuAppId] = useState<string | null>(null);
  
  // Data Source State
  const [activeSourceId, setActiveSourceId] = useState<string>('src-1');
  const [activeMenuTableId, setActiveMenuTableId] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuAppId(null);
        setActiveMenuTableId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAppClick = (appId: string) => {
      navigate(`/apps/${appId}`);
  };

  const handleTableClick = (tableId: string) => {
      navigate(`/data/${tableId}`);
  };

  const handleNewTableClick = () => {
      navigate(`/data`); // Navigate to generic data page which likely handles creation or defaults
  };

  // Mock Data - Apps
  const apps = [
    {
      id: 'app-1',
      name: 'Order Management System',
      description: 'Internal tool for managing customer orders.',
      lastEdited: '15d ago',
    },
    {
      id: 'app-2',
      name: 'CRM Dashboard',
      description: 'Customer relationship management.',
      lastEdited: '12d ago',
    },
    {
      id: 'app-3',
      name: 'Employee Portal',
      description: 'HR portal for leave requests.',
      lastEdited: '3d ago',
    },
    {
      id: 'app-4',
      name: 'E-commerce Frontend',
      description: 'Store with cart and checkout.',
      lastEdited: '5h ago',
    },
    {
      id: 'app-5',
      name: 'Inventory Tracker',
      description: 'Warehouse stock monitoring.',
      lastEdited: '1h ago',
    }
  ];

  // Mock Data - Sources with Tables
  const dataSources = [
    {
      id: 'src-1',
      name: 'nocoapp-db',
      type: 'PostgreSQL',
      lastEdited: '2d ago',
      tables: [
        { id: 'users', name: 'Users', kind: 'table', description: 'System users and roles' },
        { id: 'orders', name: 'Orders', kind: 'table', description: 'Customer orders transactions' },
        { id: 'products', name: 'Products', kind: 'table', description: 'Product catalog' },
        { id: 'inventory_logs', name: 'Inventory Logs', kind: 'table', description: 'Stock movement history' }
      ]
    },
    {
      id: 'src-2',
      name: 'production-analytics',
      type: 'MySQL',
      lastEdited: '5d ago',
      tables: [
          { id: 'audit_trail', name: 'Audit Trail', kind: 'table', description: 'System access logs' },
          { id: 'page_views', name: 'Page Views', kind: 'view', description: 'Daily aggregated views' },
          { id: 'events', name: 'Events', kind: 'table', description: 'Raw user interaction events' }
      ]
    }
  ];

  const activeSource = dataSources.find(s => s.id === activeSourceId) || dataSources[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto transition-colors">
      <div className="container max-w-[1600px] mx-auto py-8 px-6">
        
        {/* Hero / Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Welcome back, Developer</h1>
          <p className="text-muted-foreground text-base">Select an application or data source to start building.</p>
        </div>

        {/* Applications Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">All Applications</h2>
                  <Badge variant="secondary" className="text-xs font-normal bg-muted text-muted-foreground hover:bg-muted">{apps.length}</Badge>
              </div>
              
              <div className="flex items-center gap-3">
                  <div className="relative w-64 hidden sm:block">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search applications..." className="h-8 pl-8 text-xs bg-muted/30" />
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {apps.map(app => (
                  <div 
                    key={app.id} 
                    className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-md cursor-pointer h-[150px]"
                    onClick={() => handleAppClick(app.id)}
                  >
                    {/* Header */}
                    <div>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                {/* Icon Container */}
                                <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-500/10 transition-colors">
                                    <LayoutGrid size={18} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                {/* Name */}
                                <span className="font-medium text-sm text-foreground truncate max-w-[140px] leading-tight mt-1 group-hover:text-primary transition-colors">{app.name}</span>
                            </div>
                            
                            <div className="relative">
                                <button 
                                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuAppId(activeMenuAppId === app.id ? null : app.id);
                                        setActiveMenuTableId(null);
                                    }}
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {/* Action Menu Popover */}
                                {activeMenuAppId === app.id && (
                                    <div 
                                        ref={menuRef} 
                                        className="absolute right-0 top-6 w-48 bg-popover border border-border rounded-lg shadow-xl z-50 p-1 flex flex-col animate-in fade-in zoom-in-95 duration-100"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="px-3 py-2 hover:bg-muted rounded-md cursor-pointer" role="button">
                                            <span className="text-xs font-medium">Rename app</span>
                                        </div>
                                        <div className="px-3 py-2 hover:bg-muted rounded-md cursor-pointer" role="button">
                                            <span className="text-xs font-medium">Export app</span>
                                        </div>
                                        <div className="px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-destructive rounded-md cursor-pointer" role="button">
                                            <span className="text-xs font-medium">Delete app</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer / Stats */}
                    <div className="flex items-center justify-between mt-auto pt-3">
                        <div className="text-[11px] text-muted-foreground font-medium">
                             <span>Edited {app.lastEdited}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                            <Box size={11} />
                            <span>Application</span>
                        </div>
                    </div>
                  </div>
              ))}
              
              {/* New Application Placeholder Card */}
              <div 
                className="group relative flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 overflow-hidden hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer h-[150px]"
                onClick={() => navigate('/apps/new')}
              >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-background group-hover:shadow-sm transition-all">
                      <Plus size={20} className="text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Create New Application</span>
              </div>
          </div>
        </div>

        {/* Data Sources Section - Tabbed Interface */}
        <div>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Data Sources</h2>
                  <div className="h-4 w-px bg-border mx-2"></div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary">
                       <Plus size={12} /> New Source
                  </Button>
               </div>
               
               <div className="flex items-center gap-2">
                  <div className="relative w-48 hidden sm:block">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search tables..." className="h-8 pl-8 text-xs bg-muted/30" />
                  </div>
               </div>
            </div>

            {/* Tabs Header */}
            <div className="flex items-center border-b border-border mb-6 overflow-x-auto no-scrollbar">
                {dataSources.map(src => (
                    <button
                        key={src.id}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
                            activeSourceId === src.id 
                                ? "border-primary text-foreground" 
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        )}
                        onClick={() => setActiveSourceId(src.id)}
                    >
                        <Database size={14} className={cn(activeSourceId === src.id ? "text-primary" : "text-muted-foreground")} />
                        {src.name}
                        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 bg-muted/50 text-muted-foreground">
                            {src.tables.length}
                        </Badge>
                    </button>
                ))}
            </div>

            {/* Tab Content: Grid of Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeSource.tables.map(table => (
                    <div 
                        key={table.id} 
                        className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-md cursor-pointer h-[140px]"
                        onClick={() => handleTableClick(table.id)}
                    >
                        {/* Header */}
                        <div>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded flex items-center justify-center transition-colors",
                                        table.kind === 'view' ? "bg-purple-500/10" : "bg-orange-500/10"
                                    )}>
                                        {table.kind === 'view' ? (
                                            <Eye size={16} className="text-purple-600 dark:text-purple-400" />
                                        ) : (
                                            <Table size={16} className="text-orange-600 dark:text-orange-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-foreground truncate max-w-[140px] leading-tight group-hover:text-primary transition-colors">
                                            {table.name}
                                        </div>
                                        {/* Optional: Show table kind text if needed, or just rely on icon/description */}
                                    </div>
                                </div>
                                
                                <div className="relative">
                                    <button 
                                        className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuTableId(activeMenuTableId === table.id ? null : table.id);
                                            setActiveMenuAppId(null);
                                        }}
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {/* Action Menu Popover */}
                                    {activeMenuTableId === table.id && (
                                        <div 
                                            ref={menuRef} 
                                            className="absolute right-0 top-6 w-48 bg-popover border border-border rounded-lg shadow-xl z-50 p-1 flex flex-col animate-in fade-in zoom-in-95 duration-100"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="px-3 py-2 hover:bg-muted rounded-md cursor-pointer">
                                                <span className="text-xs font-medium">Rename table</span>
                                            </div>
                                            <div className="px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-destructive rounded-md cursor-pointer">
                                                <span className="text-xs font-medium">Delete table</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mt-2 mb-2">
                             <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {table.description || "No description provided."}
                             </p>
                        </div>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between mt-auto">
                            <div className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                                {table.id}
                            </div>
                            
                            <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                    </div>
                ))}

                {/* New Table Placeholder Card */}
                <div 
                    className="group relative flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/5 overflow-hidden hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer h-[140px]"
                    onClick={handleNewTableClick}
                >
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:bg-background group-hover:shadow-sm transition-all">
                        <Plus size={18} className="text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Create New Table</span>
                    <span className="text-xs text-muted-foreground/60 mt-1">in {activeSource.name}</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
