
import React from 'react';
import { ChevronRight, ChevronDown, File as FileIcon, Folder as FolderIcon, FolderOpen, X } from 'lucide-react';
import { FileSystemNode, FileType, ViewMode } from '../../types';
import PagesPanel from '../../features/app-builder/components/PagesPanel';
import TablePanel from '../../features/data-modeler/components/TablePanel';
import { useAppStore } from '../../store/useAppStore';

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
          isSelected ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
        className="flex items-center py-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 select-none transition-colors rounded-sm mx-1"
        style={{ paddingLeft }}
      >
        <span className="mr-1 opacity-70">
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
  files: FileSystemNode[];
  onToggleFolder: (id: string) => void;
  onSelectFile: (node: FileSystemNode) => void;
  selectedFileId: string | null;
  width: number;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  files, 
  onToggleFolder, 
  onSelectFile, 
  selectedFileId, 
  width
}) => {
  const { activeView } = useAppStore();
  
  const renderContent = () => {
    switch (activeView) {
      case ViewMode.APPS:
        return <PagesPanel />;
      case ViewMode.DATA:
        return <TablePanel />;
      case ViewMode.HOME:
        return null;
      case ViewMode.SETTINGS:
      default:
         return (
             <div className="flex flex-col h-full">
                 <div className="h-9 px-4 border-b border-border flex items-center shrink-0 bg-muted/10">
                     <span className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Explorer</span>
                 </div>
                 <div className="flex-1 overflow-y-auto py-2">
                     {files.map((node) => (
                         <FileTree
                             key={node.id}
                             node={node}
                             depth={0}
                             onToggleFolder={onToggleFolder}
                             onSelectFile={onSelectFile}
                             selectedFileId={selectedFileId}
                         />
                     ))}
                 </div>
             </div>
         );
    }
  };

  return (
    <div 
      style={{ width }}
      className="flex flex-col bg-muted/5 h-full shrink-0 transition-colors relative z-20 overflow-hidden border-r border-border"
    >
      {renderContent()}
    </div>
  );
};

export default Sidebar;
