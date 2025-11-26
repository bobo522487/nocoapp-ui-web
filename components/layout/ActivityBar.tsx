import React from 'react';
import { Home, LayoutGrid, Database, Settings } from 'lucide-react';
import { Button } from "../ui/button";
import { useNavigate, useLocation } from 'react-router-dom';

const ActivityBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isActive = (route: string) => {
      if (route === '/' && path === '/') return true;
      if (route !== '/' && path.startsWith(route)) return true;
      return false;
  };

  const icons = [
    { route: '/', icon: Home, label: '首页' },
    { route: '/apps', icon: LayoutGrid, label: '应用' },
    { route: '/data', icon: Database, label: '数据' },
  ];

  return (
    <div className="w-14 flex flex-col items-center py-4 bg-muted/40 border-r border-border text-muted-foreground z-20 select-none transition-colors">
      {icons.map((item) => (
        <Button
          key={item.route}
          title={item.label}
          onClick={() => navigate(item.route)}
          variant={isActive(item.route) ? "secondary" : "ghost"}
          size="icon"
          className={`mb-4 w-10 h-10 ${isActive(item.route) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <item.icon size={20} strokeWidth={1.5} />
        </Button>
      ))}
      
      <div className="flex-1" />
      
      <Button 
        variant={isActive('/files') ? "secondary" : "ghost"} 
        size="icon"
        onClick={() => navigate('/files')}
        className={`w-10 h-10 mb-2 ${isActive('/files') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Settings size={20} strokeWidth={1.5} />
      </Button>
    </div>
  );
};

export default ActivityBar;