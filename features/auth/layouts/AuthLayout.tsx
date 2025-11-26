import React from 'react';
import { Blocks, Moon, Sun } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { useAppStore } from "../../../store/useAppStore";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const { isDarkMode, toggleTheme } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 animate-in fade-in duration-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none"
             style={{
                 backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
                 backgroundSize: '24px 24px'
             }}
        ></div>

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-10">
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full hover:bg-background/50"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
        </div>

      <div className="w-full max-w-[400px] space-y-6 z-10">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-primary/20">
            <Blocks size={28} className="text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="bg-card text-card-foreground border border-border/50 rounded-xl shadow-xl p-8">
            {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;