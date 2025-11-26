
import React, { useState, useRef } from 'react';
import { Search as SearchIcon, Bell, Moon, Sun, HelpCircle, Blocks, Palette, Check, Triangle, Database, MessageSquare, Code, LogOut, User } from 'lucide-react';
import Breadcrumb from '../common/Breadcrumb';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAppStore, AppTheme } from '../../store/useAppStore';
import Dropdown from '../common/Dropdown';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { activeView, isDarkMode, toggleTheme, theme, setAppTheme } = useAppStore();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLDivElement>(null);

  const themes: { id: AppTheme; label: string; icon: any }[] = [
    { id: 'vercel', label: 'Vercel', icon: Triangle },
    { id: 'supabase', label: 'Supabase', icon: Database },
    { id: 'slack', label: 'Slack', icon: MessageSquare },
    { id: 'vscode', label: 'VS Code', icon: Code },
  ];

  const profileItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'logout', label: 'Log out', icon: LogOut },
  ];

  const handleProfileSelect = (item: any) => {
      if (item.id === 'logout') {
          navigate('/login');
      }
      setIsProfileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between pr-4">
        {/* Left: Logo & Context Navigation */}
        <div className="flex items-center">
          {/* Logo - Icon aligned with ActivityBar (w-14) */}
          <div className="w-14 h-14 flex items-center justify-center shrink-0">
            <Blocks size={24} className="text-primary" strokeWidth={2} />
          </div>

          {/* Breadcrumb */}
          <div className="pl-2">
            <Breadcrumb />
          </div>
        </div>

        {/* Right: Tools & Profile */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center w-64 mr-2 relative">
            <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input 
              className="h-8 pl-8 text-xs bg-muted/50 border-input focus-visible:ring-1 focus-visible:ring-offset-0" 
              placeholder="Search... (⌘K)" 
            />
          </div>

          <div className="relative">
            <Button 
                ref={themeButtonRef}
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setIsThemeOpen(!isThemeOpen)}
            >
                <Palette size={18} />
            </Button>
            
            <Dropdown 
                open={isThemeOpen}
                onOpenChange={setIsThemeOpen}
                anchorRef={themeButtonRef}
                triggerLabel=""
                className="hidden" // Hidden trigger because we use the button above
                items={themes.map(t => ({
                    id: t.id,
                    label: t.label,
                    icon: t.icon,
                    group: 'Themes'
                }))}
                onSelect={(item) => setAppTheme(item.id as AppTheme)}
                width={180}
                selectedId={theme}
                searchPlaceholder="Select theme..."
            />
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <HelpCircle size={18} />
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Bell size={18} />
          </Button>

          <Button
            variant="ghost" 
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>

          <div className="h-5 w-px bg-border mx-1"></div>

          <div className="relative">
            <div 
                ref={profileButtonRef}
                className="w-8 h-8 bg-gradient-to-tr from-primary to-purple-500 rounded-full cursor-pointer ring-offset-background transition-all hover:ring-2 ring-ring"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
                <div className="w-full h-full flex items-center justify-center text-primary-foreground text-xs font-bold select-none">JD</div>
            </div>

            <Dropdown 
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                anchorRef={profileButtonRef}
                triggerLabel=""
                className="hidden" 
                items={profileItems}
                onSelect={handleProfileSelect}
                width={160}
                searchPlaceholder=""
                align="end"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
