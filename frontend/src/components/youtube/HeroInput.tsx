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
  'Reading available lesson content',
  'Identifying topics',
  'Understanding concepts',
  'Finding exam-important points',
  'Building questions',
  'Translating quiz',
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 text-xs font-semibold text-brand-700 dark:text-brand-300 shadow-xs">
          <GraduationCap className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Intelligent Concept-Level Analysis • Exam-Oriented Quiz</span>
        </div>
      </div>

      {/* Main Heading */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Turn a YouTube Lesson Into Your{' '}
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-500 bg-clip-text text-transparent">
            Personal Exam Practice
          </span>
        </h1>
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          The AI acts like an intelligent teacher who watched and understood the lesson — analyzing topics, concepts, formulas, and misconceptions to test true conceptual understanding.
        </p>
      </div>

      {/* Interactive Exam Configurator & Input Card */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 shadow-xl shadow-brand-500/5 relative overflow-hidden">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. YouTube URL Input */}
            <div>
              <label htmlFor="youtube-url-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                YouTube URL
              </label>
              <div className="relative flex items-center shadow-inner rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus-within:border-brand-500 dark:focus-within:border-brand-500 transition-all p-1.5 sm:p-2">
                <div className="pl-3 pr-2 text-red-500 shrink-0">
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
                  className="w-full bg-transparent px-2 py-2 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />

                {!url && (
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 mr-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Choose Quiz Language Selector (Prominent near URL input) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Choose Quiz Language</span>
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  AI understands video & generates quiz in this language
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
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-950/60 text-brand-950 dark:text-brand-100 font-bold shadow-xs ring-1 ring-brand-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <div>
                          <p className="text-xs font-bold leading-tight">{lang.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{lang.native}</p>
                        </div>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Difficulty & Question Count Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Difficulty Level</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => onDifficultyChange(diff)}
                      disabled={isLoading}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        selectedDifficulty === diff
                          ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {selectedDifficulty === 'easy' && 'Focus on definitions, basic facts, and simple understanding.'}
                  {selectedDifficulty === 'medium' && 'Balanced conceptual understanding, application & comparisons.'}
                  {selectedDifficulty === 'hard' && 'Multi-step reasoning, calculations, analysis & misconceptions.'}
                </p>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-slate-500" />
                  <span>Number of Questions</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  {[5, 10, 15, 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onCountChange(cnt)}
                      disabled={isLoading}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        selectedCount === cnt
                          ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Proportionally distributed across cognitive levels.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {inputError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm animate-fade-in flex items-center justify-between">
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

            {/* Action Submit Button */}
            <button
              type="submit"
              id="analyze-video-quiz-button"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 hover:from-brand-700 hover:via-indigo-700 hover:to-violet-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing Lesson & Building Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Analyze Video & Create Quiz</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Loading Stage Progression Card */}
          {isLoading && (
            <div className="mt-6 p-5 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 animate-fade-in space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-brand-600 animate-spin shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Analyzing your lesson...
                  </h4>
                  <p className="text-xs text-brand-700 dark:text-brand-300">
                    {loadingStep || ANALYSIS_STAGES[activeStageIndex]}
                  </p>
                </div>
              </div>

              {/* Step Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-brand-200/60 dark:border-brand-800/60">
                {ANALYSIS_STAGES.map((stage, idx) => {
                  const isDone = idx < activeStageIndex;
                  const isCurrent = idx === activeStageIndex;
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-2 text-xs transition-opacity ${
                        isDone
                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                          : isCurrent
                          ? 'text-brand-600 dark:text-brand-300 font-bold animate-pulse'
                          : 'text-slate-400 dark:text-slate-600'
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

              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-1">
                Your concept-based quiz is ready shortly.
              </p>
            </div>
          )}

          {/* Quick Info Footer */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <span>⚡ Concept Analysis: Understands lessons language-neutrally before generating quiz</span>
            <button
              type="button"
              onClick={onOpenManualTranscript}
              className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <FileEdit className="w-3 h-3" />
              <span>Paste custom transcript manually</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Quick-Start Chips with Language Context */}
      <div className="max-w-3xl mx-auto mb-16 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
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
              className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 shadow-sm hover:shadow transition-all text-left"
            >
              <PlayCircle className="w-4 h-4 text-brand-600 group-hover:scale-110 transition-transform shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {demo.title.split(':')[0]}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {demo.author} • {demo.duration}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
            Concept Knowledge Map
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Identifies core mechanisms, formulas, processes, and relationships between concepts rather than memorizing transcript lines.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
            5 Cognitive Levels
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Tests Recall, Conceptual Understanding, Real Application, Analysis, and Exam-Style Reasoning.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Languages className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
            Multilingual Adaptation
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Watch in any language and study in English, हिन्दी, ગુજરાતી, or Español with technical terms preserved.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
            Adaptive Learning Mode
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Breaks down performance by concept, explains weak areas, and generates fresh practice scenarios.
          </p>
        </div>
      </div>
    </div>
  );
};
