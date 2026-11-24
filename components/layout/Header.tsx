import React from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import Breadcrumb from '../common/Breadcrumb';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useCommandPalette } from './CommandPaletteModal';

const Header: React.FC = () => {
  const searchQuery = useWorkspaceStore((s) => s.searchQuery);
  const setSearchQuery = useWorkspaceStore((s) => s.setSearchQuery);
  const { openPalette } = useCommandPalette();

  return (
    <header className="h-13 w-full border-b border-border bg-background/95 backdrop-blur-xs flex items-center justify-between gap-4 px-5 shrink-0 z-20">
      {/* Left Breadcrumb */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <Breadcrumb />
      </div>

      {/* Center Search Box (Ctrl K Command Palette trigger) */}
      <div className="flex-none w-full max-w-[400px] hidden sm:block">
        <div className="relative flex items-center h-9 rounded-lg border border-input bg-card shadow-[var(--shadow-control)] hover:border-[hsl(var(--border-strong))] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:shadow-[var(--shadow-focus-halo)] transition-all duration-150 px-3">
          <SearchIcon size={15} className="text-muted-foreground shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索家族..."
            className="flex-1 bg-transparent text-[13px] font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none min-w-0"
            data-testid="nc-ws-home-topbar-search"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-muted-foreground hover:text-foreground mr-1.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="清空搜索"
              aria-label="清空搜索"
            >
              <X size={13} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openPalette(searchQuery || undefined)}
            title="打开全局命令面板 (Ctrl K)"
            className="px-1.5 py-0.5 text-[12px] leading-none font-medium font-mono text-muted-foreground bg-[hsl(var(--surface-subtle))] rounded border border-border shrink-0 hover:text-foreground hover:border-[hsl(var(--border-strong))] transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ctrl K
          </button>
        </div>
      </div>

      {/* Right Spacer / Mobile Search Button */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => openPalette()}
          className="sm:hidden h-8 w-8 rounded-lg border border-input bg-card shadow-[var(--shadow-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-[hsl(var(--border-strong))] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="搜索 (Ctrl K)"
          aria-label="打开快速搜索"
        >
          <SearchIcon size={15} />
        </button>
      </div>
    </header>
  );
};

export default Header;