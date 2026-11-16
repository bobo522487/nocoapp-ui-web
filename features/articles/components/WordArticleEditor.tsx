import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import { Check, Minus, Plus } from 'lucide-react';
import { FontSize } from '../extensions/FontSize';
import { WordToolbar } from './WordToolbar';
import type { ArticleDocument } from '../types';

interface WordArticleEditorProps {
  article: ArticleDocument;
  familyName?: string;
  hallName?: string;
  onUpdateArticle: (
    updates: Partial<
      Pick<ArticleDocument, 'title' | 'subtitle' | 'author' | 'contentHtml'>
    >
  ) => void;
}

const ZOOM_LEVELS = [0.75, 0.9, 1, 1.15, 1.25];

export const WordArticleEditor: React.FC<WordArticleEditorProps> = ({
  article,
  familyName,
  hallName,
  onUpdateArticle,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [isPreview, setIsPreview] = useState(false);
  const [, setSelectionTick] = useState(0);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');

  const onUpdateRef = useRef(onUpdateArticle);
  onUpdateRef.current = onUpdateArticle;

  const activeArticleIdRef = useRef(article.id);
  const isSyncingContentRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: '在此撰写谱文正文，支持标题、列表、引用与表格排版……',
      }),
    ],
    content: article.contentHtml || '<p></p>',
    editable: !isPreview,
    editorProps: {
      attributes: {
        class: 'article-word-prose min-h-[720px]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isSyncingContentRef.current) return;
      const html = ed.getHTML();
      setSaveState('saving');
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      onUpdateRef.current({ contentHtml: html });
      saveTimerRef.current = window.setTimeout(() => {
        setSaveState('saved');
      }, 260);
    },
    onSelectionUpdate: () => {
      setSelectionTick((t) => t + 1);
    },
    onTransaction: () => {
      setSelectionTick((t) => t + 1);
    },
  });

  // Switch document content cleanly when user selects a different article in the sidebar
  useEffect(() => {
    if (!editor) return;
    if (activeArticleIdRef.current !== article.id) {
      activeArticleIdRef.current = article.id;
      isSyncingContentRef.current = true;
      editor.commands.setContent(article.contentHtml || '<p></p>', false);
      isSyncingContentRef.current = false;
      setSaveState('saved');
    }
  }, [article.id, article.contentHtml, editor]);

  // Keep editable flag synced with preview mode
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isPreview);
  }, [editor, isPreview]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const { paragraphCount, estimatedPages } = useMemo(() => {
    const html = article.contentHtml || '';
    const matches = html.match(/<(p|h1|h2|h3|li|blockquote)\b/gi);
    const pCount = matches ? matches.length : 1;
    const pages = Math.max(1, Math.ceil((article.wordCount || 0) / 700));
    return {
      paragraphCount: pCount,
      estimatedPages: pages,
    };
  }, [article.contentHtml, article.wordCount]);

  const handleExportWord = () => {
    const safeTitle = (article.title || '谱文').replace(/[\\/:*?"<>|]/g, '_');
    const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${article.title}</title>
<style>
  body { font-family: "SimSun", "Songti SC", serif; font-size: 12pt; line-height: 1.8; color: #111; }
  h1.doc-title { text-align: center; font-size: 20pt; margin-bottom: 6pt; }
  p.doc-meta { text-align: center; font-size: 10.5pt; color: #555; margin-bottom: 18pt; border-bottom: 1pt solid #ccc; padding-bottom: 8pt; }
  h1 { font-size: 16pt; margin: 14pt 0 6pt; }
  h2 { font-size: 14pt; margin: 12pt 0 5pt; }
  h3 { font-size: 12.5pt; margin: 10pt 0 4pt; }
  blockquote { margin: 10pt 0; padding: 6pt 12pt; background: #f8f8f8; border: 1pt solid #ddd; color: #444; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
  th, td { border: 1pt solid #999; padding: 5pt 8pt; text-align: left; }
  th { background: #f3f4f6; }
</style>
</head>
<body>
  <h1 class="doc-title">${article.title || '未命名谱文'}</h1>
  <p class="doc-meta">${[article.subtitle, article.author].filter(Boolean).join(' · ')}</p>
  ${article.contentHtml}
</body>
</html>`;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const stepZoom = (dir: -1 | 1) => {
    const idx = ZOOM_LEVELS.findIndex((z) => z === zoom);
    if (idx < 0) {
      setZoom(1);
      return;
    }
    const nextIdx = Math.min(
      ZOOM_LEVELS.length - 1,
      Math.max(0, idx + dir)
    );
    setZoom(ZOOM_LEVELS[nextIdx]);
  };

  const headerRunningTitle =
    hallName || familyName || '云谱数字修谱';

  return (
    <div
      className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-background"
      data-testid="word-article-editor"
    >
      {/* Top Word Formatting Toolbar */}
      <WordToolbar
        editor={editor}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview((v) => !v)}
        onExportWord={handleExportWord}
        onPrint={handlePrint}
      />

      {/* Centered Paper Desk Canvas */}
      <div className="flex-1 min-h-0 overflow-auto bg-[hsl(var(--surface-subtle))] py-7 px-4 sm:px-8 flex flex-col items-center">
        <div
          style={{
            width: `${Math.round(794 * zoom)}px`,
            maxWidth: '100%',
          }}
          className="transition-[width] duration-150 shrink-0"
        >
          <article
            data-article-paper="true"
            style={{
              zoom: zoom,
            }}
            className="w-[794px] max-w-full min-h-[1060px] mx-auto bg-card border border-border rounded-sm shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.45)] flex flex-col"
          >
            {/* Paper Running Header */}
            <div className="px-10 sm:px-16 pt-8 pb-3 flex items-center justify-between gap-4 border-b border-border/60 text-[11px] text-muted-foreground select-none">
              <span className="truncate">{headerRunningTitle}</span>
              <span className="truncate">{article.subtitle || '谱文正稿'}</span>
            </div>

            {/* Paper Body Margin Container */}
            <div className="flex-1 px-10 sm:px-16 pt-9 pb-14 flex flex-col">
              {/* Editable Document Title & Byline */}
              <div className="text-center space-y-2.5 pb-6 mb-6 border-b border-border">
                {isPreview ? (
                  <h1
                    className="text-[26px] sm:text-[28px] font-bold text-foreground tracking-tight text-balance"
                    style={{
                      fontFamily:
                        "'Noto Serif SC', 'Songti SC', 'SimSun', serif",
                    }}
                  >
                    {article.title || '未命名谱文'}
                  </h1>
                ) : (
                  <input
                    type="text"
                    value={article.title}
                    onChange={(e) =>
                      onUpdateArticle({ title: e.target.value })
                    }
                    placeholder="输入谱文标题..."
                    aria-label="谱文标题"
                    style={{
                      fontFamily:
                        "'Noto Serif SC', 'Songti SC', 'SimSun', serif",
                    }}
                    className="w-full text-center text-[26px] sm:text-[28px] font-bold text-foreground bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/45 tracking-tight"
                  />
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 text-[13px] text-muted-foreground">
                  {isPreview ? (
                    <>
                      {article.subtitle && <span>{article.subtitle}</span>}
                      {article.subtitle && article.author && (
                        <span aria-hidden="true">·</span>
                      )}
                      {article.author && <span>{article.author}</span>}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={article.subtitle || ''}
                        onChange={(e) =>
                          onUpdateArticle({ subtitle: e.target.value })
                        }
                        placeholder="添加卷次或副标题"
                        aria-label="副标题"
                        className="w-44 sm:w-52 text-right bg-transparent border-0 border-b border-transparent focus:border-border focus:outline-none text-[13px] text-muted-foreground placeholder:text-muted-foreground/45"
                      />
                      <span aria-hidden="true">·</span>
                      <input
                        type="text"
                        value={article.author || ''}
                        onChange={(e) =>
                          onUpdateArticle({ author: e.target.value })
                        }
                        placeholder="撰稿 / 编修落款"
                        aria-label="撰稿落款"
                        className="w-36 sm:w-44 text-left bg-transparent border-0 border-b border-transparent focus:border-border focus:outline-none text-[13px] text-muted-foreground placeholder:text-muted-foreground/45"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* TipTap Rich Text Canvas */}
              <div
                className="flex-1 cursor-text"
                onClick={() => {
                  if (!isPreview && editor && !editor.isFocused) {
                    editor.commands.focus();
                  }
                }}
              >
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Paper Running Footer */}
            <div className="px-10 sm:px-16 py-4 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums select-none">
              <span>{article.title || '谱文'}</span>
              <span>第 1 页 · 共约 {estimatedPages} 页</span>
            </div>
          </article>
        </div>
      </div>

      {/* Bottom Word Status Bar */}
      <div
        data-no-print="true"
        className="h-8 px-4 border-t border-border bg-background flex items-center justify-between gap-4 text-[12px] text-muted-foreground shrink-0 select-none"
      >
        <div className="flex items-center gap-3 min-w-0 tabular-nums">
          <span className="whitespace-nowrap">
            字数：{article.wordCount.toLocaleString()} 字
          </span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap hidden sm:inline">
            段落：{paragraphCount} 段
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="whitespace-nowrap hidden md:inline">
            约 {estimatedPages} 页
          </span>
          <span aria-hidden="true" className="hidden md:inline">
            ·
          </span>
          <span className="inline-flex items-center gap-1 text-foreground/75 whitespace-nowrap">
            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
            {saveState === 'saving'
              ? '保存中...'
              : `已自动保存 (${article.updatedAt})`}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 shrink-0 tabular-nums">
          <button
            type="button"
            onClick={() => stepZoom(-1)}
            disabled={zoom <= ZOOM_LEVELS[0]}
            title="缩小视图"
            aria-label="缩小视图"
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus size={12} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title="重置为 100%"
            className="px-1.5 h-6 rounded hover:bg-muted text-[11px] font-medium text-foreground cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => stepZoom(1)}
            disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            title="放大视图"
            aria-label="放大视图"
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
