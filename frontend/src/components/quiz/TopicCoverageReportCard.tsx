import React from 'react';
import { CheckCircle2, BookOpen, Clock, Layers, Sparkles } from 'lucide-react';
import { TopicCoverageReport } from '../../types';

interface TopicCoverageReportCardProps {
  report?: TopicCoverageReport;
  totalQuestions: number;
  onSeek?: (seconds: number) => void;
}

export const TopicCoverageReportCard: React.FC<TopicCoverageReportCardProps> = ({
  report,
  totalQuestions,
  onSeek
}) => {
  if (!report || !report.coveredConcepts || report.coveredConcepts.length === 0) {
    return null;
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              What this quiz covers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {report.summaryText || `${totalQuestions} questions covering ${report.coveredConcepts.length} major concepts`}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Grounded in Lesson Concepts</span>
        </span>
      </div>

      {/* Concept Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {report.coveredConcepts.map((concept, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 flex items-start justify-between gap-2 text-xs"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                  {concept.name}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
                  {concept.importance}
                </span>
              </div>
            </div>

            {concept.timestamp && onSeek && typeof concept.timestampSeconds === 'number' && (
              <button
                type="button"
                onClick={() => onSeek(concept.timestampSeconds!)}
                className="inline-flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 hover:underline shrink-0 bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.5 rounded"
                title={`Jump to ${concept.timestamp} in video`}
              >
                <Clock className="w-2.5 h-2.5" />
                <span>{concept.timestamp}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
