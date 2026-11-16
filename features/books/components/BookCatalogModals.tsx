import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  FolderOpen,
  GitFork,
  Plus,
  ScrollText,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { TreeItem } from '../../../components/common/Tree/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useRouteContext } from '../../../hooks/useRouteContext';
import { useArticleStore } from '../../../store/useArticleStore';
import {
  DEFAULT_LINEAGE_TREE,
  useLineageStore,
} from '../../../store/useLineageStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { makeArticleStorageKey } from '../../articles/articleData';
import { resolveChartPersons } from '../bookCompiler';
import type {
  BookRecord,
  CatalogArticleNode,
  CatalogLineageNode,
  CatalogSectionCode,
  DescendantScope,
  LineageSubTableConfig,
} from '../types';
import { FishtailOrnament } from './BookCoverThumb';
import { HelpTipButton } from './HelpTipButton';
import {
  LineageQuickPanel,
  type SelectedLineageMember,
} from './LineageQuickPanel';

/* -------------------------------------------------------------------------- */
/* 1. Add / Rename Chapter Modal                                              */
/* -------------------------------------------------------------------------- */

interface ChapterModalProps {
  open: boolean;
  mode: 'create' | 'rename';
  sectionLabel?: string;
  initialTitle?: string;
  onClose: () => void;
  onSubmit: (title: string) => void;
}

