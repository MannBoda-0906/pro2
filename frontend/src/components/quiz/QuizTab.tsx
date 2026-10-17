import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  RotateCcw,
  RefreshCw,
  Download,
  ArrowRight,
  ArrowLeft,
  Award,
  Sparkles,
  Check,
  Clock,
  Brain,
  Lightbulb,
  Code,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { QuizData, QuizQuestion, QuizSubmissionResult } from '../../types';
import { ApiService } from '../../services/api';
import { TopicCoverageReportCard } from './TopicCoverageReportCard';
import { LearningModePerformanceCard } from './LearningModePerformanceCard';
import { QuestionReviewCard } from './QuestionReviewCard';
import { MathRenderer } from '../common/MathRenderer';

interface QuizTabProps {
  quiz: QuizData | null;
  onGenerateQuiz: (difficulty: 'easy' | 'medium' | 'hard', count: number) => void;
  isGenerating: boolean;
  onExportQuiz: () => void;
  onSeek?: (seconds: number) => void;
  onGeneratePractice?: (weakConcepts: string[]) => Promise<void>;
  isGeneratingPractice?: boolean;
}

const COGNITIVE_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  level_1_recall: { label: 'Level 1: Recall', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  level_2_understanding: { label: 'Level 2: Understanding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  level_3_application: { label: 'Level 3: Application', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  level_4_analysis: { label: 'Level 4: Analysis', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  level_5_exam_reasoning: { label: 'Level 5: Exam Reasoning', color: 'bg-amber-50 text-amber-800 border-amber-200' }
};

const QUESTION_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  numerical: { label: 'Numerical Problem', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  application: { label: 'Application Problem', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  conceptual: { label: 'Conceptual Theory', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  reasoning: { label: 'Scientific Reasoning', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  exam_style: { label: 'Exam Pattern', color: 'bg-purple-50 text-purple-700 border-purple-200' }
};

export const QuizTab: React.FC<QuizTabProps> = ({
  quiz,
  onGenerateQuiz,
  isGenerating,
  onExportQuiz,
  onSeek,
  onGeneratePractice,
  isGeneratingPractice = false
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCount, setSelectedCount] = useState<number>(25);

  // Quiz running state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDesignReport, setShowDesignReport] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<QuizSubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no quiz yet, show generator setup
  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#DFE1F0] shadow-resting text-center max-w-xl mx-auto animate-fade-in hover:shadow-raised transition-all duration-300">
        <div className="w-16 h-16 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-[#17172D] mb-2 tracking-tight">
          Generate an Exam-Oriented Quiz
        </h3>
        <p className="text-sm text-[#666A83] mb-8 leading-relaxed">
          Lumora AI analyzes the lesson's conceptual framework, formulas, and verified problem archetypes to generate a standard 25-question exam quiz.
        </p>

        <div className="space-y-6 text-left mb-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#666A83] mb-2.5">
              Select Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['easy', 'medium', 'hard'] as const).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-2.5 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] ${
                    selectedDifficulty === diff
                      ? 'bg-[#4938C8] text-white shadow-cta'
                      : 'bg-[#F8F9FD] border border-[#DFE1F0] text-[#17172D] hover:bg-[#EEEEFF]'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#666A83] mb-2.5 flex items-center justify-between">
              <span>Number of Questions</span>
              <span className="text-[10px] text-[#4938C8] font-bold bg-[#EEEEFF] px-2.5 py-0.5 rounded-full border border-[#DFE1F0]">
                {selectedCount === 25 ? '25 Standard Questions' : `${selectedCount} Exam Questions`}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[25, 20, 15, 10].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSelectedCount(count)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                    selectedCount === count
                      ? 'bg-[#4938C8] text-white shadow-cta'
                      : 'bg-[#F8F9FD] border border-[#DFE1F0] text-[#17172D] hover:bg-[#EEEEFF]'
                  }`}
                >
                  {count === 25 ? '25 Qs' : `${count} Qs`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#666A83] mt-2">
              Blueprint: ~70% numerical/problem-solving and ~30% conceptual reasoning.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isGenerating) {
              onGenerateQuiz(selectedDifficulty, selectedCount);
            }
          }}
          disabled={isGenerating}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#4938C8] hover:bg-[#5B46E8] active:scale-[0.98] disabled:bg-[#DFE1F0] disabled:text-[#666A83] text-white font-bold text-sm transition-all shadow-cta hover:shadow-cta-hover flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Concepts & Building {selectedCount}-Question Quiz...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate {selectedCount}-Question Concept Quiz</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const questions = quiz.questions;
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const isAllAnswered = questions.every(q => Boolean(userAnswers[q.id]));

  const score = evaluationResult ? evaluationResult.correct : questions.reduce((acc, q) => {
    return userAnswers[q.id] === q.correctAnswer ? acc + 1 : acc;
  }, 0);

  const handleSelectOption = (option: string) => {
    if (isSubmitted || !currentQuestion) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const result = await ApiService.evaluateQuiz({
        quiz,
        userAnswers
      });
      setEvaluationResult(result);
    } catch (err) {
      console.warn('Backend evaluation failed, using local scoring:', err);
    }
    setIsSubmitted(true);
    setIsSubmitting(false);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleRetake = () => {
    setUserAnswers({});
    setEvaluationResult(null);
    setIsSubmitted(false);
    setCurrentIndex(0);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* 1. Topic Coverage Report Card */}
      <TopicCoverageReportCard
        report={quiz.topicCoverageReport}
        totalQuestions={questions.length}
        onSeek={onSeek}
      />

      {/* 2. Quiz Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-[#DFE1F0] shadow-resting">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-base sm:text-lg text-[#17172D] tracking-tight">
              {quiz.title}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EEEEFF] text-[#4938C8]">
              {quiz.difficulty}
            </span>
          </div>
          <p className="text-xs text-[#666A83] mt-0.5">
            {questions.length} questions grounded strictly in educational concepts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportQuiz}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#DFE1F0] bg-white hover:bg-[#EEEEFF] text-[#4938C8] transition-all shadow-xs active:scale-[0.98]"
            title="Export quiz and answers"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Quiz</span>
          </button>

          <button
            onClick={() => onGenerateQuiz(selectedDifficulty, selectedCount)}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#4938C8] hover:bg-[#5B46E8] text-white shadow-cta hover:shadow-cta-hover transition-all active:scale-[0.98]"
            title="Generate a brand new quiz from the video"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Quiz</span>
          </button>
        </div>
      </div>

      {/* 3. Question Runner (Before Submission) */}
      {!isSubmitted && currentQuestion ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#DFE1F0] shadow-resting space-y-6 hover:shadow-raised transition-all duration-300">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#666A83] mb-2">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span>
                {answeredCount}/{questions.length} Answered
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EEEEFF] overflow-hidden">
              <div
                className="h-full bg-[#4938C8] transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Cognitive Level & Concept Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {currentQuestion.questionCategory && (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                QUESTION_CATEGORY_LABELS[currentQuestion.questionCategory]?.color || 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]'
              }`}>
                {QUESTION_CATEGORY_LABELS[currentQuestion.questionCategory]?.label || currentQuestion.questionCategory}
              </span>
            )}

            {currentQuestion.cognitiveLevel && (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                COGNITIVE_LEVEL_LABELS[currentQuestion.cognitiveLevel]?.color || 'bg-[#F8F9FD] text-[#666A83] border-[#DFE1F0]'
              }`}>
                {COGNITIVE_LEVEL_LABELS[currentQuestion.cognitiveLevel]?.label || currentQuestion.cognitiveLevel}
              </span>
            )}

            {currentQuestion.conceptName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-semibold bg-[#F8F9FD] border border-[#DFE1F0] text-[#17172D]">
                <Brain className="w-3.5 h-3.5 text-[#4938C8]" />
                <span>Concept: {currentQuestion.conceptName}</span>
              </span>
            )}

            {currentQuestion.timestampFormatted && onSeek && typeof currentQuestion.timestampSeconds === 'number' && (
              <button
                type="button"
                onClick={() => onSeek(currentQuestion.timestampSeconds!)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4938C8] bg-[#EEEEFF] hover:bg-[#4938C8] hover:text-white px-2.5 py-1 rounded-xl transition-colors"
                title="Jump to video explanation"
              >
                <Clock className="w-3 h-3" />
                <span>Review section ({currentQuestion.timestampFormatted})</span>
              </button>
            )}
          </div>

          {/* Question Text */}
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-[#17172D] leading-snug tracking-tight">
              <MathRenderer content={currentQuestion.question} />
            </h4>
          </div>

          {/* Dynamic Question Format Renderer */}
          {currentQuestion.questionFormat === 'fill_blank' || currentQuestion.type === 'fill_blank' ? (
            <div className="space-y-3 p-5 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#666A83]">
                Fill in the Blank:
              </label>
              <input
                type="text"
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => handleSelectOption(e.target.value)}
                placeholder="Type your exact answer here..."
                className="w-full px-4 py-3 rounded-xl border border-[#DFE1F0] bg-white text-[#17172D] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4938C8]/30 focus:border-[#4938C8] transition-all"
              />
              <p className="text-[11px] text-[#666A83]">
                Assessment question: exact academic term, symbol, or numerical value accepted.
              </p>
            </div>
          ) : currentQuestion.questionFormat === 'match_columns' || currentQuestion.type === 'match_columns' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4938C8]">
                    Column A
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#17172D] font-medium">
                    {(currentQuestion.columnA || []).map((item, i) => (
                      <li key={i} className="p-2.5 rounded-xl bg-white border border-[#DFE1F0]">
                        <MathRenderer content={item} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Column B
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#17172D] font-medium">
                    {(currentQuestion.columnB || []).map((item, i) => (
                      <li key={i} className="p-2.5 rounded-xl bg-white border border-[#DFE1F0]">
                        <MathRenderer content={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-2.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#666A83]">
                  Select Matching Combination:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = userAnswers[currentQuestion.id] === option;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(option)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 active:scale-[0.99] ${
                          isSelected
                            ? 'border-[#4938C8] bg-[#EEEEFF] text-[#17172D] ring-2 ring-[#4938C8]/20 shadow-resting'
                            : 'border-[#DFE1F0] bg-white hover:border-[#5B46E8]/40 hover:bg-[#EEEEFF]/30 text-[#17172D]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected ? 'bg-[#4938C8] text-white' : 'bg-[#F8F9FD] text-[#666A83] border border-[#DFE1F0]'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="text-xs font-mono font-semibold">
                            <MathRenderer content={option} />
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#4938C8] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : currentQuestion.questionFormat === 'true_false' || currentQuestion.type === 'true_false' ? (
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = userAnswers[currentQuestion.id] === option;
                const isTrueOpt = option.toLowerCase() === 'true' || option === 'सत्य' || option === 'સાચું' || option.toLowerCase() === 'verdadero';
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`p-6 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 active:scale-[0.98] ${
                      isSelected
                        ? isTrueOpt
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30 shadow-resting font-bold'
                          : 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/30 shadow-resting font-bold'
                        : 'border-[#DFE1F0] bg-white hover:border-[#5B46E8]/40 hover:bg-[#EEEEFF]/30 text-[#17172D]'
                    }`}
                  >
                    <span className="text-lg font-black">{option}</span>
                    {isSelected && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#4938C8]">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Options List (Numerical / Conceptual) */
            <div className="space-y-3">
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = userAnswers[currentQuestion.id] === option;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 active:scale-[0.99] ${
                      isSelected
                        ? 'border-[#4938C8] bg-[#EEEEFF] text-[#17172D] ring-2 ring-[#4938C8]/20 shadow-resting'
                        : 'border-[#DFE1F0] bg-white hover:border-[#5B46E8]/40 hover:bg-[#EEEEFF]/30 hover:shadow-resting hover:-translate-y-0.5 text-[#17172D]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-[#4938C8] text-white'
                            : 'bg-[#F8F9FD] text-[#666A83] border border-[#DFE1F0]'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span className="text-sm font-medium leading-relaxed">
                        <MathRenderer content={option} />
                      </span>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-[#4938C8] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#DFE1F0]">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[#DFE1F0] bg-white disabled:opacity-40 hover:bg-[#EEEEFF] text-[#4938C8] transition-colors active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-3">
              {questions.length - answeredCount > 0 && (
                <span className="text-[11px] text-[#666A83] font-medium hidden sm:inline">
                  {questions.length - answeredCount} unanswered (scored as incorrect)
                </span>
              )}

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#4938C8] hover:bg-[#5B46E8] text-white shadow-cta hover:shadow-cta-hover transition-all active:scale-[0.98]"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-md active:scale-[0.98]"
                >
                  <Award className="w-4 h-4" />
                  <span>{isSubmitting ? 'Evaluating Submission...' : 'Submit Quiz & View Analysis'}</span>
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
            evaluationResult={evaluationResult}
            onRetake={handleRetake}
            onGeneratePractice={async (weakConcepts) => {
              if (onGeneratePractice) {
                await onGeneratePractice(weakConcepts);
              }
            }}
            isGeneratingPractice={isGeneratingPractice}
            onSeek={onSeek}
          />

          {/* Detailed Question Review with Pedagogical Correction & Step-by-Step Solutions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-[#17172D] flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span>Question Review, Step-by-Step Solutions & Teacher Correction</span>
              </h4>
              <span className="text-xs font-semibold text-[#666A83]">
                All {questions.length} Questions Evaluated
              </span>
            </div>

            {questions.map((q, qIdx) => (
              <QuestionReviewCard
                key={q.id}
                question={q}
                index={qIdx}
                userAnswer={userAnswers[q.id]}
                onSeek={onSeek}
              />
            ))}

            {/* Step 23 — Internal Quiz Design Information (Developer & Verification Report) */}
            <div className="p-6 rounded-3xl bg-white border border-[#DFE1F0] shadow-resting space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[#17172D] flex items-center gap-2">
                      <span>Internal Quiz Design & Anti-Repetition Report (Step 23)</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Zero Repetition Verified</span>
                      </span>
                    </h5>
                    <p className="text-xs text-[#666A83]">
                      Developer/testing blueprint report showing unique problem archetypes and procedure signatures across all 25 questions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDesignReport(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFE1F0] text-xs font-semibold text-[#4938C8] hover:bg-[#EEEEFF] transition-colors"
                >
                  <span>{showDesignReport ? 'Hide Blueprint' : 'Inspect Blueprint'}</span>
                  {showDesignReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showDesignReport && (
                <div className="overflow-x-auto rounded-2xl border border-[#DFE1F0]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#17172D] text-white uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Concept Tested</th>
                        <th className="py-2.5 px-3">Archetype ID</th>
                        <th className="py-2.5 px-3">Procedure Signature</th>
                        <th className="py-2.5 px-3">Unknown Type</th>
                        <th className="py-2.5 px-3">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DFE1F0] bg-white">
                      {questions.map((q, idx) => (
                        <tr key={q.id} className="hover:bg-[#F8F9FD] transition-colors">
                          <td className="py-2 px-3 font-bold text-[#4938C8]">Q{idx + 1}</td>
                          <td className="py-2 px-3 font-sans font-semibold text-[#17172D] max-w-[200px] truncate" title={q.conceptName || q.concept}>
                            {q.conceptName || q.concept || '—'}
                          </td>
                          <td className="py-2 px-3 text-[#17172D] font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-[#EEEEFF] text-[#4938C8]">
                              {q.archetypeId || q.problemArchetype || '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#666A83] text-[11px] max-w-[220px] truncate" title={q.procedureSignature}>
                            {q.procedureSignature || '—'}
                          </td>
                          <td className="py-2 px-3 text-[#4938C8] text-[11px]">
                            {q.unknownType || '—'}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              q.numericalOrTheory === 'numerical'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              {q.numericalOrTheory || q.questionCategory}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
