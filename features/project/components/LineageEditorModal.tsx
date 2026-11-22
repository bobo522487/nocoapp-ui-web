import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GitFork, Pencil, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  PlaceInput,
  formatGenealogyPlace,
  parsePlaceText,
  type GenealogyPlace,
} from '../../place-input';
import type { LineageChartMeta } from '../../../store/useLineageStore';

export interface LineageEditorModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValue?: Partial<LineageChartMeta>;
  onClose: () => void;
  onSubmit: (values: LineageChartMeta) => void;
}

type FieldErrors = {
  name?: string;
  surname?: string;
  progenitor?: string;
};

export const LineageEditorModal: React.FC<LineageEditorModalProps> = ({
  open,
  mode,
  initialValue,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [hallName, setHallName] = useState('');
  const [progenitor, setProgenitor] = useState('');
  const [regionPlace, setRegionPlace] = useState<GenealogyPlace | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(initialValue?.name ?? '');
    setSurname(initialValue?.surname ?? '');
    setHallName(initialValue?.hallName ?? '');
    setProgenitor(initialValue?.progenitor ?? '');
    setRegionPlace(parsePlaceText(initialValue?.region));
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const modalTitle = mode === 'create' ? '新建世系' : '编辑世系';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = '请输入世系名称';
    if (!surname.trim()) nextErrors.surname = '请输入姓氏';
    if (!progenitor.trim()) nextErrors.progenitor = '请输入始祖姓名';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const region = formatGenealogyPlace(regionPlace).trim();

    onSubmit({
      name: name.trim(),
      surname: surname.trim(),
      hallName: hallName.trim() || undefined,
      progenitor: progenitor.trim(),
      region: region || undefined,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lineageModalTitle"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-[500px] rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card">
          <h3
            id="lineageModalTitle"
            className="text-[15px] font-semibold text-foreground flex items-center gap-2.5 min-w-0"
          >
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {mode === 'create' ? (
                <GitFork className="w-4 h-4" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
            </span>
            <span id="lineageModalTitleText" className="truncate">
              {modalTitle}
            </span>
          </h3>
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

        <form
          id="addLineageForm"
          data-mode={mode === 'create' ? 'add' : 'edit'}
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="p-6 space-y-4">
            {/* 世系名称 */}
            <div className="space-y-1.5">
              <Label
                htmlFor="addLineageName"
                className="flex items-center gap-1"
              >
                <span>世系名称</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="addLineageName"
                placeholder="请输入世系名称"
                required
                type="text"
                autoFocus
                autoComplete="off"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                className={
                  errors.name
                    ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                    : ''
                }
              />
              {errors.name && (
                <p className="text-[12px] text-destructive">{errors.name}</p>
              )}
            </div>

            {/* 姓 (4) + 堂号 (8) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4 space-y-1.5">
                <Label
                  htmlFor="addLineageSurname"
                  className="flex items-center gap-1"
                >
                  <span>姓</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="addLineageSurname"
                  placeholder="如：张"
                  required
                  type="text"
                  autoComplete="off"
                  value={surname}
                  onChange={(e) => {
                    setSurname(e.target.value);
                    if (errors.surname) {
                      setErrors((prev) => ({ ...prev, surname: undefined }));
                    }
                  }}
                  className={
                    errors.surname
                      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                      : ''
                  }
                />
                {errors.surname && (
                  <p className="text-[12px] text-destructive">
                    {errors.surname}
                  </p>
                )}
              </div>

              <div className="sm:col-span-8 space-y-1.5">
                <Label htmlFor="addLineageHall" className="block">
                  堂号
                </Label>
                <Input
                  id="addLineageHall"
                  placeholder="如：清河堂"
                  type="text"
                  autoComplete="off"
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                />
              </div>
            </div>

            {/* 始祖 */}
            <div className="space-y-1.5">
              <Label
                htmlFor="addLineageProgenitor"
                className="flex items-center gap-1"
              >
                <span>始祖</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="addLineageProgenitor"
                placeholder="请输入始祖姓名"
                required
                type="text"
                autoComplete="off"
                value={progenitor}
                onChange={(e) => {
                  setProgenitor(e.target.value);
                  if (errors.progenitor) {
                    setErrors((prev) => ({ ...prev, progenitor: undefined }));
                  }
                }}
                className={
                  errors.progenitor
                    ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                    : ''
                }
              />
              {errors.progenitor && (
                <p className="text-[12px] text-destructive">
                  {errors.progenitor}
                </p>
              )}
            </div>

            {/* 所在地区 */}
            <div className="space-y-1.5">
              <Label htmlFor="addLineageRegion" className="block">
                所在地区
              </Label>
              <PlaceInput
                id="addLineageRegion"
                label="所在地区"
                value={regionPlace}
                onChange={setRegionPlace}
                placeholder="输入省市区县（如 江西泰和）或原始地名，或点右侧选择"
                className="h-9 text-[13px] bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                支持输入省市区县联想匹配，或点击右侧图标精确选择与填写原始记载
              </p>
            </div>
          </div>

          <div className="px-6 py-3.5 border-t border-border bg-[hsl(var(--surface-subtle))] flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 font-medium"
            >
              取消
            </Button>
            <Button
              id="lineageModalSubmitBtn"
              type="submit"
              className="flex-1 h-9 font-medium"
            >
              确认
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
