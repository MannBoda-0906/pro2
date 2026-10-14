import React, { useState } from 'react';
import {
  ExternalLink,
  Languages,
  Clock,
  User,
  Bookmark,
  Share2,
  RefreshCw,
  Play
} from 'lucide-react';
import { VideoMetadata } from '../../types';

interface VideoPlayerCardProps {
  metadata: VideoMetadata;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onSaveToHistory: () => void;
  onShare: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  seekTime?: number | null;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' }
];

export const VideoPlayerCard: React.FC<VideoPlayerCardProps> = ({
  metadata,
  selectedLanguage,
  onLanguageChange,
  onSaveToHistory,
  onShare,
  onRegenerate,
  isRegenerating,
  seekTime
}) => {
  const [showPlayer, setShowPlayer] = useState(false);

  // Build embed URL with seek time if clicked
  const embedSrc = metadata.embedUrl
    ? `${metadata.embedUrl}?autoplay=1&enablejsapi=1${seekTime != null ? `&start=${seekTime}` : ''}`
    : '';

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden mb-8 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-start">
        {/* Media Preview or Embedded Player */}
        <div className="lg:col-span-5 w-full">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-md group border border-slate-800">
            {showPlayer && embedSrc ? (
              <iframe
                src={embedSrc}
                title={metadata.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src={metadata.thumbnailUrl}
                  alt={metadata.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowPlayer(true)}
                    className="w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-600/40 transform group-hover:scale-110 transition-all focus:outline-none"
                    title="Play Video"
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </button>
                </div>
                {metadata.duration && (
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white text-[11px] font-mono font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{metadata.duration}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Video Information & Control Bar */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300">
                Processed Video
              </span>
              {metadata.url && (
                <a
                  href={metadata.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
              {metadata.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mb-6">
              <div className="flex items-center gap-1.5 font-medium">
                <User className="w-4 h-4 text-slate-400" />
                <span>{metadata.author}</span>
              </div>
            </div>
          </div>

          {/* Action Row: Language Select + Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <label htmlFor="language-select" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Language:
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={e => onLanguageChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onSaveToHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                title="Save video to history"
              >
                <Bookmark className="w-3.5 h-3.5 text-brand-500" />
                <span>Save</span>
              </button>

              <button
                onClick={onShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                title="Share study guide"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition-colors disabled:opacity-60"
                title="Regenerate with selected language"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
