import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalShell,
} from '../../../components/ui/modal';
import { errorMessage } from '../../../lib/api';

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** 创建组织：成功后由调用方完成切换（spec FR-016）。失败抛错，弹窗内展示。 */
  onCreate: (name: string) => Promise<void>;
  /** 建议组织名（基于显示名 / 邮箱前缀），点击即可填入。 */
  suggestions: string[];
}

const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  suggestions,
}) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setError(null);
    setSaving(true);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      size="sm"
      zIndexClass="z-[95]"
      closeOnBackdrop={!saving}
      closeOnEsc={!saving}
      ariaLabel="新建组织"
    >
      <ModalHeader
        title="新建组织"
        onClose={() => {
          if (!saving) onClose();
        }}
        closeDisabled={saving}
      />

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col flex-1 min-h-0"
      >
        <ModalBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">组织名称</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：我的谱牒工作室"
              autoFocus
              maxLength={120}
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    className="rounded-md border border-border bg-[hsl(var(--surface-subtle))] px-2.5 py-1 text-[12px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            size="sm"
            disabled={saving}
          >
            取消
          </Button>
          <Button type="submit" size="sm" disabled={!name.trim() || saving}>
            {saving ? '创建中…' : '创建组织'}
          </Button>
        </ModalFooter>
      </form>
    </ModalShell>
  );
};

export default CreateWorkspaceDialog;
