import React from 'react';
import {
  BookOpen,
  Download,
  GitFork,
  MapPin,
  Pencil,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import type { ProjectRecord, ProjectStatus } from '../api';

export interface FamilyCardMetrics {
  lineageCount: number;
  personCount: number;
  articleCount: number;
  bookCount: number;
}

interface FamilyCardProps {
  project: ProjectRecord;
  isCurrent: boolean;
  metrics: FamilyCardMetrics;
  maintainerName: string;
  zibeiWords: string[];
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (project: ProjectRecord, subPath?: '' | '/lineage' | '/articles' | '/books') => void;
  onExport: (project: ProjectRecord) => void;
  onEdit: (project: ProjectRecord) => void;
  onDelete: (project: ProjectRecord) => void;
  onManageZibei: (project: ProjectRecord) => void;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: '规划中',
  in_progress: '进行中',
  completed: '已完成',
};

export const FamilyCard: React.FC<FamilyCardProps> = ({
  project,
  isCurrent,
  metrics,
  maintainerName,
  zibeiWords,
  canEdit,
  canDelete,
  onOpen,
  onExport,
  onEdit,
  onDelete,
  onManageZibei,
}) => {
  const surnameChar = (
    project.surname?.trim() ||
    project.name.trim().slice(0, 1) ||
    '谱'
  ).slice(0, 1);

  const zibeiPreview =
    zibeiWords.length > 0
      ? `${zibeiWords.slice(0, 8).join(' ')}${zibeiWords.length > 8 ? '…' : ''}`
      : '待设置字辈';

  return (
    <article
      data-family-id={project.id}
      data-family-name={project.name}
      data-lineage-count={metrics.lineageCount}
      data-document-count={metrics.articleCount}
      data-book-count={metrics.bookCount}
      data-is-current={String(isCurrent)}
      className={`family-card group relative rounded-xl p-6 bg-card transition-all duration-150 overflow-hidden flex flex-col justify-between ${
        isCurrent
          ? 'border-2 border-primary shadow-[var(--shadow-card-hover)]'
          : 'border border-border hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)]'
      }`}
    >
      {/* Top-Right Current Family Ribbon */}
      {isCurrent && (
        <div className="family-card__current-badge absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-[11px] font-semibold tracking-wide rounded-bl-lg select-none">
          当前家族
        </div>
      )}

      <div>
        {/* Top Row: Surname Seal + Action Icons */}
        <div className="flex justify-between items-start gap-3 mb-5">
          <button
            type="button"
            onClick={() => onOpen(project, '')}
            title={`进入「${project.name}」工作台`}
            className={`w-14 h-14 rounded-lg flex items-center justify-center border shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isCurrent
                ? 'bg-[hsl(var(--surface-active))] border-primary/25 text-primary'
                : 'bg-[hsl(var(--surface-subtle))] border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/40'
            }`}
          >
            <span className="font-editorial text-2xl font-bold select-none">
              {surnameChar}
            </span>
          </button>

          <div
            className={`family-card__actions flex items-center gap-1 ${
              isCurrent ? 'mt-3' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onExport(project)}
              title="导出备份家族"
              aria-label="导出备份家族"
              className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download size={16} />
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(project)}
                title="修改家族"
                aria-label="修改家族"
                className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil size={16} />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(project)}
                title="删除家族"
                aria-label="删除家族"
                className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Title & Status Line */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => onOpen(project, '')}
            className="w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <h3 className="font-editorial text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
          </button>
          <div className="text-[12px] text-muted-foreground mt-0.5 truncate tabular-nums">
            {project.hallName && project.hallName !== project.name
              ? `${project.hallName} · `
              : ''}
            {STATUS_LABELS[project.status]} · 更新于{' '}
            {new Date(project.updatedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Structured Metadata Lines */}
        <div className="space-y-2 mb-4 text-[13px] text-muted-foreground">
          <p className="flex items-center gap-2 min-w-0">
            <MapPin size={15} className="shrink-0 text-muted-foreground/80" />
            <span className="truncate">
              {project.originText || '未设置地区'}
            </span>
          </p>

          <p className="flex items-center gap-2 tabular-nums">
            <Users size={15} className="shrink-0 text-muted-foreground/80" />
            <span>族丁总数：{metrics.personCount} 人</span>
          </p>

          <p className="flex items-center gap-2 tabular-nums">
            <GitFork size={15} className="shrink-0 text-muted-foreground/80" />
            <span className="truncate">
              世系：{metrics.lineageCount} 个 · 谱文：{metrics.articleCount} 篇 · 谱书：{metrics.bookCount} 册
            </span>
          </p>

          <p className="flex items-center gap-2 min-w-0">
            <User size={15} className="shrink-0 text-muted-foreground/80" />
            <span className="truncate">
              {project.ancestor
                ? `始迁祖：${project.ancestor} · ${maintainerName}`
                : `编修：${maintainerName}`}
            </span>
          </p>
        </div>

        {/* Zibei Row */}
        <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-border/70 text-[12px]">
          <span
            className={`truncate ${
              zibeiWords.length > 0
                ? 'text-foreground/80 font-serif'
                : 'text-muted-foreground/75'
            }`}
            title={zibeiWords.join(' ')}
          >
            字辈：{zibeiPreview}
          </span>
          <button
            type="button"
            onClick={() => onManageZibei(project)}
            className="text-[13px] font-semibold text-primary hover:underline cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            设置字辈
          </button>
        </div>
      </div>

      {/* 2x2 Action Footer */}
      <div className="family-card__footer grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onOpen(project, '/lineage')}
          className="h-9 px-3 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[13px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          管理世系
        </button>

        <button
          type="button"
          onClick={() => onOpen(project, '')}
          className="h-9 px-3 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          家族概览
        </button>

        <button
          type="button"
          onClick={() => onOpen(project, '/articles')}
          className="h-9 px-3 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          管理谱文
        </button>

        <button
          type="button"
          onClick={() => onOpen(project, '/books')}
          className="h-9 px-3 rounded-lg border border-border bg-[hsl(var(--surface-subtle))/0.55] text-foreground/85 text-[13px] font-semibold hover:bg-[hsl(var(--surface-hover))] hover:text-foreground transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen size={14} className="shrink-0" />
          <span>谱书排版</span>
        </button>
      </div>
    </article>
  );
};
