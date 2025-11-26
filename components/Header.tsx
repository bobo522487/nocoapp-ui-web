import React from 'react';
import { Search as SearchIcon, Bell, Moon, Sun, HelpCircle, Blocks } from 'lucide-react';
import Breadcrumb from './Breadcrumb';
import { ViewMode } from '../types';

interface HeaderProps {
  activeView: ViewMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, isDarkMode, toggleTheme }) => {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card shrink-0 z-30 transition-colors">
      {/* Left: Logo & Context Navigation */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 select-none cursor-pointer group">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors">
            <Blocks size={24} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground font-sans">
            NOCO <span className="text-blue-600 dark:text-blue-400">APP</span>
          </span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border"></div>

        {/* Breadcrumb */}
        <Breadcrumb activeView={activeView} />
      </div>

      {/* Right: Tools & Profile */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center bg-muted/50 rounded-md px-3 py-1.5 w-64 border border-input focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20 transition-all group">
          <SearchIcon size={14} className="text-muted-foreground group-focus-within:text-foreground mr-2" />
          <input 
            className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-muted-foreground" 
            placeholder="Search... (⌘K)" 
          />
        </div>

        <button className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-accent hover:text-accent-foreground">
          <HelpCircle size={18} />
        </button>

        <button className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-accent hover:text-accent-foreground">
          <Bell size={18} />
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="h-5 w-px bg-border mx-1"></div>

        <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full cursor-pointer hover:ring-2 ring-offset-2 ring-ring ring-offset-background transition-all">
          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">JD</div>
        </div>
      </div>
    </header>
  );
};

export default Header;