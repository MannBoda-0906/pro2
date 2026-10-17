import React, { useState, useEffect } from 'react';
import {
  Youtube,
  ArrowRight,
  Sparkles,
  FileText,
  HelpCircle,
  Brain,
  Layers,
  Clock,
  ClipboardPaste,
  PlayCircle,
  FileEdit,
  Loader2,
  CheckCircle2,
  Languages,
  SlidersHorizontal,
  Target,
  GraduationCap
} from 'lucide-react';
import { DemoSample } from '../../types';

export interface HeroInputProps {
  onProcessUrl: (url: string, options?: { language?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }) => void;
  onSelectDemo: (demoId: string, options?: { language?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }) => void;
  onOpenManualTranscript: () => void;
  isLoading: boolean;
  loadingStep: string;
  demos: DemoSample[];
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  selectedDifficulty: 'easy' | 'medium' | 'hard';
  onDifficultyChange: (diff: 'easy' | 'medium' | 'hard') => void;
  selectedCount: number;
  onCountChange: (count: number) => void;
}

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', native: 'Hindi', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી', native: 'Gujarati', flag: '🇮🇳' },
  { code: 'es', label: 'Español', native: 'Spanish', flag: '🇪🇸' }
];

const ANALYSIS_STAGES = [
  'Fetching captions & transcript',
  'Analyzing video lecture',
  'Extracting knowledge map & concepts',
  'Planning examination distribution',
  'Building & validating exam questions',
  'Checking question quality'
];

