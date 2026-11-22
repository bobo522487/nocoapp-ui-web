import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { AssetColorTheme } from '../../../types';
import {
  ASSET_COLOR_PALETTES,
  useWorkspaceStore,
} from '../../../store/useWorkspaceStore';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import {
  AppColoredIcon,
  ProjectColoredIcon,
} from '../../../components/common/NocoIcons';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  PlaceInput,
  formatGenealogyPlace,
  parsePlaceText,
  type GenealogyPlace,
} from '../../place-input';

export interface AssetEditorSubmitValues {
  name: string;
  description: string;
  colorTheme: AssetColorTheme;
  primarySurname?: string;
  ancestor?: string;
  region?: string;
  primaryName?: string;
  projectState?: '0' | '1';
  projectLevel?: number;
}

export interface AssetEditorModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  kind: 'project' | 'app';
  initialValue?: {
    name: string;
    description?: string;
    colorTheme: AssetColorTheme;
    primarySurname?: string;
    ancestor?: string;
    region?: string;
    primaryName?: string;
    projectState?: '0' | '1';
    projectLevel?: number;
  };
  /** 提交进行中：禁用提交按钮（由接入方驱动 API 请求）。 */
  submitting?: boolean;
  /** 提交失败的错误回显（如 409 冲突）。 */
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: AssetEditorSubmitValues) => void;
}

type HelpKey =
  | 'family-name'
  | 'family-surname'
  | 'family-founder'
  | 'family-hall'
  | 'family-location';

const HELP_CONTENT: Record<HelpKey, { title: string; body: string }> = {
  'family-name': {
    title: '家族名称说明',
    body: '建议采用「郡望/迁居地 + 姓氏」或族谱传统题名，例如「清河张氏」「义门陈氏宗谱」，将作为家族主名称展示。',
  },
  'family-surname': {
    title: '家族姓氏说明',
    body: '填写本谱核心主姓氏（如「张」「陈」），用于世系节点名讳排版与宗族档案归类。',
  },
  'family-founder': {
    title: '始迁祖说明',
    body: '填写迁居当地开基立业的第一世祖先名讳。新建家族时将自动在世系图谱中生成第一世「始迁祖」根节点。',
  },
  'family-hall': {
    title: '堂号说明',
    body: '家族宗祠或支派的传统堂号（如「百忍堂」「敦本堂」「颍川堂」），可选填，用于谱书封面与档案展示。',
  },
  'family-location': {
    title: '所在地区说明',
    body: '输入或选择家族主要聚居地、修谱祖籍所在的省市区县，或填写历史旧地名（可选填）。',
  },
};

type FieldErrors = {
  familyName?: string;
  familySurname?: string;
  ancestor?: string;
};

