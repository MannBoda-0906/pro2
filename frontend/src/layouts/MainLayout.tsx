import React from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export interface MainLayoutProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
  historyCount: number;
  hasActiveVideo: boolean;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  theme,
  onToggleTheme,
  onOpenHistory,
  onOpenSettings,
  onGoHome,
  historyCount,
  hasActiveVideo,
  children
}) => {
  return (
    <div className="min-h-screen flex flex-col text-[#17172D] transition-colors relative">
      <Header
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenHistory={onOpenHistory}
        onOpenSettings={onOpenSettings}
        onGoHome={onGoHome}
        historyCount={historyCount}
        hasActiveVideo={hasActiveVideo}
      />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default MainLayout;
