import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AssetColorTheme } from '../../../types';
import {
  ASSET_COLOR_PALETTES,
} from '../../../store/useWorkspaceStore';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import {
  AppColoredIcon,
  ProjectColoredIcon,
} from '../../../components/common/NocoIcons';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  formatGenealogyPlace,
  parsePlaceText,
  type GenealogyPlace,
} from '../../place-input';
import {
  FamilyProfileFields,
  validateFamilyProfile,
  type FamilyFieldErrors,
  type FamilyProfileFormValues,
} from '../../project/components/FamilyProfileFields';

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

  const [errors, setErrors] = useState<FamilyFieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setAppError(null);

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
        if (document.querySelector('[data-help-popover]')) {
          return;
        }
        if (!submitting) {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose, submitting]);

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
    const nextErrors = validateFamilyProfile({
      familyName,
      familySurname,
      ancestor,
    });

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

  const handleFieldsChange = (patch: Partial<FamilyProfileFormValues>) => {
    if (patch.familyName !== undefined) setFamilyName(patch.familyName);
    if (patch.familySurname !== undefined) setFamilySurname(patch.familySurname);
    if (patch.ancestor !== undefined) setAncestor(patch.ancestor);
    if (patch.hallName !== undefined) setHallName(patch.hallName);
    if (patch.regionPlace !== undefined) setRegionPlace(patch.regionPlace);
    if (patch.description !== undefined) setDescription(patch.description);
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

      <div className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-150">
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
            <FamilyProfileFields
              values={{
                familyName,
                familySurname,
                ancestor,
                hallName,
                regionPlace,
                description,
              }}
              errors={errors}
              onChange={handleFieldsChange}
              onClearError={(field) =>
                setErrors((prev) => ({ ...prev, [field]: undefined }))
              }
              disabled={submitting}
              autoFocusName
            />

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