export const AssetEditorModal: React.FC<AssetEditorModalProps> = ({
  open,
  mode,
  kind,
  initialValue,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}) => {
  const isDarkMode = usePreferencesStore((s) => s.isDarkMode);

  // App modal state
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [appColorTheme, setAppColorTheme] = useState<AssetColorTheme>('indigo');
  const [appError, setAppError] = useState<string | null>(null);

  // Family project form state
  const [familyName, setFamilyName] = useState('');
  const [familySurname, setFamilySurname] = useState('');
  const [ancestor, setAncestor] = useState('');
  const [hallName, setHallName] = useState('');
  const [regionPlace, setRegionPlace] = useState<GenealogyPlace | null>(null);
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [activeHelp, setActiveHelp] = useState<HelpKey | null>(null);
  const helpContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setAppError(null);
    setActiveHelp(null);

    if (kind === 'app') {
      setAppName(initialValue?.name ?? '');
      setAppDescription(initialValue?.description ?? '');
      setAppColorTheme(initialValue?.colorTheme ?? 'indigo');
      return;
    }

    if (initialValue) {
      setFamilyName(initialValue.name || '');
      setFamilySurname(initialValue.primarySurname || '');
      setAncestor(initialValue.ancestor || '');
      setHallName(initialValue.primaryName || '');
      setRegionPlace(parsePlaceText(initialValue.region));
      setDescription(initialValue.description || '');
    } else {
      setFamilyName('');
      setFamilySurname('');
      setAncestor('');
      setHallName('');
      setRegionPlace(null);
      setDescription('');
    }
  }, [open, initialValue, kind]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeHelp) {
          setActiveHelp(null);
        } else if (!submitting) {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose, activeHelp, submitting]);

  useEffect(() => {
    if (!activeHelp) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-help-trigger]') || target.closest('[data-help-popover]')) {
        return;
      }
      setActiveHelp(null);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeHelp]);

  if (!open) return null;

  // Compact modal for App creation/editing
  if (kind === 'app') {
    const title = mode === 'create' ? '新建应用' : '编辑应用信息';
    const handleAppSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!appName.trim()) {
        setAppError('请输入应用名称');
        return;
      }
      onSubmit({
        name: appName.trim(),
        description: appDescription.trim(),
        colorTheme: appColorTheme,
      });
    };

    return createPortal(
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <AppColoredIcon colorTheme={appColorTheme} className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={onClose}
              aria-label="关闭弹窗"
            >
              <X size={14} />
            </Button>
          </div>

          <form onSubmit={handleAppSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-editor-name">应用名称</Label>
              <Input
                id="asset-editor-name"
                value={appName}
                onChange={(e) => {
                  setAppName(e.target.value);
                  if (appError) setAppError(null);
                }}
                placeholder="例如：售后工单门户"
                autoFocus
                required
              />
              {appError && (
                <p className="text-xs text-destructive">{appError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-editor-desc">简介（可选）</Label>
              <Input
                id="asset-editor-desc"
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                placeholder="简要描述用途..."
              />
            </div>

            <div className="space-y-2">
              <Label>图标配色</Label>
              <div className="flex items-center gap-2">
                {(Object.keys(ASSET_COLOR_PALETTES) as AssetColorTheme[]).map(
                  (key) => {
                    const p = ASSET_COLOR_PALETTES[key];
                    const selected = appColorTheme === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAppColorTheme(key)}
                        title={p.label}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all cursor-pointer ${
                          selected
                            ? 'border-primary scale-105'
                            : 'border-transparent hover:border-border'
                        }`}
                        style={{
                          backgroundColor: isDarkMode ? p.darkTileBg : p.tileBg,
                        }}
                      >
                        <AppColoredIcon colorTheme={key} className="w-4 h-4" />
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={!appName.trim()}>
                {mode === 'create' ? '立即创建' : '保存更改'}
              </Button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  const projectColorTheme = initialValue?.colorTheme ?? 'sky';
  const modalTitle = mode === 'create' ? '新建家族' : '编辑家族';

  const handleFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!familyName.trim()) nextErrors.familyName = '请输入家族名称';
    if (!familySurname.trim()) nextErrors.familySurname = '请输入家族姓氏';
    if (!ancestor.trim()) nextErrors.ancestor = '请录入始迁祖姓名';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const regionStr = formatGenealogyPlace(regionPlace).trim();

    onSubmit({
      name: familyName.trim(),
      description: description.trim(),
      colorTheme: projectColorTheme,
      primarySurname: familySurname.trim(),
      ancestor: ancestor.trim(),
      region: regionStr,
      primaryName: hallName.trim(),
      projectState: initialValue?.projectState ?? '0',
      projectLevel: initialValue?.projectLevel ?? 1,
    });
  };

  const renderHelpTrigger = (helpKey: HelpKey, ariaLabel: string) => {
    const isOpen = activeHelp === helpKey;
    const tip = HELP_CONTENT[helpKey];
    return (
      <span className="relative inline-flex items-center">
        <button
          type="button"
          className={`zy-help-btn inline-flex items-center justify-center w-4 h-4 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors cursor-pointer ${
            isOpen
              ? 'text-primary'
              : 'text-muted-foreground/70 hover:text-primary'
          }`}
          data-help={helpKey}
          data-help-trigger={helpKey}
          data-help-bound="1"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          onClick={() => setActiveHelp((prev) => (prev === helpKey ? null : helpKey))}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        {isOpen && (
          <div
            data-help-popover={helpKey}
            role="tooltip"
            className="absolute left-0 top-6 z-30 w-64 rounded-xl border border-border bg-popover text-popover-foreground p-3 shadow-[var(--shadow-popover)] text-left animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="text-[12px] font-semibold text-foreground mb-1">
              {tip.title}
            </div>
            <p className="text-[12px] font-normal leading-relaxed text-muted-foreground">
              {tip.body}
            </p>
          </div>
        )}
      </span>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-project-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      <div
        ref={helpContainerRef}
        className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card rounded-t-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isDarkMode
                  ? ASSET_COLOR_PALETTES[projectColorTheme].darkTileBg
                  : ASSET_COLOR_PALETTES[projectColorTheme].tileBg,
              }}
            >
              <ProjectColoredIcon
                colorTheme={projectColorTheme}
                className="w-4 h-4"
              />
            </div>
            <h3
              id="family-project-modal-title"
              className="text-[15px] font-semibold text-foreground truncate"
            >
              {modalTitle}
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full shrink-0"
            onClick={() => {
              if (!submitting) onClose();
            }}
            disabled={submitting}
            aria-label="关闭弹窗"
          >
            <X size={15} />
          </Button>
        </div>

        <form
          id="createFamilyForm"
          onSubmit={handleFamilySubmit}
          noValidate
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="familyNameInput"
                  className="flex items-center gap-1"
                >
                  <span>家族名称</span>
                  <span className="text-destructive">*</span>
                  {renderHelpTrigger('family-name', '家族名称说明')}
                </Label>
                <Input
                  id="familyNameInput"
                  name="familyName"
                  placeholder="如：清河张氏"
                  required
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={familyName}
                  onChange={(e) => {
                    setFamilyName(e.target.value);
                    if (errors.familyName) {
                      setErrors((prev) => ({ ...prev, familyName: undefined }));
                    }
                  }}
                  className={
                    errors.familyName
                      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                      : ''
                  }
                />
                {errors.familyName && (
                  <p className="text-[12px] text-destructive">{errors.familyName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="familySurnameInput"
                  className="flex items-center gap-1"
                >
                  <span>家族姓氏</span>
                  <span className="text-destructive">*</span>
                  {renderHelpTrigger('family-surname', '家族姓氏说明')}
                </Label>
                <Input
                  id="familySurnameInput"
                  name="familySurname"
                  placeholder="如：张"
                  required
                  type="text"
                  autoComplete="off"
                  value={familySurname}
                  onChange={(e) => {
                    setFamilySurname(e.target.value);
                    if (errors.familySurname) {
                      setErrors((prev) => ({ ...prev, familySurname: undefined }));
                    }
                  }}
                  className={
                    errors.familySurname
                      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                      : ''
                  }
                />
                {errors.familySurname && (
                  <p className="text-[12px] text-destructive">
                    {errors.familySurname}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="familyAncestorInput"
                className="flex items-center gap-1"
              >
                <span>始迁祖</span>
                <span className="text-destructive">*</span>
                {renderHelpTrigger('family-founder', '始迁祖说明')}
              </Label>
              <Input
                id="familyAncestorInput"
                name="ancestor"
                placeholder="录入始迁祖姓名"
                required
                type="text"
                autoComplete="off"
                value={ancestor}
                onChange={(e) => {
                  setAncestor(e.target.value);
                  if (errors.ancestor) {
                    setErrors((prev) => ({ ...prev, ancestor: undefined }));
                  }
                }}
                className={
                  errors.ancestor
                    ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                    : ''
                }
              />
              {errors.ancestor && (
                <p className="text-[12px] text-destructive">{errors.ancestor}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="familyHallNameInput"
                  className="flex items-center gap-1"
                >
                  <span>堂号</span>
                  {renderHelpTrigger('family-hall', '堂号说明')}
                </Label>
                <Input
                  id="familyHallNameInput"
                  name="hallName"
                  placeholder="如：百忍堂"
                  type="text"
                  autoComplete="off"
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="familyLocationInput"
                  className="flex items-center gap-1"
                >
                  <span>所在地区</span>
                  {renderHelpTrigger('family-location', '所在地区说明')}
                </Label>
                <PlaceInput
                  id="familyLocationInput"
                  label="所在地区"
                  value={regionPlace}
                  onChange={setRegionPlace}
                  placeholder="输入省市区县或原始地名"
                  className="h-9 text-[13px] bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="familyDescriptionInput" className="block">
                家族简介
              </Label>
              <Textarea
                id="familyDescriptionInput"
                name="description"
                placeholder="简要描述家族历史及现状..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none min-h-[76px] shadow-[var(--shadow-control)] focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-[12px] text-destructive bg-destructive/5 border border-destructive/30 rounded-md px-3 py-2"
              >
                {error}
              </p>
            )}
          </div>

          <div className="px-6 py-3.5 border-t border-border bg-[hsl(var(--surface-subtle))] rounded-b-xl flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-9 font-medium"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-9 font-medium"
            >
              {submitting ? '保存中...' : '确认'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
