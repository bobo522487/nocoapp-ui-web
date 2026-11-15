import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AssetColorTheme } from '../../../types';
import { ASSET_COLOR_PALETTES } from '../../../store/useWorkspaceStore';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { AppColoredIcon, ProjectColoredIcon } from '../../../components/common/NocoIcons';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export interface AssetEditorModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  kind: 'project' | 'app';
  initialValue?: {
    name: string;
    description?: string;
    colorTheme: AssetColorTheme;
  };
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    description: string;
    colorTheme: AssetColorTheme;
  }) => void;
}

export const AssetEditorModal: React.FC<AssetEditorModalProps> = ({
  open,
  mode,
  kind,
  initialValue,
  onClose,
  onSubmit,
}) => {
  const isDarkMode = usePreferencesStore((s) => s.isDarkMode);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorTheme, setColorTheme] = useState<AssetColorTheme>(
    kind === 'project' ? 'sky' : 'indigo'
  );

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setName(initialValue.name);
      setDescription(initialValue.description || '');
      setColorTheme(initialValue.colorTheme);
    } else {
      setName('');
      setDescription('');
      setColorTheme(kind === 'project' ? 'sky' : 'indigo');
    }
  }, [open, initialValue, kind]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const title =
    mode === 'create'
      ? kind === 'project'
        ? '新建项目'
        : '新建应用'
      : kind === 'project'
      ? '编辑项目信息'
      : '编辑应用信息';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      colorTheme,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X size={14} />
          </Button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="asset-editor-name">
              {kind === 'project' ? '项目名称' : '应用名称'}
            </Label>
            <Input
              id="asset-editor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                kind === 'project'
                  ? '例如：订单与仓储项目'
                  : '例如：售后工单门户'
              }
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asset-editor-desc">简介（可选）</Label>
            <Input
              id="asset-editor-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述用途..."
            />
          </div>

          <div className="space-y-2">
            <Label>图标配色</Label>
            <div className="flex items-center gap-2">
              {(Object.keys(ASSET_COLOR_PALETTES) as AssetColorTheme[]).map(
                (key) => {
                  const p = ASSET_COLOR_PALETTES[key];
                  const selected = colorTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setColorTheme(key)}
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
                      {kind === 'project' ? (
                        <ProjectColoredIcon colorTheme={key} className="w-4 h-4" />
                      ) : (
                        <AppColoredIcon colorTheme={key} className="w-4 h-4" />
                      )}
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
            <Button type="submit" size="sm" disabled={!name.trim()}>
              {mode === 'create' ? '立即创建' : '保存更改'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
