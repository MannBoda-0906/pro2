import React from 'react';
import { VideoPlayerCard } from '../components/youtube/VideoPlayerCard';
import { VideoMetadata } from '../types';

export interface DashboardPageProps {
  metadata: VideoMetadata;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onSaveToHistory: () => void;
  onShare: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  seekTime?: number | null;
  children?: React.ReactNode;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metadata,
  selectedLanguage,
  onLanguageChange,
  onSaveToHistory,
  onShare,
  onRegenerate,
  isRegenerating,
  seekTime,
  children
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <VideoPlayerCard
        metadata={metadata}
        selectedLanguage={selectedLanguage}
        onLanguageChange={onLanguageChange}
        onSaveToHistory={onSaveToHistory}
        onShare={onShare}
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
        seekTime={seekTime}
      />
      <div className="mt-8">
        {children}
      </div>
    </div>
  );
};

export default DashboardPage;
