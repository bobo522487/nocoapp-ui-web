import React from 'react';
import { Home, LayoutGrid, Database, Settings } from 'lucide-react';
import { ViewMode } from '../types';

interface ActivityBarProps {
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, setActiveView }) => {
  const icons = [
    { id: ViewMode.HOME, icon: Home, label: '首页' },
    { id: ViewMode.APPS, icon: LayoutGrid, label: '应用' },
    { id: ViewMode.DATA, icon: Database, label: '数据' },
  ];

  return (
    <div className="w-14 flex flex-col items-center py-4 bg-muted/40 border-r border-border text-muted-foreground z-20 select-none transition-colors">
      {icons.map((item) => (
        <div
          key={item.id}
          title={item.label}
          onClick={() => setActiveView(item.id)}
          className={`group w-10 h-10 mb-4 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all relative hover:bg-accent hover:text-accent-foreground ${
            activeView === item.id ? 'bg-accent text-primary shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <item.icon size={20} strokeWidth={1.5} />
        </div>
      ))}
      
      <div className="flex-1" />
      
      <div className="w-10 h-10 flex items-center justify-center mb-2 cursor-pointer text-muted-foreground hover:text-accent-foreground rounded-lg hover:bg-accent transition-colors">
        <Settings size={20} strokeWidth={1.5} />
      </div>
    </div>
  );
};

export default ActivityBar;