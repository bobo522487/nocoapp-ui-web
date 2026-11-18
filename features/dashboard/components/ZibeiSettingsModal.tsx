import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

interface ZibeiSettingsModalProps {
  open: boolean;
  familyName: string;
  surname?: string | null;
  initialWords: string[];
  onClose: () => void;
  onSave: (words: string[]) => void;
}

function parseZibeiInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  // 如果包含空白或常见标点，按分隔符拆词；否则逐字拆分为单字辈分
  if (/[\s,，、;；|/\n]+/.test(trimmed)) {
    return trimmed
      .split(/[\s,，、;；|/\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return Array.from(trimmed).filter((ch) => ch.trim().length > 0);
}

export const ZibeiSettingsModal: React.FC<ZibeiSettingsModalProps> = ({
  open,
  familyName,
  surname,
  initialWords,
  onClose,
  onSave,
}) => {
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    if (open) {
      setRawText(initialWords.join(' '));
    }
  }, [open, initialWords]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const parsedWords = useMemo(() => parseZibeiInput(rawText), [rawText]);

  if (!open) return null;

  const surnameChar = (surname?.trim() || familyName.trim().slice(0, 1) || '谱').slice(0, 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(parsedWords);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zibei-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-[var(--shadow-popover)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[hsl(var(--surface-active))] border border-primary/25 text-primary font-editorial font-bold text-sm flex items-center justify-center shrink-0">
              {surnameChar}
            </div>
            <div className="min-w-0">
              <h3
                id="zibei-modal-title"
                className="font-editorial text-[15px] font-semibold text-foreground truncate"
              >
                设置字辈 · {familyName}
              </h3>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full shrink-0"
            onClick={onClose}
            aria-label="关闭弹窗"
          >
            <X size={15} />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="zibei-sequence-input">字辈排行序列</Label>
              <Textarea
                id="zibei-sequence-input"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={3}
                autoFocus
                placeholder="请输入字辈用字，可用空格或逗号分隔（例如：忠 厚 传 家 久 诗 书 继 世 长）"
                className="resize-none font-serif text-[15px] leading-relaxed"
              />
              <p className="text-[12px] text-muted-foreground">
                支持空格、逗号分隔或连续输入，系统将按输入顺序依次对应第一世至第 {Math.max(parsedWords.length, 1)} 世。
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-muted-foreground">
                  世次对照预览（共 {parsedWords.length} 世）
                </span>
                {parsedWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                  >
                    清空重填
                  </button>
                )}
              </div>

              {parsedWords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-[hsl(var(--surface-subtle))/0.6] px-4 py-6 text-center text-[12px] text-muted-foreground">
                  暂未录入字辈，可在上方输入传统堂训或五言/七言字辈诗。
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto p-2.5 rounded-lg border border-border bg-[hsl(var(--surface-subtle))/0.55]">
                  {parsedWords.map((word, idx) => (
                    <div
                      key={`${idx}-${word}`}
                      className="rounded-md border border-border bg-card px-2 py-1.5 text-center"
                    >
                      <div className="text-[10px] text-muted-foreground font-mono tabular-nums">
                        第{idx + 1}世
                      </div>
                      <div className="font-editorial text-[15px] font-semibold text-foreground mt-0.5">
                        {word}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border bg-[hsl(var(--surface-subtle))] flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" size="sm">
              保存字辈
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
