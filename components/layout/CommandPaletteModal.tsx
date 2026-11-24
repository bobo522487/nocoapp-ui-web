import React, { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from '@tanstack/react-router';
import { FileText, ScrollText, Search as SearchIcon } from 'lucide-react';
import { ProjectColoredIcon } from '../common/NocoIcons';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useArticleStore } from '../../store/useArticleStore';
import type { TreeItem } from '../common/Tree/types';
import { useRouteContext } from '../../hooks/useRouteContext';

interface CommandPaletteContextValue {
  isOpen: boolean;
  openPalette: (initialQuery?: string) => void;
  closePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  isOpen: false,
  openPalette: () => {},
  closePalette: () => {},
});

export const useCommandPalette = () => useContext(CommandPaletteContext);

export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  const openPalette = (initialQuery?: string) => {
    if (typeof initialQuery === 'string') {
      setPaletteQuery(initialQuery);
    }
    setIsOpen(true);
  };

  const closePalette = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, openPalette, closePalette }}>
      {children}
      {isOpen && (
        <CommandPaletteModal
          query={paletteQuery}
          onQueryChange={setPaletteQuery}
          onClose={closePalette}
        />
      )}
    </CommandPaletteContext.Provider>
  );
};

interface CommandPaletteModalProps {
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
}

