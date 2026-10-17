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
    <div className="w-full bg-white rounded-[24px] border border-[#DFE1F0] shadow-resting overflow-hidden mb-8 transition-all">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-start">
        {/* Media Preview or Embedded Player */}
        <div className="lg:col-span-5 w-full">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#17172D] shadow-md group border border-[#DFE1F0]">
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
                <div className="absolute inset-0 bg-[#17172D]/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowPlayer(true)}
                    className="w-14 h-14 rounded-full bg-[#4938C8] hover:bg-[#5B46E8] text-white flex items-center justify-center shadow-cta hover:shadow-cta-hover transform group-hover:scale-110 active:scale-95 transition-all focus:outline-none"
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EEEEFF] text-[#4938C8] border border-[#DFE1F0]">
                Analyzed Lesson
              </span>
              {metadata.url && (
                <a
                  href={metadata.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#666A83] hover:text-[#4938C8] font-medium transition-colors"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[#17172D] tracking-tight leading-snug mb-3">
              {metadata.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#666A83] mb-6">
              <div className="flex items-center gap-1.5 font-medium">
                <User className="w-4 h-4 text-[#4938C8]" />
                <span>{metadata.author}</span>
              </div>
            </div>
          </div>

          {/* Action Row: Language Select + Buttons */}
          <div className="pt-4 border-t border-[#DFE1F0] flex flex-wrap items-center justify-between gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#4938C8]" />
              <label htmlFor="language-select" className="text-xs font-semibold text-[#666A83]">
                Language:
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={e => onLanguageChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-[#DFE1F0] bg-white text-[#17172D] focus:outline-none focus:ring-2 focus:ring-[#5B46E8]/20 shadow-xs"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#DFE1F0] bg-white hover:bg-[#EEEEFF] text-[#4938C8] shadow-xs active:scale-95 transition-all"
                title="Save video to learning history"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              <button
                onClick={onShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#DFE1F0] bg-white hover:bg-[#EEEEFF] text-[#666A83] hover:text-[#4938C8] shadow-xs active:scale-95 transition-all"
                title="Share study guide"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#EEEEFF] text-[#4938C8] border border-[#DFE1F0] hover:bg-[#E0E1FC] transition-all disabled:opacity-60 active:scale-95 shadow-xs"
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