export const HeroInput: React.FC<HeroInputProps> = ({
  onProcessUrl,
  onSelectDemo,
  onOpenManualTranscript,
  isLoading,
  loadingStep,
  demos,
  selectedLanguage,
  onLanguageChange,
  selectedDifficulty,
  onDifficultyChange,
  selectedCount,
  onCountChange
}) => {
  const [url, setUrl] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  // Progressive animation for loading stages
  useEffect(() => {
    if (!isLoading) {
      setActiveStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveStageIndex(prev => {
        if (prev < ANALYSIS_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setInputError('Please paste a YouTube video link to begin.');
      return;
    }

    const isValidYouTube =
      trimmed.includes('youtube.com/watch') ||
      trimmed.includes('youtu.be/') ||
      trimmed.includes('youtube.com/embed') ||
      trimmed.includes('youtube.com/shorts') ||
      trimmed.includes('youtube.com/live') ||
      trimmed.includes('music.youtube.com') ||
      /^[a-zA-Z0-9_-]{11}$/.test(trimmed);

    if (!isValidYouTube) {
      setInputError('Please enter a valid YouTube link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...).');
      return;
    }

    onProcessUrl(trimmed, {
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      count: selectedCount
    });
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setInputError(null);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12 animate-fade-in">
      {/* Hero Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEEEFF] border border-[#DFE1F0] text-xs font-semibold text-[#4938C8] shadow-xs">
          <GraduationCap className="w-4 h-4 text-[#4938C8]" />
          <span>Lumora Spatial Education • Concept Mastery & Exam Practice</span>
        </div>
      </div>

      {/* Main Heading */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#17172D] leading-[1.15]">
          Turn Any Study Video Into Your{' '}
          <span className="text-[#4938C8]">
            Spatial Exam Practice
          </span>
        </h1>
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#666A83] leading-relaxed font-normal">
          Lumora AI analyzes topics, concepts, formulas, and common misconceptions with mathematical precision — delivering concept knowledge maps and 25 procedurally unique exam questions with step-by-step solutions.
        </p>
      </div>

      {/* Interactive Exam Configurator & Input Card (Layer 1 Surface) */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[#DFE1F0] shadow-resting hover:shadow-raised transition-all relative overflow-hidden">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. YouTube URL Input */}
            <div>
              <label htmlFor="youtube-url-input" className="block text-xs font-bold uppercase tracking-wider text-[#17172D] mb-2">
                YouTube Video Lesson Link
              </label>
              <div className="relative flex items-center rounded-2xl bg-white border border-[#DFE1F0] focus-within:border-[#4938C8] focus-within:ring-2 focus-within:ring-[#5B46E8]/20 transition-all p-1.5 sm:p-2 shadow-xs">
                <div className="pl-3 pr-2 text-rose-500 shrink-0">
                  <Youtube className="w-6 h-6" />
                </div>

                <input
                  type="text"
                  id="youtube-url-input"
                  value={url}
                  onChange={e => {
                    setUrl(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="Paste YouTube link (e.g., https://youtube.com/watch?v=... or https://youtu.be/...)"
                  disabled={isLoading}
                  className="w-full bg-transparent px-2 py-2 text-sm sm:text-base text-[#17172D] placeholder:text-[#666A83] focus:outline-none"
                />

                {!url && (
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mr-1 text-xs font-semibold text-[#4938C8] bg-[#EEEEFF] hover:bg-[#E0E1FC] rounded-xl transition-all shrink-0 active:scale-95"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Choose Quiz Language Selector */}
            <div className="pt-2 border-t border-[#DFE1F0]">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#17172D] flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-[#4938C8]" />
                  <span>Choose Study & Quiz Language</span>
                </label>
                <span className="text-[11px] text-[#666A83]">
                  Scientific formulas and terms preserved
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {LANGUAGE_OPTIONS.map(lang => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => onLanguageChange(lang.code)}
                      disabled={isLoading}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all active:scale-98 ${
                        isSelected
                          ? 'border-[#4938C8] bg-[#EEEEFF] text-[#4938C8] font-bold shadow-xs ring-1 ring-[#4938C8]/30'
                          : 'border-[#DFE1F0] hover:border-[#5B46E8]/40 bg-white text-[#666A83]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <div>
                          <p className="text-xs font-bold leading-tight">{lang.label}</p>
                          <p className="text-[10px] text-[#666A83]">{lang.native}</p>
                        </div>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-[#4938C8] bg-[#4938C8] text-white'
                          : 'border-[#DFE1F0]'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Difficulty & Question Count Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#DFE1F0]">
              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#17172D] mb-2 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#4938C8]" />
                  <span>Difficulty Level</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#F8F9FD] p-1 rounded-xl border border-[#DFE1F0]">
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => onDifficultyChange(diff)}
                      disabled={isLoading}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        selectedDifficulty === diff
                          ? 'bg-white text-[#4938C8] shadow-xs'
                          : 'text-[#666A83] hover:text-[#17172D]'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#666A83] mt-1">
                  {selectedDifficulty === 'easy' && 'Focus on definitions, basic principles, and direct application.'}
                  {selectedDifficulty === 'medium' && 'Balanced conceptual understanding, application & comparisons.'}
                  {selectedDifficulty === 'hard' && 'Multi-step reasoning, calculations, constraint analysis & edge cases.'}
                </p>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#17172D] mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#4938C8]" />
                    <span>Number of Questions</span>
                  </span>
                  <span className="text-[10px] text-[#4938C8] font-bold bg-[#EEEEFF] px-2.5 py-0.5 rounded-full border border-[#DFE1F0]">
                    {selectedCount === 25 ? '25 Qs Standard' : `${selectedCount} Qs Selected`}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-[#F8F9FD] p-1 rounded-xl border border-[#DFE1F0]">
                  {[25, 20, 15, 10].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onCountChange(cnt)}
                      disabled={isLoading}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                        selectedCount === cnt
                          ? 'bg-[#4938C8] text-white shadow-xs'
                          : 'text-[#666A83] hover:text-[#17172D]'
                      }`}
                    >
                      {cnt === 25 ? '25 Qs' : `${cnt} Qs`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#666A83] mt-1 flex items-center justify-between">
                  <span>Standard ratio: ~70% Numerical & Problem-Solving, ~30% Conceptual</span>
                </p>
              </div>
            </div>

            {/* Error Message */}
            {inputError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm animate-fade-in flex items-center justify-between shadow-xs">
                <span>{inputError}</span>
                <button
                  type="button"
                  onClick={() => setInputError(null)}
                  className="ml-2 font-bold opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            )}

            {/* Primary Action Submit Button (Spatial CTA) */}
            <button
              type="submit"
              id="analyze-video-quiz-button"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-[#4938C8] hover:bg-[#5B46E8] active:scale-[0.98] text-white font-bold text-base shadow-cta hover:shadow-cta-hover transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing Lesson & Building {selectedCount}-Question Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Analyze Video & Generate Spatial Quiz</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Loading Stage Progression Card */}
          {isLoading && (
            <div className="mt-6 p-5 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] animate-fade-in space-y-4 shadow-resting">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#4938C8] animate-spin shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-[#17172D]">
                    Analyzing your lesson...
                  </h4>
                  <p className="text-xs text-[#4938C8] font-medium">
                    {loadingStep || ANALYSIS_STAGES[activeStageIndex]}
                  </p>
                </div>
              </div>

              {/* Step Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#DFE1F0]">
                {ANALYSIS_STAGES.map((stage, idx) => {
                  const isDone = idx < activeStageIndex;
                  const isCurrent = idx === activeStageIndex;
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-2 text-xs transition-opacity ${
                        isDone
                          ? 'text-emerald-700 font-semibold'
                          : isCurrent
                          ? 'text-[#4938C8] font-bold animate-pulse'
                          : 'text-[#666A83] opacity-60'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <span>{stage}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-center text-[#666A83] pt-1">
                Your concept-based quiz is ready shortly.
              </p>
            </div>
          )}

          {/* Quick Info Footer */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#666A83] border-t border-[#DFE1F0] pt-3">
            <span>⚡ Procedural Anti-Repetition: 25 distinct archetypes guaranteed</span>
            <button
              type="button"
              onClick={onOpenManualTranscript}
              className="text-[#4938C8] font-medium hover:underline flex items-center gap-1"
            >
              <FileEdit className="w-3 h-3" />
              <span>Paste custom transcript manually</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Quick-Start Chips (Layer 1 Floating Chips) */}
      <div className="max-w-3xl mx-auto mb-16 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-[#666A83] mb-3">
          Or test instantly with pre-verified study lectures ({LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage)?.label} Quiz)
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {demos.map(demo => (
            <button
              key={demo.id}
              onClick={() => onSelectDemo(demo.id, {
                language: selectedLanguage,
                difficulty: selectedDifficulty,
                count: selectedCount
              })}
              disabled={isLoading}
              className="group inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-[#DFE1F0] hover:border-[#5B46E8] shadow-resting hover:shadow-raised hover:-translate-y-1 active:scale-95 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PlayCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#17172D] group-hover:text-[#4938C8] transition-colors">
                  {demo.title.split(':')[0]}
                </p>
                <p className="text-[10px] text-[#666A83]">
                  {demo.author} • {demo.duration}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Highlights Grid (Layer 1 Soft Floating Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        <div className="p-6 rounded-[22px] bg-white border border-[#DFE1F0] shadow-resting hover:shadow-raised hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center mb-4 shadow-xs">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#17172D] mb-1.5">
            Concept Knowledge Map
          </h3>
          <p className="text-xs sm:text-sm text-[#666A83] leading-relaxed">
            Identifies core mechanisms, formulas, and causal relationships rather than surface transcript lines.
          </p>
        </div>

        <div className="p-6 rounded-[22px] bg-white border border-[#DFE1F0] shadow-resting hover:shadow-raised hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center mb-4 shadow-xs">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#17172D] mb-1.5">
            25 Procedural Archetypes
          </h3>
          <p className="text-xs sm:text-sm text-[#666A83] leading-relaxed">
            Zero duplicate calculations. Every question requires a genuinely distinct mathematical or reasoning task.
          </p>
        </div>

        <div className="p-6 rounded-[22px] bg-white border border-[#DFE1F0] shadow-resting hover:shadow-raised hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center mb-4 shadow-xs">
            <Languages className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#17172D] mb-1.5">
            Multilingual Adaptation
          </h3>
          <p className="text-xs sm:text-sm text-[#666A83] leading-relaxed">
            Watch in any language and study in English, हिन्दी, ગુજરાતી, or Español with technical terms preserved.
          </p>
        </div>

        <div className="p-6 rounded-[22px] bg-white border border-[#DFE1F0] shadow-resting hover:shadow-raised hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center mb-4 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#17172D] mb-1.5">
            Teacher Correction Review
          </h3>
          <p className="text-xs sm:text-sm text-[#666A83] leading-relaxed">
            Step-by-step verified derivations, TRUE/FALSE answer status, and common student mistake diagnoses.
          </p>
        </div>
      </div>
    </div>
  );
};

