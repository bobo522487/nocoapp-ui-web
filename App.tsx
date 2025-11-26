import React, { useState, useCallback, useEffect } from 'react';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import DataGrid from './components/DataGrid';
import Header from './components/Header';
import AppBuilder from './components/AppBuilder';
import HomeDashboard from './components/HomeDashboard';
import { INITIAL_FILES } from './constants';
import { FileSystemNode, FileType, ViewMode, Tab, SchemaField } from './types';
import { useResizable } from './hooks/useResizable';
import { ColumnDef } from './components/DataTable';

const MOCK_SCHEMA: SchemaField[] = [
  { id: 'id', name: 'ID', type: 'serial', defaultValue: 'auto-inc', isPrimary: true, isUnique: true, isNullable: false, width: 60 },
  { id: 'name', name: 'Name', type: 'varchar', defaultValue: '', isPrimary: false, isUnique: false, isNullable: false, width: 200, flex: true },
  { id: 'email', name: 'Email', type: 'varchar', defaultValue: '', isPrimary: false, isUnique: true, isNullable: true, width: 250, flex: true },
  { id: 'role', name: 'Role', type: 'varchar', defaultValue: 'Viewer', isPrimary: false, isUnique: false, isNullable: false, width: 140 },
  { id: 'status', name: 'Status', type: 'varchar', defaultValue: 'Active', isPrimary: false, isUnique: false, isNullable: false, width: 120 },
  { id: 'created', name: 'Created At', type: 'date with time', defaultValue: 'now()', isPrimary: false, isUnique: false, isNullable: false, width: 180 },
];

const MOCK_DATA: any[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', created: '2023-10-01' },
  { id: 2, name: 'Jane Smith', email: 'jane@company.com', role: 'Editor', status: 'Active', created: '2023-10-02' },
];

// Simple column generator for App.tsx example
const generateColumns = (schema: SchemaField[]): ColumnDef<any>[] => schema.map(field => ({
    id: field.id,
    header: field.name,
    accessorKey: field.id,
    width: field.flex ? undefined : field.width,
    flex: field.flex,
    minWidth: 100,
}));

const App: React.FC = () => {
  // State
  const [files, setFiles] = useState<FileSystemNode[]>(INITIAL_FILES);
  const [activeView, setActiveView] = useState<ViewMode>(ViewMode.HOME); // Default to HOME
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Data View State
  const [activeTable, setActiveTable] = useState<string>('users');

  // Use custom hook for Left Sidebar Resizing
  const { 
    width: sidebarWidth, 
    isResizing: isResizingSidebar, 
    startResizing: startResizingSidebar 
  } = useResizable({
    initialWidth: 260,
    minWidth: 180,
    maxWidth: 480,
    edge: 'left',
    leftOffset: 56 // Width of ActivityBar
  });

  // Initialize Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Helper to find node by ID (recursive)
  const findNode = useCallback((nodes: FileSystemNode[], id: string): FileSystemNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper to update node (recursive)
  const updateNode = (nodes: FileSystemNode[], id: string, updates: Partial<FileSystemNode>): FileSystemNode[] => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, ...updates };
      if (node.children) return { ...node, children: updateNode(node.children, id, updates) };
      return node;
    });
  };

  // Actions
  const handleToggleFolder = (id: string) => {
    const node = findNode(files, id);
    if (node && node.type === FileType.FOLDER) {
      setFiles(prev => updateNode(prev, id, { isOpen: !node.isOpen }));
    }
  };

  const handleSelectFile = (node: FileSystemNode) => {
    if (node.type === FileType.FILE) {
      // Check if tab already exists
      const existingTab = tabs.find(t => t.fileId === node.id);
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTab: Tab = {
          id: `tab-${node.id}`,
          fileId: node.id,
          title: node.name
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        // Activate the tab to the left, or the first one
        const newActiveIndex = Math.max(0, tabIndex - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!activeTabId) return;
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) {
        setFiles(prev => updateNode(prev, currentTab.fileId, { content: newContent }));
    }
  };

  // Derived state for editor
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeFileNode = activeTab ? findNode(files, activeTab.fileId) : null;
  const activeContent = activeFileNode?.content || '';

  return (
    <div className={`flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-200 ${isResizingSidebar ? 'cursor-col-resize select-none' : ''}`}>
      
      <Header 
        activeView={activeView} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar activeView={activeView} setActiveView={setActiveView} />
        
        {/* Sidebar and Resizer - Hidden on Home View */}
        {activeView !== ViewMode.HOME && (
          <>
            <Sidebar 
                activeView={activeView} 
                files={files} 
                onToggleFolder={handleToggleFolder} 
                onSelectFile={handleSelectFile}
                selectedFileId={activeTab?.fileId || null}
                width={sidebarWidth}
                activeTable={activeTable}
                onTableSelect={setActiveTable}
            />
            {/* Sidebar Resizer */}
            <div
                className="w-[1px] bg-border hover:bg-primary cursor-col-resize z-50 relative transition-colors"
                onMouseDown={startResizingSidebar}
            >
               {/* Invisible Hit Area */}
               <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize z-50" />
            </div>
          </>
        )}
        
        {/* Content Area */}
        <main className="flex-1 flex overflow-hidden relative bg-background min-w-0">
            {activeView === ViewMode.HOME ? (
                <HomeDashboard setActiveView={setActiveView} />
            ) : activeView === ViewMode.APPS ? (
                <AppBuilder />
            ) : activeView === ViewMode.DATA ? (
                <DataGrid 
                  title={activeTable} 
                  columns={generateColumns(MOCK_SCHEMA)}
                  data={MOCK_DATA}
                />
            ) : (
                <Editor 
                    tabs={tabs}
                    activeTabId={activeTabId}
                    activeFileContent={activeContent}
                    onCloseTab={handleCloseTab}
                    onSelectTab={setActiveTabId}
                    onContentChange={handleContentChange}
                />
            )}
        </main>
      </div>
    </div>
  );
};

export default App;