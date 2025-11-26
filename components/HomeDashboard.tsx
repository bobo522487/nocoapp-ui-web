import React from 'react';
import { LayoutGrid, Database, Plus, MoreHorizontal, Pencil, Play } from 'lucide-react';
import { ViewMode } from '../types';

interface HomeDashboardProps {
  setActiveView: (view: ViewMode) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ setActiveView }) => {
  // Mock Data
  const apps = [
    {
      id: 'app-1',
      name: 'Order Management System',
      description: 'Internal tool for managing customer orders and inventory.',
      lastEdited: '15 days ago',
      color: 'bg-blue-500',
      pages: ['Dashboard', 'Orders', 'Customers', 'Inventory']
    },
    {
      id: 'app-2',
      name: 'CRM Dashboard',
      description: 'Customer relationship management and tracking.',
      lastEdited: '12 days ago',
      color: 'bg-purple-500',
      pages: ['Leads', 'Opportunities', 'Contacts', 'Reports']
    },
    {
      id: 'app-3',
      name: 'Employee Portal',
      description: 'HR portal for leave requests and payslips.',
      lastEdited: '3 days ago',
      color: 'bg-green-500',
      pages: ['Home', 'Profile', 'Leave Request']
    }
  ];

  const dataSources = [
    {
      id: 'src-1',
      name: 'nocoapp-db',
      type: 'PostgreSQL',
      lastEdited: '2 days ago',
      color: 'bg-orange-500',
      tables: ['users', 'orders', 'products', 'inventory_logs']
    },
    {
      id: 'src-2',
      name: 'production-analytics',
      type: 'MySQL',
      lastEdited: '5 days ago',
      color: 'bg-indigo-500',
      tables: ['audit_trail', 'page_views', 'events']
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20 overflow-y-auto p-8 transition-colors">
      
      {/* Hero / Welcome Section */}
      <div className="max-w-6xl mx-auto w-full mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome back, Developer</h1>
        <p className="text-muted-foreground">Select an application or data source to start building.</p>
      </div>

      {/* Applications Section */}
      <div className="max-w-6xl mx-auto w-full mb-12">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <LayoutGrid className="text-muted-foreground" size={20} />
                <h2 className="text-xl font-semibold text-foreground">Applications</h2>
            </div>
            <button 
                onClick={() => setActiveView(ViewMode.APPS)}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
                New Application <Plus size={16} />
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map(app => (
                <div key={app.id} className="bg-card text-card-foreground rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col p-6">
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-lg ${app.color} bg-opacity-10 flex items-center justify-center text-white shadow-sm ring-1 ring-black/5`}>
                            <LayoutGrid size={20} className={app.color.replace('bg-', 'text-')} />
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-all duration-200">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    {/* Title */}
                    <h3 
                        className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors cursor-pointer tracking-tight" 
                        onClick={() => setActiveView(ViewMode.APPS)}
                    >
                        {app.name}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {app.description}
                    </p>
                    
                    {/* Meta Info */}
                    <div className="text-xs text-muted-foreground mb-6 font-medium">
                        Edited {app.lastEdited}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button 
                            onClick={() => setActiveView(ViewMode.APPS)}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium py-2 px-4 rounded-md transition-colors shadow-sm"
                        >
                            <Pencil size={14} /> Edit
                        </button>
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            <Play size={14} className="opacity-80" /> Launch
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Data Sources Section */}
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <Database className="text-muted-foreground" size={20} />
                <h2 className="text-xl font-semibold text-foreground">Data Sources</h2>
            </div>
            <button 
                onClick={() => setActiveView(ViewMode.DATA)}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
                Connect Data <Plus size={16} />
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSources.map(src => (
                <div key={src.id} className="bg-card text-card-foreground rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col p-6">
                    <div className="flex items-start justify-between mb-4">
                         <div className={`w-10 h-10 rounded-lg ${src.color} bg-opacity-10 flex items-center justify-center text-white shadow-sm ring-1 ring-black/5`}>
                            <Database size={20} className={src.color.replace('bg-', 'text-')} />
                         </div>
                         <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-all duration-200">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                    
                    <h3 
                         className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors cursor-pointer tracking-tight"
                         onClick={() => setActiveView(ViewMode.DATA)}
                    >
                        {src.name}
                    </h3>
                    
                    <div className="text-sm text-muted-foreground mb-4">
                        <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium">{src.type}</span>
                    </div>

                    <div className="text-xs text-muted-foreground mb-6 font-medium">
                        Edited {src.lastEdited}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button 
                            onClick={() => setActiveView(ViewMode.DATA)}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium py-2 px-4 rounded-md transition-colors shadow-sm"
                        >
                            <Pencil size={14} /> Edit
                        </button>
                        <button 
                             className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            <Database size={14} /> View
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
};

export default HomeDashboard;