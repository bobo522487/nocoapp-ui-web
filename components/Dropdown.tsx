import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  group?: string;
}

interface DropdownProps {
  triggerLabel: React.ReactNode;
  triggerIcon?: React.ElementType;
  items: DropdownItem[];
  selectedId?: string;
  onSelect: (item: DropdownItem) => void;
  searchPlaceholder?: string;
  width?: number;
  footer?: React.ReactNode;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  triggerLabel,
  triggerIcon: Icon,
  items,
  selectedId,
  onSelect,
  searchPlaceholder = "Search...",
  width = 288,
  footer,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
    setSearchTerm('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const filteredItems = items.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    const group = item.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, DropdownItem[]>);

  const DropdownContent = (
    <div 
      ref={dropdownRef}
      className="fixed z-[100] bg-white dark:bg-[#1e1e1e] border border-ide-border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      style={{ 
        top: position.top, 
        left: position.left,
        width: width
      }}
    >
      {/* Search */}
      <div className="flex items-center px-3 border-b border-ide-border">
        <Search size={14} className="shrink-0 opacity-50 text-ide-text" />
        <input 
          className="flex h-9 w-full rounded-md bg-transparent py-3 px-2 text-sm outline-none placeholder-gray-400 dark:placeholder-gray-600 border-none focus:ring-0 text-ide-text" 
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* List */}
      <div className="max-h-[300px] overflow-y-auto p-1">
        {Object.entries(groupedItems).map(([group, groupItems]: [string, DropdownItem[]]) => (
          <div key={group}>
             {group !== 'General' && (
                <div className="px-2 py-1.5 text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group}
                </div>
             )}
             {groupItems.map(item => (
               <div 
                 key={item.id}
                 onClick={(e) => {
                   e.stopPropagation();
                   onSelect(item);
                   setIsOpen(false);
                 }}
                 className={`relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none cursor-pointer select-none transition-colors ${
                   selectedId === item.id 
                   ? 'bg-gray-100 dark:bg-[#2b2b2b] text-ide-text' 
                   : 'text-ide-text hover:bg-gray-100 dark:hover:bg-[#2b2b2b]'
                 }`}
               >
                 {item.icon && <item.icon size={14} className="text-gray-400" />}
                 <span className="flex-1 truncate">{item.label}</span>
                 {selectedId === item.id && <Check size={14} className="text-blue-500" />}
               </div>
             ))}
          </div>
        ))}
        {filteredItems.length === 0 && (
            <div className="px-2 py-4 text-center text-xs text-gray-500">No results found</div>
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div className="border-t border-ide-border p-1">
           {footer}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div 
        ref={triggerRef}
        onClick={toggleDropdown}
        className={`flex items-center gap-2 hover:bg-ide-hover px-2 py-1.5 rounded cursor-pointer transition-colors group select-none ${
            isOpen ? 'bg-ide-hover' : ''
        } ${className}`}
      >
         {Icon && <Icon size={16} className="text-gray-500 dark:text-gray-400" />}
         <span className="text-sm font-medium text-ide-text truncate max-w-[150px]">{triggerLabel}</span>
         <ChevronDown size={14} className="text-gray-400 group-hover:text-ide-text shrink-0" />
      </div>
      {isOpen && createPortal(DropdownContent, document.body)}
    </>
  );
};

export default Dropdown;