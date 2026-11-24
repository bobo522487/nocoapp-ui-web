import React from 'react';
import { ChevronLeft, ChevronRight, ListTree } from 'lucide-react';
import type { ArticleHeading } from '../domain/articleMetrics';

export interface ArticleInspectorPanelProps {
  headings: ArticleHeading[];
  wordCount: number;
  paragraphCount: number;
  readingLabel: string;
  collapsed: boolean;
  onToggle: () => void;
  onHeadingClick?: (index: number) => void;
}

export const ArticleInspectorPanel: React.FC<ArticleInspectorPanelProps> = ({
  headings,
  collapsed,
  onToggle,
  onHeadingClick,
  wordCount: _wordCount,
  paragraphCount: _paragraphCount,
  readingLabel: _readingLabel,
}) => {
  if (collapsed) {
    return (
      <div
        className="shrink-0 flex flex-col items-center border-l border-border bg-background"
        style={{ width: 36 }}
      >
        <button
          type="button"
          onClick={onToggle}
          title="展开大纲"
          aria-label="展开大纲"
          className="w-full h-9 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
        <div
          className="flex-1 flex items-center justify-center writing-mode-vertical text-[11px] text-muted-foreground tracking-wide py-2"
          style={{ writingMode: 'vertical-rl' }}
        >
          <ListTree size={12} className="mb-1" />
          大纲
        </div>
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex flex-col border-l border-border bg-background overflow-hidden"
      style={{ width: 280 }}
      data-testid="article-inspector-panel"
    >
      <div className="h-9 px-3 flex items-center justify-between gap-2 border-b border-border shrink-0">
        <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
          <ListTree size={13} className="text-primary" />
          大纲
        </span>
        <button
          type="button"
          onClick={onToggle}
          title="折叠大纲"
          aria-label="折叠大纲"
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2">
        {headings.length === 0 ? (
          <p className="text-[12px] text-muted-foreground px-2 py-3">
            正文里还没有标题
          </p>
        ) : (
          <ul className="space-y-0.5">
            {headings.map((heading, index) => (
              <li key={`${index}-${heading.text}`}>
                <button
                  type="button"
                  onClick={() => onHeadingClick?.(index)}
                  className="w-full text-left text-[12px] text-foreground/85 hover:text-primary hover:bg-muted/60 rounded px-2 py-1.5 truncate transition-colors cursor-pointer"
                  style={{ paddingLeft: 8 + (heading.level - 1) * 12 }}
                  title={heading.text}
                >
                  <span className="text-muted-foreground font-mono text-[10px] mr-1.5">
                    H{heading.level}
                  </span>
                  {heading.text || '（空标题）'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};