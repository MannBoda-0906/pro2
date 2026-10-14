import React, { useState } from 'react';
import {
  Award,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
  Loader2,
  Brain,
  HelpCircle
} from 'lucide-react';
import { ConceptMap, QuizQuestion } from '../../types';

interface LearningModePerformanceCardProps {
  score: number;
  total: number;
  questions: QuizQuestion[];
  userAnswers: Record<string, string>;
  conceptMap?: ConceptMap;
  onRetake: () => void;
  onGeneratePractice: (weakConcepts: string[]) => Promise<void>;
  isGeneratingPractice: boolean;
  onSeek?: (seconds: number) => void;
}

export const LearningModePerformanceCard: React.FC<LearningModePerformanceCardProps> = ({
  score,
  total,
  questions,
  userAnswers,
  conceptMap,
  onRetake,
  onGeneratePractice,
  isGeneratingPractice,
  onSeek
}) => {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // Group performance by conceptName
  const conceptStats: Record<string, { total: number; correct: number; timestamp?: string; timestampSeconds?: number }> = {};

  questions.forEach(q => {
    const concept = q.conceptName || 'Core Lesson Principles';
    if (!conceptStats[concept]) {
      conceptStats[concept] = {
        total: 0,
        correct: 0,
        timestamp: q.timestampFormatted,
        timestampSeconds: q.timestampSeconds
      };
    }
    conceptStats[concept].total += 1;
    if (userAnswers[q.id] === q.correctAnswer) {
      conceptStats[concept].correct += 1;
    }
  });

  const conceptPerformance = Object.entries(conceptStats).map(([conceptName, stat]) => {
    const isStrong = stat.correct / stat.total >= 0.7;
    return {
      conceptName,
      status: isStrong ? ('Strong' as const) : ('Needs Practice' as const),
      correct: stat.correct,
      total: stat.total,
      timestamp: stat.timestamp,
      timestampSeconds: stat.timestampSeconds
    };
  });

  const weakConcepts = conceptPerformance
    .filter(c => c.status === 'Needs Practice')
    .map(c => c.conceptName);

  // Look up detailed info from conceptMap if available
  const weakConceptDetails = weakConcepts.map(cName => {
    const conceptObj = conceptMap?.concepts?.find(
      c => c.name.toLowerCase() === cName.toLowerCase()
    );
    const misconceptionObj = conceptMap?.misconceptions?.find(
      m => m.concept.toLowerCase() === cName.toLowerCase()
    );

    return {
      name: cName,
      explanation:
        conceptObj?.simpleExplanation ||
        conceptObj?.detailedExplanation ||
        `Focus on the foundational cause-and-effect mechanisms and definitions related to ${cName}.`,
      misconception:
        misconceptionObj?.misconception ||
        conceptObj?.commonMisconceptions?.[0] ||
        `Be careful not to confuse superficial terminology with the underlying principles.`,
      timestamp: conceptObj?.approximateTimestamp?.timestamp,
      timestampSeconds: conceptObj?.approximateTimestamp?.startSeconds
    };
  });

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm animate-fade-in space-y-6">
      {/* 1. Score Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            percentage >= 70
              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
          }`}>
            <Award className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Exam Performance Result
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Your Score: {score} / {total} ({percentage}%)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {percentage >= 80
                ? 'Excellent conceptual mastery! You demonstrated strong recall, understanding, and application.'
                : percentage >= 50
                ? 'Good effort! Review the weak concepts below to ensure full exam readiness.'
                : 'Needs targeted revision. Study the key concepts below and practice again.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors self-start sm:self-auto shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake Quiz</span>
        </button>
      </div>

      {/* 2. Concept Performance Breakdown */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Concept Performance Breakdown</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {conceptPerformance.map((c, idx) => {
            const isStrong = c.status === 'Strong';
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  isStrong
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
                    : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isStrong ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">
                      {c.conceptName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.correct}/{c.total} questions correct
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isStrong
                      ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                  }`}>
                    {c.status}
                  </span>

                  {c.timestamp && onSeek && typeof c.timestampSeconds === 'number' && (
                    <button
                      type="button"
                      onClick={() => onSeek(c.timestampSeconds!)}
                      className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                      title={`Review at ${c.timestamp}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Weak Concepts Review Panel */}
      {weakConceptDetails.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>Review These Concepts</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Key areas where your answers indicated misconceptions or room for growth.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onGeneratePractice(weakConcepts)}
              disabled={isGeneratingPractice}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all shrink-0 self-start sm:self-auto disabled:opacity-60"
            >
              {isGeneratingPractice ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Targeted Practice...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Practice Questions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {weakConceptDetails.map((weak, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {weak.name}
                  </span>
                  {weak.timestamp && onSeek && typeof weak.timestampSeconds === 'number' && (
                    <button
                      type="button"
                      onClick={() => onSeek(weak.timestampSeconds!)}
                      className="inline-flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Review video at {weak.timestamp}</span>
                    </button>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {weak.explanation}
                </p>
                <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-[11px] text-rose-800 dark:text-rose-200">
                  <span className="font-bold">Common Misconception to Avoid: </span>
                  <span>{weak.misconception}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
