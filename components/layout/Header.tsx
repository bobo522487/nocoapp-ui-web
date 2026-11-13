import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search as SearchIcon, X, Table, LayoutGrid, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../common/Breadcrumb';
import { ProjectColoredIcon, AppColoredIcon } from '../common/NocoIcons';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useDataStore } from '../../store/useDataStore';
import { useBuilderStore } from '../../store/useBuilderStore';
import { useRouteContext } from '../../hooks/useRouteContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isWorkspaceShell } = useRouteContext();

  const searchQuery = useWorkspaceStore((s) => s.searchQuery);
  const setSearchQuery = useWorkspaceStore((s) => s.setSearchQuery);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const apps = useWorkspaceStore((s) => s.apps);
  const tables = useDataStore((s) => s.tables);
  const pages = useBuilderStore((s) => s.pages);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const workspaceProjects = projects.filter(
    (p) => p.workspaceId === activeWorkspaceId
  );
  const workspaceApps = apps.filter((a) => a.workspaceId === activeWorkspaceId);

  const q = paletteQuery.trim().toLowerCase();
  const matchedProjects = workspaceProjects.filter((p) =>
    p.name.toLowerCase().includes(q)
  );
  const matchedApps = workspaceApps.filter((a) =>
    a.name.toLowerCase().includes(q)
  );
  const matchedTables = tables.filter((t) =>
    t.name.toLowerCase().includes(q)
  );
  const matchedPages = pages.filter(
    (p) => p.type === 'page' && p.name.toLowerCase().includes(q)
  );

  return (
    <>
      <header className="h-14 w-full border-b border-border bg-background flex items-center justify-between gap-3 px-4 shrink-0 z-20">
        {/* Left Breadcrumb */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Breadcrumb />
        </div>

        {/* Center Search Box (NocoDB Ctrl K style) */}
        <div className="flex-none w-full max-w-[420px] hidden sm:block">
          <div className="relative flex items-center h-9 rounded-lg border border-input bg-background shadow-[var(--shadow-control)] hover:border-[hsl(var(--border-strong))] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-150 px-2.5">
            <SearchIcon size={15} className="text-muted-foreground shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={isWorkspaceShell ? searchQuery : ''}
              onChange={(e) => {
                if (isWorkspaceShell) {
                  setSearchQuery(e.target.value);
                } else {
                  setPaletteQuery(e.target.value);
                  setIsPaletteOpen(true);
                }
              }}
              onFocus={() => {
                if (!isWorkspaceShell) {
                  setIsPaletteOpen(true);
                }
              }}
              placeholder={isWorkspaceShell ? '搜索多个项目' : '快速跳转项目、应用或数据表'}
              className="flex-1 bg-transparent text-[13px] font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none min-w-0"
              data-testid="nc-ws-home-topbar-search"
            />
            {isWorkspaceShell && searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-muted-foreground hover:text-foreground mr-1 rounded"
                title="清空搜索"
              >
                <X size={13} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="px-1.5 py-0.5 text-[11px] font-medium font-mono text-muted-foreground bg-[hsl(var(--surface-subtle))] rounded border border-border shrink-0 hover:text-foreground hover:border-[hsl(var(--border-strong))] transition-colors"
            >
              Ctrl K
            </button>
          </div>
        </div>

        {/* Right Spacer / Mobile Search Button */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="sm:hidden h-8 w-8 rounded-lg border border-input shadow-[var(--shadow-control)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-[hsl(var(--border-strong))] transition-colors"
            title="搜索 (Ctrl K)"
          >
            <SearchIcon size={15} />
          </button>
        </div>
      </header>

      {/* Global Quick Search Command Palette (Ctrl+K) */}
      {isPaletteOpen &&
        createPortal(
          <div className="fixed inset-0 z-[95] flex items-start justify-center pt-[14vh] px-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsPaletteOpen(false)}
            />
            <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center px-3.5 h-12 border-b border-border gap-2.5">
                <SearchIcon size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  placeholder="搜索项目、应用、数据表或页面..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsPaletteOpen(false)}
                  className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted hover:text-foreground"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2 space-y-3">
                {matchedProjects.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      项目
                    </div>
                    <div className="space-y-0.5">
                      {matchedProjects.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            setIsPaletteOpen(false);
                            navigate(`/data/${proj.defaultTableId}`);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                        >
                          <ProjectColoredIcon
                            colorTheme={proj.colorTheme}
                            className="w-4 h-4 shrink-0"
                          />
                          <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                            {proj.name}
                          </span>
                          <span className="text-[12px] text-muted-foreground">项目</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {matchedApps.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      应用
                    </div>
                    <div className="space-y-0.5">
                      {matchedApps.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => {
                            setIsPaletteOpen(false);
                            navigate(`/apps/${app.id}/pages/${app.defaultPageId}`);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                        >
                          <AppColoredIcon
                            colorTheme={app.colorTheme}
                            className="w-4 h-4 shrink-0"
                          />
                          <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                            {app.name}
                          </span>
                          <span className="text-[12px] text-muted-foreground">应用</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {matchedTables.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      数据表
                    </div>
                    <div className="space-y-0.5">
                      {matchedTables.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setIsPaletteOpen(false);
                            navigate(`/data/${t.id}`);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                        >
                          <Table size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                            {t.name}
                          </span>
                          <span className="text-[12px] text-muted-foreground">数据表</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {matchedPages.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      应用页面
                    </div>
                    <div className="space-y-0.5">
                      {matchedPages.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setIsPaletteOpen(false);
                            const firstApp = workspaceApps[0] || apps[0];
                            navigate(
                              `/apps/${firstApp?.id || 'app-order-mgmt'}/pages/${p.id}`
                            );
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                        >
                          <FileText size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                            {p.name}
                          </span>
                          <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                            <LayoutGrid size={11} /> 页面
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {matchedProjects.length === 0 &&
                  matchedApps.length === 0 &&
                  matchedTables.length === 0 &&
                  matchedPages.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      未找到与 “{paletteQuery}” 匹配的内容
                    </div>
                  )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Header;