import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Copy,
  Download,
  BookOpen,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  HelpCircle,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { SummaryData } from '../../types';

interface SummaryTabProps {
  summary: SummaryData;
  onSeek: (seconds: number) => void;
  onCopyNotes: () => void;
  onDownloadMarkdown: () => void;
  onDownloadText: () => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  summary,
  onSeek,
  onCopyNotes,
  onDownloadMarkdown,
  onDownloadText
}) => {
  const [summaryMode, setSummaryMode] = useState<'short' | 'detailed'>('short');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyNotes();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Toolbar: Mode Switch + Download/Copy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Toggle between Short & Detailed */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setSummaryMode('short')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              summaryMode === 'short'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Short Summary
          </button>
          <button
            onClick={() => setSummaryMode('detailed')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              summaryMode === 'detailed'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Detailed Summary
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="Copy notes to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={onDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="Download notes as Markdown (.md)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>

          <button
            onClick={onDownloadText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="Download notes as plain text (.txt)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>TXT</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Card (Short or Detailed) */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {summaryMode === 'short' ? 'Concise Summary' : 'Detailed Video Explanation'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summaryMode === 'short'
                ? 'High-level overview of the central thesis and findings'
                : 'Thorough walkthrough of topics and arguments'}
            </p>
          </div>
        </div>

        <div className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line bg-slate-50/70 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          {summaryMode === 'short' ? summary.shortSummary : summary.detailedSummary}
        </div>
      </section>

      {/* 2. Key Points & Takeaways Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Points */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Key Points
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Core concepts broken down into actionable bullet points
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {summary.keyPoints.map((point, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-normal"
              >
                <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Key Takeaways */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Key Takeaways
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The essential lessons to retain long-term
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.keyTakeaways.map((takeaway, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{takeaway}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Important Definitions */}
      {summary.importantDefinitions && summary.importantDefinitions.length > 0 && (
        <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Important Definitions & Concepts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Technical terminology explained formally and in simple everyday words
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.importantDefinitions.map((def, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-brand-700 dark:text-brand-300">
                    {def.term}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400">
                    Term
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                    Formal Definition
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {def.definition}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
                    Simple Explanation
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                    "{def.simpleExplanation}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Timestamped Chapters */}
      {summary.chapters && summary.chapters.length > 0 && (
        <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Timestamped Chapters
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any timestamp to jump directly to that part of the video
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.chapters.map((ch, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 hover:border-brand-500/50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <button
                    onClick={() => onSeek(ch.seconds)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-mono text-xs font-bold shadow-sm transition-transform active:scale-95 shrink-0"
                    title={`Jump to ${ch.timestamp}`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{ch.timestamp}</span>
                  </button>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {ch.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {ch.summary}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Comprehensive Study Notes (Markdown) */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Structured Study Notes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete, textbook-grade lecture notes ready for exam revision
            </p>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-brand-600 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono text-sm sm:text-base leading-relaxed bg-slate-50/50 dark:bg-slate-950/30 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          <ReactMarkdown>{summary.studyNotes}</ReactMarkdown>
        </div>
      </section>
    </div>
  );
};
