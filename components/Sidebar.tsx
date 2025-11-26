import React from 'react';
import { ChevronRight, ChevronDown, File as FileIcon, Folder as FolderIcon, FolderOpen, X } from 'lucide-react';
import { FileSystemNode, FileType, ViewMode } from '../types';
import PagesPanel from './PagesPanel';
import TablePanel from './TablePanel';

// --- File Tree Component (Used in other views if needed) ---
interface FileTreeProps {
  node: FileSystemNode;
  depth: number;
  onToggleFolder: (id: string) => void;
  onSelectFile: (node: FileSystemNode) => void;
  selectedFileId: string | null;
}

const FileTree: React.FC<FileTreeProps> = ({ node, depth, onToggleFolder, onSelectFile, selectedFileId }) => {
  const isSelected = node.id === selectedFileId;
  const paddingLeft = `${depth * 12 + 12}px`;

  if (node.type === FileType.FILE) {
    return (
      <div
        onClick={() => onSelectFile(node)}
        className={`flex items-center py-1.5 cursor-pointer text-sm select-none transition-colors rounded-sm mx-1 ${
          isSelected ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground hover:bg-accent/50'
        }`}
        style={{ paddingLeft }}
      >
        <FileIcon size={14} className="mr-2 text-blue-500" />
        <span>{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => onToggleFolder(node.id)}
        className="flex items-center py-1.5 cursor-pointer text-sm text-foreground hover:bg-accent/50 select-none transition-colors rounded-sm mx-1"
        style={{ paddingLeft }}
      >
        <span className="mr-1 text-muted-foreground">
           {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {node.isOpen ? (
          <FolderOpen size={14} className="mr-2 text-yellow-500" />
        ) : (
          <FolderIcon size={14} className="mr-2 text-yellow-500" />
        )}
        <span className="font-medium">{node.name}</span>
      </div>
      {node.isOpen &&
        node.children?.map((child) => (
          <FileTree
            key={child.id}
            node={child}
            depth={depth + 1}
            onToggleFolder={onToggleFolder}
            onSelectFile={onSelectFile}
            selectedFileId={selectedFileId}
          />
        ))}
    </div>
  );
};

// --- Main Sidebar Container ---
interface SidebarProps {
  activeView: ViewMode;
  files: FileSystemNode[];
  onToggleFolder: (id: string) => void;
  onSelectFile: (node: FileSystemNode) => void;
  selectedFileId: string | null;
  width: number;
  // Data View Props
  activeTable?: string;
  onTableSelect?: (tableId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  files, 
  onToggleFolder, 
  onSelectFile, 
  selectedFileId, 
  width,
  activeTable,
  onTableSelect
}) => {
  
  const renderContent = () => {
    switch (activeView) {
      case ViewMode.APPS:
        return <PagesPanel />;
      case ViewMode.DATA:
        return <TablePanel activeTable={activeTable} onTableSelect={onTableSelect} />;
      default:
        return (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-sm">
               <div className="mb-2"><X size={24} /></div>
               <span>暂无内容</span>
            </div>
          );
    }
  };

  return (
    <div 
      style={{ width }}
      className="flex flex-col bg-card h-full shrink-0 transition-colors relative z-20 overflow-hidden"
    >
      {renderContent()}
    </div>
  );
};

export default Sidebar;