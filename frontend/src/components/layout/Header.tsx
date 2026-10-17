import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  History,
  Settings,
  Moon,
  Sun,
  Monitor,
  Check,
  Sparkles,
  Home,
  Brain,
  Target,
  User
} from 'lucide-react';

export type SpatialNavSection = 'home' | 'ai-tutor' | 'practice' | 'my-learning' | 'profile';

interface HeaderProps {
  theme: 'light' | 'dark';
  themeMode?: 'light' | 'dark' | 'system';
  onSelectThemeMode?: (mode: 'light' | 'dark' | 'system') => void;
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
  historyCount: number;
  hasActiveVideo: boolean;
  activeSection?: SpatialNavSection;
  onNavigateSection?: (section: SpatialNavSection) => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  themeMode = 'system',
  onSelectThemeMode,
  onToggleTheme,
  onOpenHistory,
  onOpenSettings,
  onGoHome,
  historyCount,
  hasActiveVideo,
  activeSection = 'home',
  onNavigateSection
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeMenuOpen]);

  const handleNavClick = (section: SpatialNavSection) => {
    if (onNavigateSection) {
      onNavigateSection(section);
    } else {
      if (section === 'home') onGoHome();
      else if (section === 'my-learning') onOpenHistory();
      else if (section === 'profile') onOpenSettings();
    }
  };

  return (
    <header className="sticky top-3 z-40 w-full max-w-7xl mx-auto px-3 sm:px-6 mb-4">
      <div className="w-full backdrop-blur-xl bg-white/85 border border-[#DFE1F0] rounded-2xl shadow-floating px-3 sm:px-6 h-16 flex items-center justify-between transition-all">
        {/* Lumora AI Logo */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B46E8] rounded-xl p-1 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-[#E7E7FF] transition-all">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#17172D]">
                Lumora
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#EEEEFF] text-[#4938C8] border border-[#DFE1F0]">
                <Sparkles className="w-2.5 h-2.5 text-[#5B46E8]" /> AI
              </span>
            </div>
            <p className="text-[11px] text-[#666A83] font-medium hidden md:block">
              Spatial Learning & Education Platform
            </p>
          </div>
        </button>

        {/* Central Spatial Navigation Bar (Layer 2 Elevated Frosted Glass) */}
        <nav className="hidden md:flex items-center p-1 rounded-full bg-[#F8F9FD]/80 border border-[#DFE1F0] gap-1 shadow-xs">
          <button
            onClick={() => handleNavClick('home')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeSection === 'home'
                ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                : 'text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF]/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleNavClick('ai-tutor')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeSection === 'ai-tutor'
                ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                : 'text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF]/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI Tutor</span>
          </button>

          <button
            onClick={() => handleNavClick('practice')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeSection === 'practice'
                ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                : 'text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF]/60'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Practice</span>
          </button>

          <button
            onClick={() => handleNavClick('my-learning')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeSection === 'my-learning'
                ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                : 'text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF]/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Learning</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#4938C8] text-white leading-tight">
                {historyCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeSection === 'profile'
                ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                : 'text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF]/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {hasActiveVideo && (
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#DFE1F0] text-[#4938C8] hover:bg-[#EEEEFF] shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              + New Video
            </button>
          )}

          {/* History Button (Visible on mobile when nav is compact) */}
          <button
            onClick={onOpenHistory}
            className="md:hidden relative flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF] transition-all active:scale-95"
            title="Saved study lessons and history"
          >
            <History className="w-4 h-4 text-[#4938C8]" />
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#4938C8] text-white leading-tight shadow-xs">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings / Profile Button */}
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF] transition-all active:scale-95"
            title="AI Model & Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 3-Way Theme Mode Toggle: Light, Dark, System */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen(prev => !prev)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF] transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B46E8]"
              title={`Theme: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} (Click to select Light, Dark, or System)`}
              aria-label="Select theme mode"
              aria-expanded={isThemeMenuOpen}
            >
              {themeMode === 'system' ? (
                <Monitor className="w-4 h-4 text-[#4938C8]" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4 text-[#5B46E8]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border border-[#DFE1F0] shadow-floating p-1.5 z-50 animate-fade-in">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#666A83]">
                  Theme Mode
                </div>

                <button
                  onClick={() => {
                    if (onSelectThemeMode) onSelectThemeMode('light');
                    else onToggleTheme();
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    themeMode === 'light'
                      ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                      : 'text-[#17172D] hover:bg-[#EEEEFF]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Light</span>
                  </div>
                  {themeMode === 'light' && <Check className="w-3.5 h-3.5 text-[#5B46E8]" />}
                </button>

                <button
                  onClick={() => {
                    if (onSelectThemeMode) onSelectThemeMode('dark');
                    else onToggleTheme();
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    themeMode === 'dark'
                      ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                      : 'text-[#17172D] hover:bg-[#EEEEFF]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-[#5B46E8]" />
                    <span>Dark</span>
                  </div>
                  {themeMode === 'dark' && <Check className="w-3.5 h-3.5 text-[#5B46E8]" />}
                </button>

                <button
                  onClick={() => {
                    if (onSelectThemeMode) onSelectThemeMode('system');
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    themeMode === 'system'
                      ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                      : 'text-[#17172D] hover:bg-[#EEEEFF]/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#666A83]" />
                    <span>System</span>
                  </div>
                  {themeMode === 'system' && <Check className="w-3.5 h-3.5 text-[#5B46E8]" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
