import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from '@tanstack/react-router';
import {
  Bell,
  BookOpen,
  CheckCheck,
  HelpCircle,
  Home,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import ProfileSettingsDialog from '../../features/profile/components/ProfileSettingsDialog';
import { ThemeMode } from '../../types';
import { Button } from '../ui/button';

interface UserAvatarMenuProps {
  variant?: 'sidebar' | 'rail';
}

export const UserAvatarMenu: React.FC<UserAvatarMenuProps> = ({
  variant = 'sidebar',
}) => {
  const navigate = useNavigate();
  const user = usePreferencesStore((s) => s.user);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const signOut = useAuthStore((s) => s.signOut);

  const notifications = useWorkspaceStore((s) => s.notifications);
  const markNotificationRead = useWorkspaceStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useWorkspaceStore((s) => s.markAllNotificationsRead);

  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'help' | 'docs' | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setIsAvatarOpen(false);
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAvatarOpen(false);
        setIsNotifOpen(false);
        setInfoModal(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const avatarInitial = (user.name || '用').trim().slice(0, 1).toUpperCase();

  const themeOptions: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
    { id: 'system', label: '跟随系统', icon: Monitor },
    { id: 'light', label: '宣纸明韵', icon: Sun },
    { id: 'dark', label: '墨石夜览', icon: Moon },
  ];

  const handleLogout = async () => {
    setIsAvatarOpen(false);
    try {
      await signOut();
    } finally {
      void navigate({ to: '/login', replace: true });
    }
  };

  const renderInfoModal = () =>
    infoModal &&
    createPortal(
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          onClick={() => setInfoModal(null)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={infoModal === 'help' ? '快捷键与使用帮助' : '工作区使用文档'}
          className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-popover)]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-editorial text-lg font-semibold text-foreground">
              {infoModal === 'help' ? '快捷键与使用帮助' : '云谱工作区指南'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setInfoModal(null)}
              aria-label="关闭"
            >
              <X size={15} />
            </Button>
          </div>
          {infoModal === 'help' ? (
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span>打开全局快速搜索</span>
                <kbd className="px-2 py-0.5 rounded border border-border bg-[hsl(var(--surface-subtle))] text-foreground font-mono">
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span>点击「家族」卡片</span>
                <span className="text-foreground">进入世系、谱文与谱书编修</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>左下角头像菜单</span>
                <span className="text-foreground">切换宣纸明韵与墨石夜览</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <p>1. 在「世系」中可维护家族世系图谱、支派房系与成员生平详情。</p>
              <p>2. 在「谱文」中可分卷撰写谱序、凡例、源流、家训及人物传记。</p>
              <p>3. 在「谱书」中可组装四段式目录、定制欧苏版式并生成可翻页谱例。</p>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button size="sm" onClick={() => setInfoModal(null)}>
              知道了
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );

  const userMenuPopover = isAvatarOpen && (
    <div
      data-side={variant === 'rail' ? 'right' : 'top'}
      data-align="start"
      role="dialog"
      aria-label="账号菜单"
      className={
        variant === 'rail'
          ? 'absolute bottom-0 left-full ml-2 w-[288px] p-1.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] z-[85]'
          : 'absolute bottom-full left-0 mb-2 w-[288px] p-1.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] z-[80]'
      }
    >
      <div className="flex flex-col" role="menu">
        {/* Account Settings Header Row */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setIsAvatarOpen(false);
            setIsSettingsOpen(true);
          }}
          className="flex flex-row items-center justify-between w-full px-2.5 py-2 rounded-lg hover:bg-[hsl(var(--surface-hover))] transition-colors gap-3 text-left cursor-pointer"
        >
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-foreground truncate">
              {user.name || '未命名用户'}
            </div>
            <div className="text-[12px] text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
          <Settings size={15} className="flex-none text-muted-foreground" />
        </button>

        <hr className="my-1.5 -mx-1.5 border-border" />

        {/* Theme Segmented Control Row */}
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[13px] font-medium text-foreground">
          <span>界面主题</span>
          <div
            role="radiogroup"
            aria-label="主题切换"
            className="inline-flex items-center rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-0.5 gap-0.5"
          >
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={opt.label}
                  aria-label={opt.label}
                  onClick={() => setThemeMode(opt.id)}
                  className={`w-7 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                    active
                      ? 'bg-card text-primary shadow-[var(--shadow-control)] border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={13} />
                </button>
              );
            })}
          </div>
        </div>

        <hr className="my-1.5 -mx-1.5 border-border" />

        {/* Home Page */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setIsAvatarOpen(false);
            void navigate({ to: '/home' });
          }}
          className="flex items-center justify-between w-full h-8 px-2.5 rounded-md text-[13px] font-medium text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer"
        >
          <span>首页</span>
          <Home size={15} className="text-muted-foreground" />
        </button>

        {/* Help */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setIsAvatarOpen(false);
            setInfoModal('help');
          }}
          className="flex items-center justify-between w-full h-8 px-2.5 rounded-md text-[13px] font-medium text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer"
        >
          <span>帮助</span>
          <HelpCircle size={15} className="text-muted-foreground" />
        </button>

        {/* Docs */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setIsAvatarOpen(false);
            setInfoModal('docs');
          }}
          className="flex items-center justify-between w-full h-8 px-2.5 rounded-md text-[13px] font-medium text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer"
        >
          <span>文档</span>
          <BookOpen size={15} className="text-muted-foreground" />
        </button>

        <hr className="my-1.5 -mx-1.5 border-border" />

        {/* Log Out */}
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="flex items-center justify-between w-full h-8 px-2.5 rounded-md text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <span>退出登录</span>
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );

  if (variant === 'rail') {
    return (
      <>
        <div ref={menuContainerRef} className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsAvatarOpen((v) => !v)}
            data-testid="nc-sidebar-userinfo"
            title={`${user.name} (${user.email})`}
            aria-label="打开账号菜单"
            aria-expanded={isAvatarOpen}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold bg-primary text-primary-foreground select-none shadow-xs">
              {avatarInitial}
            </div>
          </button>
          {userMenuPopover}
        </div>

        <ProfileSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {renderInfoModal()}
      </>
    );
  }

  return (
    <>
      <div className="flex-none border-t border-border px-2.5 py-2 bg-[hsl(var(--surface-subtle))]">
        <div className="flex items-center gap-1">
          {/* User Trigger + Top-Start Popover */}
          <div ref={menuContainerRef} className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => {
                setIsAvatarOpen((v) => !v);
                setIsNotifOpen(false);
              }}
              data-testid="nc-sidebar-userinfo"
              aria-expanded={isAvatarOpen}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer min-w-0 transition-colors hover:bg-[hsl(var(--surface-hover))] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="w-7 h-7 rounded-md flex-none flex items-center justify-center text-[12px] font-semibold bg-primary text-primary-foreground select-none shadow-xs">
                {avatarInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-[13px] leading-4 font-semibold text-foreground">
                  {user.name || '未命名用户'}
                </div>
                <div className="truncate text-[11px] leading-4 font-medium text-muted-foreground mt-0.5">
                  {user.email}
                </div>
              </div>
            </button>

            {userMenuPopover}
          </div>

          {/* Notification Bell Button */}
          <div ref={notifContainerRef} className="relative flex-none">
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen((v) => !v);
                setIsAvatarOpen(false);
              }}
              data-testid="nc-home-sidebar-notification"
              title={unreadCount > 0 ? `通知 (${unreadCount} 条未读)` : '通知'}
              aria-label={unreadCount > 0 ? `通知，${unreadCount} 条未读` : '通知'}
              aria-expanded={isNotifOpen}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isNotifOpen
                  ? 'bg-card text-foreground border border-border shadow-[var(--shadow-control)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))]'
              }`}
            >
              <Bell size={16} strokeWidth={1.7} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-semibold tabular-nums flex items-center justify-center leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-[316px] rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-popover)] z-[80] overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-[hsl(var(--surface-subtle))]">
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    工作区通知 · {unreadCount} 未读
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      <CheckCheck size={12} /> 全部已读
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      暂无通知消息
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className={`w-full text-left px-3.5 py-2.5 cursor-pointer hover:bg-[hsl(var(--surface-hover))] transition-colors ${
                          !n.read ? 'bg-accent/35' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono tabular-nums">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {n.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {renderInfoModal()}
    </>
  );
};

export default UserAvatarMenu;
