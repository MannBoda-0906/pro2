import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  HelpCircle,
  BookOpen,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  Download,
  ArrowRight,
  ArrowLeft,
  Award,
  Check,
  ChevronRight,
  FileText,
  Lightbulb,
  Clock,
  Brain
} from 'lucide-react';
import { QuizData, SummaryData, QuizQuestion } from '../../types';
import { TopicCoverageReportCard } from './TopicCoverageReportCard';
import { LearningModePerformanceCard } from './LearningModePerformanceCard';

interface SummarizedQuizTabProps {
  summary: SummaryData;
  quiz: QuizData | null;
  onGenerateQuiz: (difficulty: 'easy' | 'medium' | 'hard', count: number) => void;
  isGenerating: boolean;
  onExportQuiz: () => void;
  onViewFullSummary: () => void;
  videoTitle: string;
  onSeek?: (seconds: number) => void;
  onGeneratePractice?: (weakConcepts: string[]) => Promise<void>;
  isGeneratingPractice?: boolean;
}

const COGNITIVE_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  level_1_recall: { label: 'Level 1: Recall', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  level_2_understanding: { label: 'Level 2: Understanding', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  level_3_application: { label: 'Level 3: Application', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  level_4_analysis: { label: 'Level 4: Analysis', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  level_5_exam_reasoning: { label: 'Level 5: Exam Reasoning', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' }
};

export const SummarizedQuizTab: React.FC<SummarizedQuizTabProps> = ({
  summary,
  quiz,
  onGenerateQuiz,
  isGenerating,
  onExportQuiz,
  onViewFullSummary,
  videoTitle,
  onSeek,
  onGeneratePractice,
  isGeneratingPractice = false
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCount, setSelectedCount] = useState<number>(10);

  // Quiz running state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const isAllAnswered = questions.length > 0 && questions.every(q => Boolean(userAnswers[q.id]));

  const score = questions.reduce((acc, q) => {
    return userAnswers[q.id] === q.correctAnswer ? acc + 1 : acc;
  }, 0);
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const handleSelectOption = (option: string) => {
    if (isSubmitted || !currentQuestion) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleRetake = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setCurrentIndex(0);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* ================= SECTION 1: VIDEO SUMMARY OVERVIEW ================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-brand-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Video Summary Overview
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  Concept Grounded
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {videoTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={onViewFullSummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Full Textbook Notes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Short Executive Summary */}
        <div className="mb-6 p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/50">
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
            {summary.shortSummary}
          </p>
        </div>

        {/* Key Takeaways */}
        {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Core Takeaways for Quiz</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {summary.keyTakeaways.slice(0, 4).map((takeaway, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{takeaway}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= SECTION 2: TOPIC COVERAGE REPORT ================= */}
      {quiz && (
        <TopicCoverageReportCard
          report={quiz.topicCoverageReport}
          totalQuestions={questions.length}
          onSeek={onSeek}
        />
      )}

      {/* ================= SECTION 3: INTERACTIVE VIDEO QUIZ ================= */}
      {(!quiz || questions.length === 0) ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Generating Concept-Based Quiz...
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
            Click below to create an exam-oriented set of questions from this video.
          </p>
          <button
            onClick={() => onGenerateQuiz(selectedDifficulty, selectedCount)}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all shadow-md"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Interactive Quiz</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quiz Header & Controls */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {quiz.title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                    {quiz.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {questions.length} questions grounded strictly in the video concepts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onExportQuiz}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Export quiz"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Reset answers"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>

                <button
                  onClick={() => onGenerateQuiz(selectedDifficulty, selectedCount)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all"
                  title="Regenerate questions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>New Questions</span>
                </button>
              </div>
            </div>

            {/* Quick Difficulty & Count Selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Difficulty:
                </span>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all ${
                        selectedDifficulty === diff
                          ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Count:
                </span>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                  {[5, 10, 15, 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSelectedCount(cnt)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        selectedCount === cnt
                          ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Question-by-Question Runner (Before Submission) */}
          {!isSubmitted && currentQuestion ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span>
                    {answeredCount}/{questions.length} Answered
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all duration-300 rounded-full"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Cognitive Level & Concept Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {currentQuestion.cognitiveLevel && (
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    COGNITIVE_LEVEL_LABELS[currentQuestion.cognitiveLevel]?.color || 'bg-slate-100 text-slate-700'
                  }`}>
                    {COGNITIVE_LEVEL_LABELS[currentQuestion.cognitiveLevel]?.label || currentQuestion.cognitiveLevel}
                  </span>
                )}

                {currentQuestion.conceptName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Brain className="w-3 h-3 text-brand-600" />
                    <span>Concept: {currentQuestion.conceptName}</span>
                  </span>
                )}

                {currentQuestion.timestampFormatted && onSeek && typeof currentQuestion.timestampSeconds === 'number' && (
                  <button
                    type="button"
                    onClick={() => onSeek(currentQuestion.timestampSeconds!)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-1 rounded-md hover:underline"
                    title="Jump to video explanation"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Review this section ({currentQuestion.timestampFormatted})</span>
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {currentQuestion.question}
                </h4>
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = userAnswers[currentQuestion.id] === option;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(option)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-950/40 text-brand-950 dark:text-brand-100 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="text-sm font-medium leading-relaxed">{option}</span>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-brand-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  {currentIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-sm"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={!isAllAnswered}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white transition-all shadow-md shadow-emerald-600/20"
                    >
                      <Award className="w-4 h-4" />
                      <span>Submit Quiz & View Analysis</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Results & Learning Mode */
            <div className="space-y-6 animate-slide-up">
              {/* Performance & Learning Mode Breakdown */}
              <LearningModePerformanceCard
                score={score}
                total={questions.length}
                questions={questions}
                userAnswers={userAnswers}
                conceptMap={quiz.conceptMap}
                onRetake={handleRetake}
                onGeneratePractice={async (weakConcepts) => {
                  if (onGeneratePractice) {
                    await onGeneratePractice(weakConcepts);
                  }
                }}
                isGeneratingPractice={isGeneratingPractice}
                onSeek={onSeek}
              />

              {/* Detailed Question Review with Concept Explanations */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Answer Key & Pedagogical Explanations</span>
                </h4>

                {questions.map((q, qIdx) => {
                  const userAns = userAnswers[q.id];
                  const isCorrect = userAns === q.correctAnswer;

                  return (
                    <div
                      key={q.id}
                      className={`p-6 rounded-3xl border transition-all space-y-4 ${
                        isCorrect
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50'
                          : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/50'
                      }`}
                    >
                      {/* Top Bar with Status and Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                          <span className="font-bold text-xs uppercase tracking-wider">
                            Question {qIdx + 1}
                          </span>
                          {q.cognitiveLevel && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              COGNITIVE_LEVEL_LABELS[q.cognitiveLevel]?.color || 'bg-slate-100 text-slate-700'
                            }`}>
                              {COGNITIVE_LEVEL_LABELS[q.cognitiveLevel]?.label || q.cognitiveLevel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {q.conceptName && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {q.conceptName}
                            </span>
                          )}
                          {q.timestampFormatted && onSeek && typeof q.timestampSeconds === 'number' && (
                            <button
                              type="button"
                              onClick={() => onSeek(q.timestampSeconds!)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded hover:underline"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>{q.timestampFormatted}</span>
                            </button>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCorrect
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                      </div>

                      <h5 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                        {q.question}
                      </h5>

                      {/* Options Review */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isTargetCorrect = opt === q.correctAnswer;
                          const isUserChoice = opt === userAns;

                          let optClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
                          if (isTargetCorrect) {
                            optClass = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-semibold';
                          } else if (isUserChoice && !isCorrect) {
                            optClass = 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-100 line-through';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${optClass}`}
                            >
                              <span>{opt}</span>
                              {isTargetCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pedagogical Explanation Box */}
                      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            Concept Explanation:
                          </span>{' '}
                          <span>{q.explanation}</span>
                        </div>

                        {q.misconceptionExploration && (
                          <div className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                            <span className="font-bold">Common Misconception: </span>
                            <span>{q.misconceptionExploration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