const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  query,
  onQueryChange,
  onClose,
}) => {
  const navigate = useNavigate();
  const { activeProjectId } = useRouteContext();

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId);
  const projects = useWorkspaceStore((s) => s.projects);

  const workspaceProjects = projects.filter(
    (p) => p.workspaceId === activeWorkspaceId
  );

  const q = query.trim().toLowerCase();
  const matchedProjects = React.useMemo(
    () => workspaceProjects.filter((p) => p.name.toLowerCase().includes(q)),
    [workspaceProjects, q]
  );

  const articleTreesByProject = useArticleStore((s) => s.treesByProject);
  const selectArticleNode = useArticleStore((s) => s.selectNode);

  const flattenedArticles = React.useMemo(() => {
    const items = articleTreesByProject[activeProjectId] || [];
    const results: { id: string; title: string; volume?: string }[] = [];
    const walk = (nodes: TreeItem[], volume?: string) => {
      for (const n of nodes) {
        if (n.type === 'article') {
          results.push({
            id: String(n.id),
            title: n.data?.name || String(n.id),
            volume,
          });
        } else if (n.children?.length) {
          walk(n.children, n.data?.name || volume);
        }
      }
    };
    walk(items);
    return results
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.volume && a.volume.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [articleTreesByProject, activeProjectId, q]);

  const workbenchModules = React.useMemo(
    () =>
      (
        [
          {
            id: 'lineage',
            name: '世系',
            desc: '世系图谱与房支结构',
            to: '/projects/$projectId/lineage',
          },
          {
            id: 'articles',
            name: '谱文',
            desc: '谱序、凡例与人物传记',
            to: '/projects/$projectId/articles',
          },
          {
            id: 'books',
            name: '谱书',
            desc: '分卷目录与线装成书',
            to: '/projects/$projectId/books',
          },
        ] as const
      ).filter(
        (m) =>
          m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)
      ),
    [q]
  );

  type ActionItem = {
    key: string;
    run: () => void;
  };

  const actionItems = React.useMemo<ActionItem[]>(() => {
    const list: ActionItem[] = [];
    matchedProjects.forEach((proj) => {
      list.push({
        key: `proj:${proj.id}`,
        run: () => {
          onClose();
          setActiveProjectId(proj.id);
          void navigate({
            to: '/projects/$projectId',
            params: { projectId: proj.id },
          });
        },
      });
    });
    workbenchModules.forEach((mod) => {
      list.push({
        key: `mod:${mod.id}`,
        run: () => {
          onClose();
          void navigate({
            to: mod.to,
            params: { projectId: activeProjectId },
          });
        },
      });
    });
    flattenedArticles.forEach((art) => {
      list.push({
        key: `art:${art.id}`,
        run: () => {
          onClose();
          selectArticleNode(activeProjectId, art.id);
          void navigate({
            to: '/projects/$projectId/articles',
            params: { projectId: activeProjectId },
          });
        },
      });
    });
    return list;
  }, [
    matchedProjects,
    workbenchModules,
    flattenedArticles,
    activeProjectId,
    navigate,
    onClose,
    selectArticleNode,
    setActiveProjectId,
  ]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [q]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (actionItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % actionItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + actionItems.length) % actionItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = actionItems[activeIndex];
      if (target) target.run();
    }
  };

  const indexOfKey = (key: string) => actionItems.findIndex((i) => i.key === key);

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center pt-[14vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="全局快速搜索"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 h-12 border-b border-border gap-2.5 bg-card">
          <SearchIcon size={16} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="搜索家族、世系、谱文或谱书..."
            className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-[hsl(var(--surface-subtle))] hover:text-foreground font-mono cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {matchedProjects.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[12px] font-semibold tracking-wider text-muted-foreground">
                家族
              </div>
              <div className="space-y-0.5">
                {matchedProjects.map((proj) => {
                  const idx = indexOfKey(`proj:${proj.id}`);
                  const highlighted = idx === activeIndex;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        onClose();
                        setActiveProjectId(proj.id);
                        void navigate({
                          to: '/projects/$projectId',
                          params: { projectId: proj.id },
                        });
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                        highlighted
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-[hsl(var(--surface-hover))]'
                      }`}
                    >
                      <ProjectColoredIcon
                        colorTheme={proj.colorTheme}
                        className="w-4 h-4 shrink-0"
                      />
                      <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                        {proj.name}
                      </span>
                      <span className="text-[12px] text-muted-foreground shrink-0">家族</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {workbenchModules.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[12px] font-semibold tracking-wider text-muted-foreground">
                家族工作台模块
              </div>
              <div className="space-y-0.5">
                {workbenchModules.map((mod) => {
                  const idx = indexOfKey(`mod:${mod.id}`);
                  const highlighted = idx === activeIndex;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        onClose();
                        void navigate({
                          to: mod.to,
                          params: { projectId: activeProjectId },
                        });
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                        highlighted
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-[hsl(var(--surface-hover))]'
                      }`}
                    >
                      <FileText size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                        {mod.name}
                      </span>
                      <span className="text-[12px] text-muted-foreground truncate">
                        {mod.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {flattenedArticles.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[12px] font-semibold tracking-wider text-muted-foreground">
                谱文篇章
              </div>
              <div className="space-y-0.5">
                {flattenedArticles.map((art) => {
                  const idx = indexOfKey(`art:${art.id}`);
                  const highlighted = idx === activeIndex;
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        onClose();
                        selectArticleNode(activeProjectId, art.id);
                        void navigate({
                          to: '/projects/$projectId/articles',
                          params: { projectId: activeProjectId },
                        });
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                        highlighted
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-[hsl(var(--surface-hover))]'
                      }`}
                    >
                      <ScrollText
                        size={14}
                        className="text-primary/80 shrink-0"
                      />
                      <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                        {art.title}
                      </span>
                      {art.volume && (
                        <span className="text-[12px] text-muted-foreground truncate max-w-[140px]">
                          {art.volume}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {actionItems.length === 0 && (
            <div className="py-8 text-center text-[13px] text-muted-foreground">
              未找到与 “{query}” 匹配的内容
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-[hsl(var(--surface-subtle))] flex items-center justify-between text-[12px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-card font-mono text-[12px] leading-none">↑↓</kbd>
              选择
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-card font-mono text-[12px] leading-none">Enter</kbd>
              进入
            </span>
          </div>
          <span className="font-mono tabular-nums">{actionItems.length} 项结果</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
