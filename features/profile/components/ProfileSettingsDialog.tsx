import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Palette,
  Moon,
  Sun,
  Monitor,
  Check,
} from 'lucide-react';
import { ThemeMode } from '../../../types';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Separator } from '../../../components/ui/separator';

interface ProfileSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance'>('general');
  const [isMounted, setIsMounted] = useState(false);

  const user = usePreferencesStore((s) => s.user);
  const updateUser = usePreferencesStore((s) => s.updateUser);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setBio(user.bio || '');
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isMounted || !isOpen) return null;

  const handleSave = () => {
    updateUser({ name, bio });
    onClose();
  };

  const avatarInitial = (name || '用').trim().slice(0, 1).toUpperCase();

  const modeOptions: {
    id: ThemeMode;
    label: string;
    desc: string;
    icon: React.ElementType;
  }[] = [
    { id: 'light', label: '青蓝明韵', desc: '纯净冷白与浅灰底色，青蓝主色标识', icon: Sun },
    { id: 'dark', label: '深石板夜览', desc: '深石板青灰护眼底色与柔化青蓝高亮', icon: Moon },
    { id: 'system', label: '跟随系统', desc: '依据设备明暗设置自动切换', icon: Monitor },
  ];

  const content = (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="账号设置"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-[620px] h-[510px] bg-card rounded-xl shadow-[var(--shadow-popover)] flex overflow-hidden border border-border">
        <div className="w-[176px] bg-[hsl(var(--surface-subtle))] border-r border-border p-4 flex flex-col gap-1 shrink-0">
          <h2 className="font-editorial text-[15px] font-semibold mb-3 px-2 text-foreground">
            账号设置
          </h2>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-[hsl(var(--surface-active))] text-foreground border border-primary/20 shadow-[var(--shadow-control)] font-semibold'
                : 'text-muted-foreground border border-transparent hover:bg-[hsl(var(--surface-hover))] hover:text-foreground'
            }`}
          >
            <User size={15} className={activeTab === 'general' ? 'text-primary' : ''} />
            <span>个人资料</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-[hsl(var(--surface-active))] text-foreground border border-primary/20 shadow-[var(--shadow-control)] font-semibold'
                : 'text-muted-foreground border border-transparent hover:bg-[hsl(var(--surface-hover))] hover:text-foreground'
            }`}
          >
            <Palette size={15} className={activeTab === 'appearance' ? 'text-primary' : ''} />
            <span>外观与阅读</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-card">
            <h3 className="font-editorial text-base font-semibold text-foreground">
              {activeTab === 'general' ? '个人资料' : '外观与阅读'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
              aria-label="关闭"
            >
              <X size={16} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-primary text-primary-foreground text-xl font-editorial font-semibold shadow-sm">
                    {avatarInitial}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{name || '未命名成员'}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.role || '工作区成员'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name">显示名称</Label>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-email">邮箱地址</Label>
                    <Input
                      id="profile-email"
                      value={user.email}
                      disabled
                      className="max-w-sm bg-muted/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-bio">个人简介</Label>
                    <Input
                      id="profile-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="max-w-sm"
                      placeholder="介绍一下你自己"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div>
                    <Label>青蓝明韵与深石板夜览双态主题</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      专为长时间宗谱编修调校的纯净冷白亮色与低刺眼深石板夜览配色。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {modeOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = themeMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setThemeMode(opt.id)}
                          className={`flex items-center gap-3.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'border-primary bg-card shadow-[var(--shadow-control)]'
                              : 'border-border bg-card/60 hover:bg-card hover:border-[hsl(var(--border-strong))]'
                          }`}
                        >
                          {/* Mini swatch preview */}
                          <div
                            className={`w-11 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                              opt.id === 'dark'
                                ? 'bg-[#161B21] border-[#2C3540] text-[#58B1CD]'
                                : opt.id === 'light'
                                  ? 'bg-[#F5F6F6] border-[#D8DADA] text-[#057091]'
                                  : 'bg-gradient-to-br from-[#F5F6F6] via-[#F5F6F6] to-[#161B21] border-border text-foreground'
                            }`}
                          >
                            <Icon size={15} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-foreground">
                              {opt.label}
                            </div>
                            <div className="text-[12px] text-muted-foreground truncate">
                              {opt.desc}
                            </div>
                          </div>

                          {active && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <Check size={12} className="text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">
                    排版预览
                  </div>
                  <div className="font-editorial text-[17px] font-semibold text-foreground">
                    义门陈氏宗谱 · 世系流芳
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    标题采用衬线体营造书卷典藏感，菜单、表格与表单采用高清晰无衬线体与等宽对齐数字（2026 · 第 18 世）。
                  </p>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'general' && (
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-card">
              <Button variant="ghost" onClick={onClose}>
                取消
              </Button>
              <Button onClick={handleSave}>保存更改</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ProfileSettingsDialog;
