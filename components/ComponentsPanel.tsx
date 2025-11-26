import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  MousePointerClick,
  Table,
  FileText,
  TextCursor,
  CalendarClock,
  Type,
  ToggleLeft,
  MessageSquare,
  AppWindow,
  Box,
  GalleryHorizontal,
  List,
  Calendar,
  Kanban,
  BarChart3,
  LayoutGrid,
  GripVertical
} from 'lucide-react';

// --- Config Data ---
const SECTIONS = [
  {
    title: "Commonly used",
    items: [
      { name: "Button", icon: MousePointerClick, isNew: false },
      { name: "Table", icon: Table, isNew: false },
      { name: "Form", icon: FileText, isNew: false },
      { name: "Text Input", icon: TextCursor, isNew: false },
      { name: "Date Time Picker", icon: CalendarClock, isNew: true },
      { name: "Text", icon: Type, isNew: false },
    ]
  },
  {
    title: "Buttons",
    items: [
      { name: "Button", icon: MousePointerClick, isNew: false },
      { name: "Button Group", icon: ToggleLeft, isNew: false },
      { name: "Popover Menu", icon: MessageSquare, isNew: true },
    ]
  },
  {
    title: "Data",
    items: [
      { name: "Table", icon: Table, isNew: false },
      { name: "Chart", icon: BarChart3, isNew: false },
      { name: "List View", icon: List, isNew: false },
    ]
  },
  {
    title: "Layouts",
    items: [
      { name: "Form", icon: FileText, isNew: false },
      { name: "Modal", icon: AppWindow, isNew: true },
      { name: "Container", icon: Box, isNew: false },
      { name: "Tabs", icon: GalleryHorizontal, isNew: false },
      { name: "List View", icon: List, isNew: false },
      { name: "Calendar", icon: Calendar, isNew: false },
      { name: "Kanban", icon: Kanban, isNew: false },
    ]
  }
];

interface ComponentsPanelProps {
    onClose: () => void;
}

const ComponentsPanel: React.FC<ComponentsPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'components' | 'modules'>('components');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Commonly used": true, "Buttons": true, "Data": true, "Layouts": true });

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex flex-col h-full bg-ide-sidebar animate-in slide-in-from-left-4 duration-200">
      {/* Header Tabs */}
      <div className="flex items-center p-3 pb-0 border-b border-ide-border shrink-0">
         <div className="flex-1 flex gap-4">
            <button 
                onClick={() => setActiveTab('components')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'components' 
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                    : 'text-gray-500 border-transparent hover:text-ide-text'
                }`}
            >
                Components
            </button>
            <button 
                onClick={() => setActiveTab('modules')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'modules' 
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                    : 'text-gray-500 border-transparent hover:text-ide-text'
                }`}
            >
                Modules
            </button>
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] scrollbar-track-transparent p-3">
        
        {/* Search Bar */}
        <div className="mb-4">
           <div className="relative group">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search components" 
               className="w-full pl-9 pr-3 py-1.5 bg-gray-100 dark:bg-[#151515] border border-transparent focus:border-blue-500 rounded text-xs text-ide-text outline-none transition-all placeholder-gray-500"
             />
           </div>
        </div>

        {activeTab === 'components' ? (
            /* Components Tab */
            <div className="space-y-1">
                {SECTIONS.map((section) => (
                    <div key={section.title} className="border-b border-transparent">
                        <button 
                            onClick={() => toggleSection(section.title)}
                            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors group"
                        >
                            <span>{section.title}</span>
                            {openSections[section.title] ? (
                                <ChevronDown size={12} className="text-gray-400 group-hover:text-blue-600" />
                            ) : (
                                <ChevronRight size={12} className="text-gray-400 group-hover:text-blue-600" />
                            )}
                        </button>
                        
                        {openSections[section.title] && (
                            <div className="grid grid-cols-3 gap-2 pb-3 animate-in fade-in zoom-in-95 duration-150">
                                {section.items.map((item, idx) => (
                                    <div 
                                        key={`${section.title}-${idx}`}
                                        draggable
                                        onDragEnd={onClose}
                                        className="flex flex-col items-center justify-center p-2 rounded border border-transparent hover:bg-ide-hover hover:border-ide-border cursor-grab active:cursor-grabbing transition-all group relative"
                                    >
                                        <div className="w-10 h-10 flex items-center justify-center mb-1 relative bg-gray-50 dark:bg-[#1a1a1a] rounded-md group-hover:bg-white dark:group-hover:bg-[#252525] transition-colors border border-transparent group-hover:border-gray-200 dark:group-hover:border-[#333]">
                                            <item.icon size={20} strokeWidth={1.5} className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                            {item.isNew && (
                                                <span className="absolute -top-1 -right-1 text-[8px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 rounded-sm font-bold">New</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-600 dark:text-gray-400 text-center leading-tight group-hover:text-ide-text mt-1">
                                            {item.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            /* Modules Tab */
            <div className="space-y-3">
                {[
                    { id: 1, title: '111', icon: LayoutGrid },
                    { id: 2, title: '1', icon: GripVertical }
                ].map((mod) => (
                    <div 
                        key={mod.id} 
                        draggable 
                        onDragEnd={onClose}
                        className="flex items-center p-2 rounded border border-transparent hover:bg-ide-hover hover:border-ide-border cursor-grab active:cursor-grabbing transition-all group"
                    >
                        <div className="w-12 h-10 flex items-center justify-center bg-gray-50 dark:bg-[#151515] rounded mr-3 group-hover:bg-white dark:group-hover:bg-[#252525] transition-colors">
                             <mod.icon size={20} strokeWidth={1.5} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{mod.title}</span>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};

export default ComponentsPanel;