export const AddChapterModal: React.FC<ChapterModalProps> = ({
  open,
  mode,
  sectionLabel,
  initialTitle = '',
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setTitle(initialTitle);
  }, [open, initialTitle]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请输入章节名称');
      return;
    }
    onSubmit(title.trim());
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[420px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <span>{mode === 'create' ? '添加章节' : '修改章节名称'}</span>
            {sectionLabel && (
              <span className="text-[12px] font-normal text-muted-foreground">
                · {sectionLabel}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X size={15} />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-2">
            <Label htmlFor="chapterTitleInput" className="flex items-center gap-1.5">
              <span>章节名称</span>
              <span className="text-destructive">*</span>
              <HelpTipButton tipKey="chapter-name" />
            </Label>
            <Input
              id="chapterTitleInput"
              autoFocus
              placeholder="例如：谱序凡例、先贤传略"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
            />
            {error && <p className="text-[12px] text-destructive">{error}</p>}
          </div>

          <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" size="sm">
              {mode === 'create' ? '确认添加' : '保存名称'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* 2. Add Text Dual-Column Picker Modal (选择谱文)                              */
/* -------------------------------------------------------------------------- */

interface ArticleListItem {
  id: string;
  title: string;
  folderName: string;
  wordCount: number;
}

function flattenArticleTree(
  items: TreeItem[],
  articlesByKey: Record<string, { title: string; wordCount: number }>,
  projectId: string,
  folderName = '根目录'
): ArticleListItem[] {
  const out: ArticleListItem[] = [];
  for (const item of items) {
    if (item.type === 'folder') {
      out.push(
        ...flattenArticleTree(
          item.children || [],
          articlesByKey,
          projectId,
          item.data?.name || '卷目'
        )
      );
    } else if (item.type === 'article') {
      const id = String(item.id);
      const doc = articlesByKey[makeArticleStorageKey(projectId, id)];
      out.push({
        id,
        title: doc?.title || item.data?.name || id,
        folderName,
        wordCount: doc?.wordCount ?? 0,
      });
    }
  }
  return out;
}

interface AddTextModalProps {
  open: boolean;
  targetLabel: string;
  onClose: () => void;
  onConfirm: (
    selected: Array<{ sourceArticleId: string; sourceTitle: string }>
  ) => void;
}

export const AddTextModal: React.FC<AddTextModalProps> = ({
  open,
  targetLabel,
  onClose,
  onConfirm,
}) => {
  const { activeProjectId } = useRouteContext();
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const articleTreesByProject = useArticleStore((s) => s.treesByProject);
  const articlesByKey = useArticleStore((s) => s.articlesByKey);
  const ensureInitialized = useArticleStore((s) => s.ensureProjectInitialized);

  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<ArticleListItem[]>([]);

  useEffect(() => {
    if (!open || !activeProjectId) return;
    setSearch('');
    setQueue([]);
    if (!articleTreesByProject[activeProjectId]) {
      ensureInitialized(activeProjectId, {
        familyName: activeProject?.name,
        surname: activeProject?.primarySurname,
        hallName: activeProject?.primaryName,
        ancestor: activeProject?.ancestor,
        region: activeProject?.region,
      });
    }
  }, [
    open,
    activeProjectId,
    articleTreesByProject,
    activeProject?.name,
    activeProject?.primarySurname,
    activeProject?.primaryName,
    activeProject?.ancestor,
    activeProject?.region,
    ensureInitialized,
  ]);

  const allArticles = useMemo(() => {
    const tree = articleTreesByProject[activeProjectId] || [];
    return flattenArticleTree(tree, articlesByKey, activeProjectId);
  }, [articleTreesByProject, activeProjectId, articlesByKey]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allArticles;
    return allArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.folderName.toLowerCase().includes(q)
    );
  }, [allArticles, search]);

  if (!open) return null;

  const addToQueue = (art: ArticleListItem) => {
    setQueue((prev) => [...prev, art]);
  };

  const moveQueueItem = (index: number, dir: -1 | 1) => {
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= queue.length) return;
    setQueue((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const removeQueueItem = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[780px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ScrollText size={16} className="text-primary shrink-0" />
            <h3 className="text-[15px] font-semibold text-foreground truncate">
              选择谱文加入目录
            </h3>
            <span className="text-[12px] text-muted-foreground truncate">
              · {targetLabel}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X size={15} />
          </Button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
          {/* Left: Available Articles */}
          <div className="flex flex-col min-h-[280px] overflow-hidden">
            <div className="p-3 border-b border-border bg-[hsl(var(--surface-subtle))] space-y-2 shrink-0">
              <div className="text-[12px] font-semibold text-foreground">
                家族谱文库 ({allArticles.length} 篇)
              </div>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="搜索谱文标题或卷目..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-[12px]"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
              {filteredArticles.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => addToQueue(art)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-transparent hover:border-border hover:bg-[hsl(var(--surface-hover))] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">
                      {art.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums truncate">
                      {art.folderName} · {art.wordCount} 字
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-80 group-hover:opacity-100 shrink-0">
                    <Plus size={13} />
                    添加
                  </span>
                </button>
              ))}
              {filteredArticles.length === 0 && (
                <div className="py-10 text-center text-[12px] text-muted-foreground">
                  暂无匹配的谱文
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected Ordered Queue */}
          <div className="flex flex-col min-h-[280px] overflow-hidden bg-background/40">
            <div className="px-3.5 py-3 border-b border-border bg-[hsl(var(--surface-subtle))] flex items-center justify-between shrink-0">
              <span className="text-[12px] font-semibold text-foreground">
                已选谱文队列
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {queue.length} 篇
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
              {queue.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-card"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-[13px] font-medium text-foreground truncate">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveQueueItem(idx, -1)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                      title="上移"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === queue.length - 1}
                      onClick={() => moveQueueItem(idx, 1)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                      title="下移"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQueueItem(idx)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="移除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="h-full flex items-center justify-center text-[12px] text-muted-foreground py-12 px-4 text-center">
                  点击左侧任意谱文即可按顺序加入右侧编排队列
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={queue.length === 0}
            onClick={() =>
              onConfirm(
                queue.map((q) => ({
                  sourceArticleId: q.id,
                  sourceTitle: q.title,
                }))
              )
            }
          >
            确认加入 ({queue.length})
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Edit Catalog Document Modal (编辑谱文引用)                               */
/* -------------------------------------------------------------------------- */

interface EditCatalogDocModalProps {
  open: boolean;
  node: CatalogArticleNode | null;
  onClose: () => void;
  onSubmit: (updates: {
    displayTitle: string;
    sourceArticleId: string;
    sourceTitle: string;
  }) => void;
}

export const EditCatalogDocModal: React.FC<EditCatalogDocModalProps> = ({
  open,
  node,
  onClose,
  onSubmit,
}) => {
  const { activeProjectId } = useRouteContext();
  const articleTreesByProject = useArticleStore((s) => s.treesByProject);
  const articlesByKey = useArticleStore((s) => s.articlesByKey);

  const [displayTitle, setDisplayTitle] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState('');

  const allArticles = useMemo(() => {
    const tree = articleTreesByProject[activeProjectId] || [];
    return flattenArticleTree(tree, articlesByKey, activeProjectId);
  }, [articleTreesByProject, activeProjectId, articlesByKey]);

  useEffect(() => {
    if (!open || !node) return;
    setDisplayTitle(node.displayTitle);
    setSelectedSourceId(node.sourceArticleId);
  }, [open, node]);

  if (!open || !node) return null;

  const pickedSource = allArticles.find((a) => a.id === selectedSourceId);
  const currentSourceTitle = pickedSource?.title || node.sourceTitle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      displayTitle: displayTitle.trim() || currentSourceTitle,
      sourceArticleId: selectedSourceId || node.sourceArticleId,
      sourceTitle: currentSourceTitle,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[480px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-[15px] font-semibold text-foreground">
            编辑谱文目录条目
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X size={15} />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="catalogDocTitle">目录显示标题</Label>
              <Input
                id="catalogDocTitle"
                value={displayTitle}
                onChange={(e) => setDisplayTitle(e.target.value)}
                placeholder="输入在谱书目录中显示的标题"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catalogDocSource">引用谱文来源</Label>
              <select
                id="catalogDocSource"
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                {allArticles.map((art) => (
                  <option key={art.id} value={art.id}>
                    {art.folderName} / {art.title}
                  </option>
                ))}
                {!allArticles.some((a) => a.id === node.sourceArticleId) && (
                  <option value={node.sourceArticleId}>
                    {node.sourceTitle}
                  </option>
                )}
              </select>
              <p className="text-[12px] text-muted-foreground">
                当前引用：{currentSourceTitle}
              </p>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" size="sm">
              保存修改
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* 4. Move / Transfer Catalog Node Modal (迁出内容)                           */
/* -------------------------------------------------------------------------- */

interface MoveNodeModalProps {
  open: boolean;
  book: BookRecord;
  sourceNodeId: string | null;
  sourceNodeType: 'chapter' | 'article' | 'lineage' | null;
  sourceNodeTitle: string;
  onClose: () => void;
  onConfirm: (
    targetSectionCode: CatalogSectionCode,
    targetChapterId?: string
  ) => void;
}

export const MoveNodeModal: React.FC<MoveNodeModalProps> = ({
  open,
  book,
  sourceNodeId,
  sourceNodeType,
  sourceNodeTitle,
  onClose,
  onConfirm,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>('body::');

  useEffect(() => {
    if (!open) return;
    setSelectedKey('body::');
  }, [open]);

  if (!open || !sourceNodeId) return null;

  const sections = (
    ['preface', 'body', 'lineage', 'appendix'] as CatalogSectionCode[]
  ).map((code) => book.sections[code]);

  const handleConfirm = () => {
    const [secCode, chId] = selectedKey.split('::');
    onConfirm(secCode as CatalogSectionCode, chId || undefined);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[460px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground truncate">
              迁出「{sourceNodeTitle}」
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X size={15} />
          </Button>
        </div>

        <div className="p-4 max-h-[360px] overflow-y-auto space-y-2">
          <p className="text-[12px] text-muted-foreground mb-2">
            请选择目标栏目或章节位置：
          </p>
          {sections.map((sec) => {
            // Lineage nodes belong cleanly in lineage/appendix/body; chapters can move to any section root
            const isSecDisabled =
              sourceNodeType === 'lineage' && sec.code === 'preface';
            const secKey = `${sec.code}::`;
            return (
              <div key={sec.code} className="space-y-1">
                <label
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[13px] transition-colors ${
                    isSecDisabled
                      ? 'opacity-40 cursor-not-allowed border-border bg-muted/30'
                      : selectedKey === secKey
                        ? 'border-primary bg-primary/[0.08] font-medium cursor-pointer'
                        : 'border-border hover:bg-[hsl(var(--surface-hover))] cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="moveTarget"
                    disabled={isSecDisabled}
                    checked={selectedKey === secKey}
                    onChange={() => setSelectedKey(secKey)}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <FolderOpen size={14} className="text-amber-500 shrink-0" />
                  <span className="truncate">{sec.label}（顶级目录）</span>
                </label>

                {sourceNodeType !== 'chapter' &&
                  sec.items
                    .filter((n) => n.nodeType === 'chapter')
                    .map((ch) => {
                      const chKey = `${sec.code}::${ch.id}`;
                      const disabled = isSecDisabled || ch.id === sourceNodeId;
                      return (
                        <label
                          key={ch.id}
                          className={`ml-5 flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed border-border'
                              : selectedKey === chKey
                                ? 'border-primary bg-primary/[0.08] font-medium cursor-pointer'
                                : 'border-border/70 hover:bg-[hsl(var(--surface-hover))] cursor-pointer'
                          }`}
                        >
                          <input
                            type="radio"
                            name="moveTarget"
                            disabled={disabled}
                            checked={selectedKey === chKey}
                            onChange={() => setSelectedKey(chKey)}
                            className="accent-[hsl(var(--primary))]"
                          />
                          <ArrowRight
                            size={12}
                            className="text-muted-foreground shrink-0"
                          />
                          <span className="truncate">
                            {ch.nodeType === 'chapter' ? ch.title : ''}
                          </span>
                        </label>
                      );
                    })}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm}>
            确认迁出
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* 5. Member Search Modal (选择起始/结束族丁)                                  */
/* -------------------------------------------------------------------------- */

interface MemberSearchModalProps {
  open: boolean;
  title: string;
  initialChartId?: string;
  onClose: () => void;
  onConfirm: (member: SelectedLineageMember) => void;
}

export const MemberSearchModal: React.FC<MemberSearchModalProps> = ({
  open,
  title,
  initialChartId,
  onClose,
  onConfirm,
}) => {
  const [picked, setPicked] = useState<SelectedLineageMember | null>(null);

  useEffect(() => {
    if (open) setPicked(null);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[660px] h-[540px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <GitFork size={15} className="text-primary" />
            <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X size={15} />
          </Button>
        </div>

        <div className="flex-1 min-h-0 p-3 overflow-hidden">
          <LineageQuickPanel
            mode="select"
            initialChartId={initialChartId}
            selectedMemberId={picked?.person.id}
            onSelectMember={(m) => setPicked(m)}
            className="h-full"
          />
        </div>

        <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[12px] text-muted-foreground truncate">
            {picked ? (
              <span>
                已选择：
                <strong className="text-foreground">
                  {picked.person.name}
                </strong>{' '}
                （第{picked.person.generation}世 · {picked.chartName}）
              </span>
            ) : (
              '请在上方树图或列表中点击选择一位族丁'
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!picked}
              onClick={() => {
                if (picked) onConfirm(picked);
              }}
            >
              确定选择
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* 6. Add Lineage Modal (添加世系 + 欧式排版位置演示)                          */
/* -------------------------------------------------------------------------- */

interface AddLineageModalProps {
  open: boolean;
  book: BookRecord;
  targetLabel: string;
  onClose: () => void;
  onSubmit: (payload: Omit<CatalogLineageNode, 'id' | 'nodeType'>) => void;
}

export const AddLineageModal: React.FC<AddLineageModalProps> = ({
  open,
  book,
  targetLabel,
  onClose,
  onSubmit,
}) => {
  const { activeProjectId } = useRouteContext();
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const treesByProject = useLineageStore((s) => s.treesByProject);
  const personsByChart = useLineageStore((s) => s.personsByChart);

  const [totalTitle, setTotalTitle] = useState('');
  const [eyebrowTitle, setEyebrowTitle] = useState('');
  const [chartId, setChartId] = useState('');
  const [chartName, setChartName] = useState('');
  const [startMemberId, setStartMemberId] = useState('');
  const [startMemberName, setStartMemberName] = useState('');
  const [descendantScope, setDescendantScope] =
    useState<DescendantScope>('all');
  const [endMemberId, setEndMemberId] = useState('');
  const [endMemberName, setEndMemberName] = useState('');
  const [maxGenerations, setMaxGenerations] = useState('5');
  const [error, setError] = useState('');

  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(
    null
  );

  useEffect(() => {
    if (!open) return;
    setError('');
    const tree = treesByProject[activeProjectId] || DEFAULT_LINEAGE_TREE;
    const findFirstChart = (items: TreeItem[]): TreeItem | null => {
      for (const item of items) {
        if (item.type === 'chart') return item;
        if (item.children?.length) {
          const hit = findFirstChart(item.children);
          if (hit) return hit;
        }
      }
      return null;
    };
    const firstChart = findFirstChart(tree);
    if (firstChart) {
      const resolved = resolveChartPersons(
        activeProjectId,
        String(firstChart.id),
        tree,
        personsByChart,
        activeProject?.primarySurname
      );
      const root =
        resolved.persons.find((p) => p.generation === 1 && !p.fatherId) ||
        resolved.persons[0];
      setChartId(String(firstChart.id));
      setChartName(resolved.chartName);
      setStartMemberId(root?.id || '');
      setStartMemberName(root?.name || '');
      setEyebrowTitle(`${resolved.chartName}世系`);
    } else {
      setChartId('');
      setChartName('');
      setStartMemberId('');
      setStartMemberName('');
      setEyebrowTitle('');
    }
    setTotalTitle(book.bookName);
    setDescendantScope('all');
    setEndMemberId('');
    setEndMemberName('');
    setMaxGenerations('5');
  }, [
    open,
    activeProjectId,
    activeProject?.primarySurname,
    book.bookName,
    treesByProject,
    personsByChart,
  ]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eyebrowTitle.trim()) {
      setError('请填写世系谱眉名');
      return;
    }
    if (!startMemberId) {
      setError('请选择起始族丁');
      return;
    }
    if (
      (descendantScope === 'member' || descendantScope === 'member_inclusive') &&
      !endMemberId
    ) {
      setError('请选择结束族丁');
      return;
    }

    onSubmit({
      totalTitle: totalTitle.trim() || book.bookName,
      eyebrowTitle: eyebrowTitle.trim(),
      chartId,
      chartName,
      startMemberId,
      startMemberName,
      descendantScope,
      endMemberId:
        descendantScope === 'member' || descendantScope === 'member_inclusive'
          ? endMemberId
          : undefined,
      endMemberName:
        descendantScope === 'member' || descendantScope === 'member_inclusive'
          ? endMemberName
          : undefined,
      maxGenerations:
        descendantScope === 'generations'
          ? Math.max(1, Number(maxGenerations) || 5)
          : undefined,
      indexConfig: { enabled: true, inToc: true, tocTitle: '族丁检索表' },
      diaoxianConfig: { enabled: true, inToc: true, tocTitle: '吊线图' },
      shixiConfig: { enabled: true, inToc: true, tocTitle: '世系表' },
    });
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[95] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-[820px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <GitFork size={16} className="text-primary shrink-0" />
              <h3 className="text-[15px] font-semibold text-foreground truncate">
                添加世系章节
              </h3>
              <span className="text-[12px] text-muted-foreground truncate">
                · {targetLabel}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={onClose}
            >
              <X size={15} />
            </Button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] divide-y md:divide-y-0 md:divide-x divide-border overflow-y-auto">
              {/* Left Form */}
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lineageTotalTitle"
                    className="flex items-center gap-1.5"
                  >
                    <span>总谱 || 分谱标题</span>
                    <HelpTipButton tipKey="lineage-total-title" />
                  </Label>
                  <Input
                    id="lineageTotalTitle"
                    value={totalTitle}
                    onChange={(e) => setTotalTitle(e.target.value)}
                    placeholder="选填，默认沿用谱书名称"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="lineageEyebrowTitle"
                    className="flex items-center gap-1.5"
                  >
                    <span>世系谱眉名</span>
                    <span className="text-destructive">*</span>
                    <HelpTipButton tipKey="lineage-eyebrow" />
                  </Label>
                  <Input
                    id="lineageEyebrowTitle"
                    value={eyebrowTitle}
                    onChange={(e) => {
                      setEyebrowTitle(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="例如：主支世系、长房分支世系"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>起始族丁 *</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerTarget('start')}
                      className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-left text-[13px] flex items-center justify-between hover:border-primary/60 transition-colors cursor-pointer"
                    >
                      <span
                        className={
                          startMemberName
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        }
                      >
                        {startMemberName
                          ? `${startMemberName}（${chartName}）`
                          : '点击选择起始族丁'}
                      </span>
                      <Search size={13} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>支派后裔范围</Label>
                  <div className="space-y-2 text-[12px]">
                    {[
                      {
                        value: 'all' as DescendantScope,
                        label: '全部后代（纳入该支脉下所有后裔）',
                      },
                      {
                        value: 'member' as DescendantScope,
                        label: '指定结束族丁（不含该族丁及其后裔）',
                      },
                      {
                        value: 'member_inclusive' as DescendantScope,
                        label: '指定结束族丁（含该族丁但不含其子嗣）',
                      },
                      {
                        value: 'generations' as DescendantScope,
                        label: '指定结束世数（自起始族丁起连续若干世）',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer text-foreground/90"
                      >
                        <input
                          type="radio"
                          name="descendantScope"
                          checked={descendantScope === opt.value}
                          onChange={() => setDescendantScope(opt.value)}
                          className="accent-[hsl(var(--primary))]"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {(descendantScope === 'member' ||
                    descendantScope === 'member_inclusive') && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setPickerTarget('end')}
                        className="w-full h-8 px-3 rounded-md border border-input bg-background text-left text-[12px] flex items-center justify-between hover:border-primary/60 transition-colors cursor-pointer"
                      >
                        <span
                          className={
                            endMemberName
                              ? 'text-foreground font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {endMemberName || '点击选择结束族丁'}
                        </span>
                        <Search size={12} className="text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {descendantScope === 'generations' && (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[12px] text-muted-foreground">
                        收录世数：
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={maxGenerations}
                        onChange={(e) => setMaxGenerations(e.target.value)}
                        className="w-20 h-8 text-[12px] tabular-nums"
                      />
                      <span className="text-[12px] text-muted-foreground">世</span>
                    </div>
                  )}
                </div>

                {error && <p className="text-[12px] text-destructive">{error}</p>}
              </div>

              {/* Right: Live 排版位置演示 Preview */}
              <div className="p-5 bg-[hsl(var(--surface-subtle))] flex flex-col items-center justify-center">
                <div className="text-[12px] font-medium text-muted-foreground mb-3">
                  欧式版心 · 排版位置演示
                </div>
                <div
                  className="w-[240px] h-[320px] bg-[#fdfaf2] text-[#2a2118] border border-[#b9ad97] p-3 flex flex-col shadow-sm select-none"
                  style={{
                    fontFamily:
                      '"Noto Serif SC", "Songti SC", "SimSun", serif',
                  }}
                >
                  <div className="border-2 border-double border-[#3a2d22] flex-1 flex overflow-hidden">
                    {/* Right column: Total title */}
                    <div
                      className="w-8 border-l border-[#3a2d22] flex items-center justify-center text-[11px] font-bold tracking-widest py-2 overflow-hidden"
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'upright',
                      }}
                    >
                      {totalTitle || book.bookName || '宗谱世系'}
                    </div>
                    {/* Center: 5-tier European table preview */}
                    <div className="flex-1 grid grid-rows-5 divide-y divide-[#b8aa93] text-[10px]">
                      {['一世', '二世', '三世', '四世', '五世'].map(
                        (tier, idx) => (
                          <div
                            key={tier}
                            className="flex items-center justify-between px-2"
                          >
                            <span className="text-[#7c231c] font-semibold">
                              {tier}
                            </span>
                            <span className="text-[#4a3e33]">
                              {idx === 0
                                ? startMemberName || '始祖'
                                : '承嗣略注'}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                    {/* Left Spine / 版心 */}
                    <div className="w-7 border-r border-[#3a2d22] flex flex-col items-center justify-between py-2 bg-[#f8f3e8] text-[9px]">
                      <span
                        className="font-semibold truncate max-h-20"
                        style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'upright',
                        }}
                      >
                        {book.headerName || '宗谱'}
                      </span>
                      <FishtailOrnament style={book.layoutConfig.fishtailStyle} />
                      <span
                        className="text-[#7c231c] font-semibold truncate max-h-20"
                        style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'upright',
                        }}
                      >
                        {eyebrowTitle || '世系谱眉'}
                      </span>
                      <span className="text-[8px] text-[#6d5f4e]">第一页</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" size="sm">
                确认添加世系
              </Button>
            </div>
          </form>
        </div>
      </div>

      <MemberSearchModal
        open={pickerTarget !== null}
        title={pickerTarget === 'start' ? '选择起始族丁' : '选择结束族丁'}
        initialChartId={chartId}
        onClose={() => setPickerTarget(null)}
        onConfirm={(picked) => {
          if (pickerTarget === 'start') {
            setChartId(picked.chartId);
            setChartName(picked.chartName);
            setStartMemberId(picked.person.id);
            setStartMemberName(picked.person.name);
            if (!eyebrowTitle.trim()) {
              setEyebrowTitle(`${picked.chartName}世系`);
            }
          } else {
            setEndMemberId(picked.person.id);
            setEndMemberName(picked.person.name);
          }
          setPickerTarget(null);
        }}
      />
    </>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* 7. Lineage Settings Modal (世系详细设置)                                   */
/* -------------------------------------------------------------------------- */

interface LineageSettingsModalProps {
  open: boolean;
  node: CatalogLineageNode | null;
  onClose: () => void;
  onSave: (
    updates: Pick<
      CatalogLineageNode,
      'indexConfig' | 'diaoxianConfig' | 'shixiConfig'
    >
  ) => void;
}

export const LineageSettingsModal: React.FC<LineageSettingsModalProps> = ({
  open,
  node,
  onClose,
  onSave,
}) => {
  const [indexCfg, setIndexCfg] = useState<LineageSubTableConfig>({
    enabled: true,
    inToc: true,
    tocTitle: '族丁检索表',
  });
  const [diaoxianCfg, setDiaoxianCfg] = useState<LineageSubTableConfig>({
    enabled: true,
    inToc: true,
    tocTitle: '吊线图',
  });
  const [shixiCfg, setShixiCfg] = useState<LineageSubTableConfig>({
    enabled: true,
    inToc: true,
    tocTitle: '世系表',
  });

  useEffect(() => {
    if (!open || !node) return;
    setIndexCfg({ ...node.indexConfig });
    setDiaoxianCfg({ ...node.diaoxianConfig });
    setShixiCfg({ ...node.shixiConfig });
  }, [open, node]);

  if (!open || !node) return null;

  const rows: Array<{
    key: string;
    label: string;
    desc: string;
    cfg: LineageSubTableConfig;
    setCfg: React.Dispatch<React.SetStateAction<LineageSubTableConfig>>;
  }> = [
    {
      key: 'index',
      label: '族丁检索表',
      desc: '按世次与谱名索引本支族丁所在页码，方便翻阅查找。',
      cfg: indexCfg,
      setCfg: setIndexCfg,
    },
    {
      key: 'diaoxian',
      label: '吊线图',
      desc: '以树状连线展示先祖与后裔的直系承传脉络。',
      cfg: diaoxianCfg,
      setCfg: setDiaoxianCfg,
    },
    {
      key: 'shixi',
      label: '世系表',
      desc: '按所选欧式/苏式/双栏版式排版输出完整世系与行传。',
      cfg: shixiCfg,
      setCfg: setShixiCfg,
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[540px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground truncate">
              世系详细设置 · {node.eyebrowTitle}
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X size={15} />
          </Button>
        </div>

        <div className="p-5 space-y-3">
          {rows.map((r) => (
            <div
              key={r.key}
              className="rounded-xl border border-border bg-background p-3.5 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.cfg.enabled}
                    onChange={(e) =>
                      r.setCfg((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    className="accent-[hsl(var(--primary))]"
                  />
                  <span>生成 {r.label}</span>
                </label>

                <label
                  className={`flex items-center gap-1.5 text-[12px] ${
                    r.cfg.enabled
                      ? 'text-foreground cursor-pointer'
                      : 'text-muted-foreground opacity-50 pointer-events-none'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!r.cfg.enabled}
                    checked={r.cfg.inToc}
                    onChange={(e) =>
                      r.setCfg((prev) => ({ ...prev, inToc: e.target.checked }))
                    }
                    className="accent-[hsl(var(--primary))]"
                  />
                  <span>列入目录</span>
                </label>
              </div>
              <p className="text-[12px] text-muted-foreground">{r.desc}</p>
              {r.cfg.enabled && r.cfg.inToc && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[12px] text-muted-foreground shrink-0">
                    目录标题：
                  </span>
                  <Input
                    value={r.cfg.tocTitle}
                    onChange={(e) =>
                      r.setCfg((prev) => ({
                        ...prev,
                        tocTitle: e.target.value,
                      }))
                    }
                    className="h-8 text-[12px]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onSave({
                indexConfig: indexCfg,
                diaoxianConfig: diaoxianCfg,
                shixiConfig: shixiCfg,
              })
            }
          >
            保存设置
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* 8. Blocked Chapter Delete Alert Modal (操作提示)                           */
/* -------------------------------------------------------------------------- */

interface CatalogBlockedModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export const CatalogBlockedModal: React.FC<CatalogBlockedModalProps> = ({
  open,
  message,
  onClose,
}) => {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <AlertTriangle size={17} className="text-amber-500 shrink-0" />
          <span>操作提示</span>
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
          {message}
        </p>
        <div className="mt-5 flex justify-end">
          <Button size="sm" onClick={onClose}>
            我知道了
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
