
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Palette, Moon, Sun, Triangle, Database, MessageSquare, Code, Check } from 'lucide-react';
import { useAppStore, AppTheme } from '../../../store/useAppStore';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { Separator } from "../../../components/ui/separator";

interface ProfileSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance'>('general');
  const [isMounted, setIsMounted] = useState(false);
  const { user, updateUser, theme, setAppTheme, isDarkMode, toggleTheme } = useAppStore();

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

  if (!isMounted) return null;

  const handleSave = () => {
      updateUser({ name, bio });
      onClose();
  };

  const getInitials = (name: string) => {
      return name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
  };

  const themes: { id: AppTheme; label: string; icon: any; color: string }[] = [
    { id: 'vercel', label: 'Vercel', icon: Triangle, color: 'bg-black text-white' },
    { id: 'supabase', label: 'Supabase', icon: Database, color: 'bg-emerald-500 text-white' },
    { id: 'slack', label: 'Slack', icon: MessageSquare, color: 'bg-purple-800 text-white' },
    { id: 'vscode', label: 'VS Code', icon: Code, color: 'bg-blue-500 text-white' },
  ];

  const content = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-background rounded-xl shadow-2xl z-[70] flex overflow-hidden border border-border transform transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {/* Sidebar */}
        <div className="w-[180px] bg-muted/30 border-r border-border p-4 flex flex-col gap-1">
            <h2 className="text-sm font-semibold mb-4 px-2">Settings</h2>
            
            <button
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'general' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
                <User size={16} /> General
            </button>
            <button
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'appearance' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
                <Palette size={16} /> Appearance
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
            <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
                <h3 className="text-lg font-medium">{activeTab === 'general' ? 'Profile' : 'Appearance'}</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                    <X size={18} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-primary-foreground text-xl font-bold shadow-md">
                                {getInitials(name)}
                            </div>
                            <div>
                                <h4 className="font-medium text-foreground">{name}</h4>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </div>
                        
                        <Separator />

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Display Name</Label>
                                <Input 
                                    id="name" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    className="max-w-sm"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email" 
                                    value={user.email} 
                                    disabled 
                                    className="max-w-sm bg-muted/50"
                                />
                                <p className="text-[10px] text-muted-foreground">Email cannot be changed.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Input 
                                    id="bio" 
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="max-w-sm"
                                    placeholder="Tell us about yourself"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-6">
                        {/* Dark Mode */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <div className="text-sm font-medium flex items-center gap-2">
                                    {isDarkMode ? <Moon size={16} /> : <Sun size={16} />} 
                                    Dark Mode
                                </div>
                                <p className="text-xs text-muted-foreground">Adjust the appearance of the application.</p>
                            </div>
                            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
                        </div>

                        <Separator />

                        {/* Themes */}
                        <div className="space-y-3">
                            <Label>Theme Preference</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {themes.map((t) => (
                                    <div 
                                        key={t.id}
                                        onClick={() => setAppTheme(t.id)}
                                        className={`
                                            relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                                            ${theme === t.id ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/40 hover:bg-muted'}
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${t.color}`}>
                                            <t.icon size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{t.label}</p>
                                        </div>
                                        {theme === t.id && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                <Check size={12} className="text-primary-foreground" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            {activeTab === 'general' && (
                <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default ProfileSettingsDialog;
