import React from 'react';
import { X } from 'lucide-react';
import { Tab, FileSystemNode } from '../../../types';

interface EditorProps {
  tabs: Tab[];
  activeTabId: string | null;
  activeFileContent: string;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onSelectTab: (id: string) => void;
  onContentChange: (content: string) => void;
}

const Editor: React.FC<EditorProps> = ({ 
  tabs, 
  activeTabId, 
  activeFileContent, 
  onCloseTab, 
  onSelectTab,
  onContentChange
}) => {
  
  // Simple line number generation
  const lines = activeFileContent.split('\n').length;
  const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col bg-ide-panel h-full overflow-hidden min-w-0">
      {/* Tab Bar */}
      <div className="flex bg-ide-bg overflow-x-auto scrollbar-hide border-b border-ide-border h-9">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`
              group flex items-center min-w-[120px] max-w-[200px] px-3 text-xs border-r border-ide-border cursor-pointer select-none
              ${activeTabId === tab.id ? 'bg-ide-panel text-white border-t-2 border-t-ide-accent' : 'bg-ide-bg text-gray-500 hover:bg-[#1f1f1f]'}
            `}
          >
            <span className="truncate flex-1 mr-2">{tab.title}</span>
            <button
              onClick={(e) => onCloseTab(tab.id, e)}
              className={`opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded p-0.5 ${activeTabId === tab.id ? 'opacity-100' : ''}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Editor Area */}
      {activeTabId ? (
        <div className="flex-1 flex relative overflow-hidden">
          {/* Line Numbers */}
          <div className="w-12 bg-ide-bg text-gray-600 text-right pr-3 pt-4 text-xs font-mono select-none border-r border-ide-border leading-6">
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              value={activeFileContent}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full h-full bg-ide-panel text-gray-300 font-mono text-sm p-4 pt-4 outline-none resize-none leading-6 whitespace-pre tab-4"
              spellCheck={false}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="mb-4 text-6xl opacity-20 font-bold">CS</div>
            <p className="text-sm">Select a file to start editing</p>
            <p className="text-xs mt-2 opacity-60">Use ⌘+P to search files</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;