import React from 'react';
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
  Calculator,
  Compass,
  Lightbulb,
  Check,
  X,
  Target,
  BarChart3
} from 'lucide-react';
import { ConceptMap, QuizQuestion, QuizSubmissionResult } from '../../types';

interface LearningModePerformanceCardProps {
  score: number;
  total: number;
  questions: QuizQuestion[];
  userAnswers: Record<string, string>;
  conceptMap?: ConceptMap;
  evaluationResult?: QuizSubmissionResult | null;
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
  evaluationResult,
  onRetake,
  onGeneratePractice,
  isGeneratingPractice,
  onSeek
}) => {
  const percentage = evaluationResult ? evaluationResult.percentage : (total > 0 ? Math.round((score / total) * 100) : 0);
  const correctCount = evaluationResult ? evaluationResult.correct : score;
  const incorrectCount = evaluationResult ? evaluationResult.incorrect : Math.max(0, total - score);
  const answeredCount = Object.keys(userAnswers).filter(k => typeof userAnswers[k] === 'string' && userAnswers[k].trim().length > 0).length;
  const unansweredCount = Math.max(0, total - answeredCount);

  // 1. QUESTION-TYPE PERFORMANCE
  let numericalTotal = 0;
  let numericalCorrect = 0;
  let conceptualTotal = 0;
  let conceptualCorrect = 0;
  let applicationTotal = 0;
  let applicationCorrect = 0;
  let reasoningTotal = 0;
  let reasoningCorrect = 0;

  questions.forEach(q => {
    const isCorrect = userAnswers[q.id]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    const isNum = q.numericalOrTheory === 'numerical' || q.questionCategory === 'numerical' || q.questionCategory === 'application';

    if (isNum) {
      numericalTotal += 1;
      if (isCorrect) numericalCorrect += 1;
    } else {
      conceptualTotal += 1;
      if (isCorrect) conceptualCorrect += 1;
    }

    if (q.questionCategory === 'application' || (q.problemArchetype && q.problemArchetype.includes('application'))) {
      applicationTotal += 1;
      if (isCorrect) applicationCorrect += 1;
    }

    if (
      q.questionCategory === 'reasoning' ||
      (q.problemArchetype &&
        (q.problemArchetype.includes('reasoning') ||
          q.problemArchetype.includes('why') ||
          q.problemArchetype.includes('misconception')))
    ) {
      reasoningTotal += 1;
      if (isCorrect) reasoningCorrect += 1;
    }
  });

  // 2. CONCEPT PERFORMANCE MAP
  const conceptStats: Record<
    string,
    { attempted: number; correct: number; incorrect: number; timestamp?: string; timestampSeconds?: number }
  > = {};

  questions.forEach(q => {
    const concept = q.conceptName || q.concept || 'Video Educational Concepts';
    if (!conceptStats[concept]) {
      conceptStats[concept] = {
        attempted: 0,
        correct: 0,
        incorrect: 0,
        timestamp: q.timestampFormatted,
        timestampSeconds: q.timestampSeconds
      };
    }
    conceptStats[concept].attempted += 1;
    const isCorrect = userAnswers[q.id]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    if (isCorrect) {
      conceptStats[concept].correct += 1;
    } else {
      conceptStats[concept].incorrect += 1;
    }
  });

  // Coverage Table & Status: Strong (>= 75%), Weak (< 50%)
  const allConceptPerformance = evaluationResult?.conceptCoverageTable && evaluationResult.conceptCoverageTable.length > 0
    ? evaluationResult.conceptCoverageTable.map(c => {
        const matchingQ = questions.find(q => (q.conceptName || q.concept) === c.conceptName);
        const status = c.percentage >= 75 ? ('Strong' as const) : c.percentage < 50 ? ('Weak' as const) : ('Moderate' as const);
        return {
          conceptName: c.conceptName,
          status,
          attempted: c.questionsCount,
          correct: c.correctCount,
          incorrect: c.incorrectCount,
          accuracy: c.percentage,
          timestamp: matchingQ?.timestampFormatted,
          timestampSeconds: matchingQ?.timestampSeconds
        };
      })
    : Object.entries(conceptStats).map(([conceptName, stat]) => {
        const accuracy = stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0;
        const status = accuracy >= 75 ? ('Strong' as const) : accuracy < 50 ? ('Weak' as const) : ('Moderate' as const);
        return {
          conceptName,
          status,
          attempted: stat.attempted,
          correct: stat.correct,
          incorrect: stat.incorrect,
          accuracy,
          timestamp: stat.timestamp,
          timestampSeconds: stat.timestampSeconds
        };
      });

  const strongConcepts = allConceptPerformance.filter(c => c.status === 'Strong');
  const weakConcepts = allConceptPerformance.filter(c => c.status === 'Weak');

  // Identify Weakest Concept
  const sortedByAccuracy = [...allConceptPerformance].sort((a, b) => a.accuracy - b.accuracy || a.correct - b.correct);
  const weakestConcept = sortedByAccuracy.length > 0 && sortedByAccuracy[0].accuracy < 100 ? sortedByAccuracy[0] : null;

  // Look up detailed info from conceptMap if available
  const weakConceptDetails = weakConcepts.map(c => {
    const conceptObj = conceptMap?.concepts?.find(
      co => co.name.toLowerCase() === c.conceptName.toLowerCase()
    );
    const misconceptionObj = conceptMap?.misconceptions?.find(
      m => m.concept.toLowerCase() === c.conceptName.toLowerCase()
    );

    return {
      name: c.conceptName,
      correct: c.correct,
      total: c.attempted,
      explanation:
        conceptObj?.simpleExplanation ||
        conceptObj?.detailedExplanation ||
        `Focus on the foundational mathematical formulas, signed coordinates, and problem-solving method of ${c.conceptName}.`,
      misconception:
        misconceptionObj?.misconception ||
        conceptObj?.commonMisconceptions?.[0] ||
        `Check units, negative coordinates, and avoid confusing geometric midpoints with mass-weighted positions.`,
      timestamp: conceptObj?.approximateTimestamp?.timestamp || c.timestamp,
      timestampSeconds: conceptObj?.approximateTimestamp?.startSeconds || c.timestampSeconds
    };
  });

  const revisionRecommendations = weakConcepts.map(c => {
    const clean = c.conceptName.toLowerCase();
    if (clean.includes('coordinate') || clean.includes('particle')) {
      return `Revise coordinate-based problems and practice multi-particle signed calculations in ${c.conceptName}.`;
    }
    if (clean.includes('two-particle') || clean.includes('ratio')) {
      return `Practice two-particle mass-weighted formula x_cm = (m1*x1 + m2*x2)/(m1 + m2) and verify unknown mass/position calculations.`;
    }
    if (clean.includes('motion') || clean.includes('displacement')) {
      return `Review conservation of center-of-mass momentum and internal force cancellation (F_ext = 0 => a_cm = 0).`;
    }
    return `Revise the core problem-solving steps and exam applications for ${c.conceptName}.`;
  });

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#DFE1F0] shadow-resting animate-fade-in space-y-7 hover:shadow-raised transition-all duration-300">
      {/* 1. Score & Metrics Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DFE1F0]">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              percentage >= 70
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-[#EEEEFF] text-[#4938C8] border border-[#DFE1F0]'
            }`}
          >
            <Award className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#666A83]">
                Exam Mastery Analysis
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEEEFF] text-[#4938C8]">
                Total Questions: {total}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#17172D] tracking-tight mt-0.5">
              Score: {correctCount} / {total} ({percentage}%)
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#666A83] mt-1">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <Check className="w-4 h-4" />
                <span>Correct: {correctCount}</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                <X className="w-4 h-4" />
                <span>Incorrect: {incorrectCount}</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                <span>Unanswered: {unansweredCount}</span>
              </span>
              <span>•</span>
              <span className="font-medium text-[#17172D]">
                {percentage >= 80
                  ? 'Excellent conceptual & problem-solving mastery!'
                  : percentage >= 50
                  ? 'Good foundation. Targeted revision recommended below.'
                  : 'Targeted concept revision recommended before exam.'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DFE1F0] bg-white hover:bg-[#EEEEFF] font-semibold text-xs text-[#4938C8] transition-all self-start sm:self-auto shrink-0 shadow-xs active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake Quiz</span>
        </button>
      </div>

      {/* 2. WEAKEST CONCEPT DIAGNOSIS BANNER */}
      {weakestConcept ? (
        <div className="p-5 rounded-2xl bg-[#F8F9FD] border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Diagnostic Weakness Identified
              </span>
              <h4 className="font-bold text-sm sm:text-base text-[#17172D] mt-0.5">
                Target area:{' '}
                <span className="text-rose-600 font-extrabold underline decoration-rose-300 underline-offset-2">
                  {weakestConcept.conceptName}
                </span>{' '}
                ({weakestConcept.accuracy}% accuracy — {weakestConcept.correct}/{weakestConcept.attempted} correct)
              </h4>
              <p className="text-xs text-[#666A83] mt-0.5">
                Recommended revision based on actual weak concepts before advancing to practice tests.
              </p>
            </div>
          </div>

          {weakestConcept.timestamp && onSeek && typeof weakestConcept.timestampSeconds === 'number' && (
            <button
              type="button"
              onClick={() => onSeek(weakestConcept.timestampSeconds!)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold shrink-0 transition-colors border border-rose-200"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Review Lecture ({weakestConcept.timestamp})</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-950">
            Outstanding mastery across all video concepts! You demonstrated strong accuracy in both numerical calculations and conceptual principles.
          </p>
        </div>
      )}

      {/* 3. QUESTION-TYPE PERFORMANCE */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#666A83] mb-3.5 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#4938C8]" />
          <span>Question-Type Performance Analysis</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Numerical */}
          <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] flex flex-col justify-between space-y-2.5 hover:border-[#5B46E8]/40 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17172D] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#4938C8]" />
                <span>Numerical</span>
              </span>
              <span className="text-xs font-black text-[#4938C8]">
                {numericalCorrect} / {numericalTotal}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EEEEFF] overflow-hidden">
              <div
                className="h-full bg-[#4938C8] rounded-full transition-all duration-300"
                style={{ width: `${numericalTotal > 0 ? (numericalCorrect / numericalTotal) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-[#666A83]">
              {numericalTotal > 0 ? Math.round((numericalCorrect / numericalTotal) * 100) : 0}% accuracy in calculation problems
            </span>
          </div>

          {/* Conceptual */}
          <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] flex flex-col justify-between space-y-2.5 hover:border-[#5B46E8]/40 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17172D] flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                <span>Conceptual</span>
              </span>
              <span className="text-xs font-black text-emerald-700">
                {conceptualCorrect} / {conceptualTotal}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EEEEFF] overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${conceptualTotal > 0 ? (conceptualCorrect / conceptualTotal) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-[#666A83]">
              {conceptualTotal > 0 ? Math.round((conceptualCorrect / conceptualTotal) * 100) : 0}% accuracy in theory & definitions
            </span>
          </div>

          {/* Application */}
          <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] flex flex-col justify-between space-y-2.5 hover:border-[#5B46E8]/40 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17172D] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#5B46E8]" />
                <span>Application</span>
              </span>
              <span className="text-xs font-black text-[#5B46E8]">
                {applicationCorrect} / {applicationTotal || 1}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EEEEFF] overflow-hidden">
              <div
                className="h-full bg-[#5B46E8] rounded-full transition-all duration-300"
                style={{ width: `${applicationTotal > 0 ? (applicationCorrect / applicationTotal) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-[#666A83]">
              {applicationTotal > 0 ? Math.round((applicationCorrect / applicationTotal) * 100) : 0}% accuracy in real scenarios
            </span>
          </div>

          {/* Reasoning */}
          <div className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] flex flex-col justify-between space-y-2.5 hover:border-[#5B46E8]/40 hover:bg-white transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17172D] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>Reasoning</span>
              </span>
              <span className="text-xs font-black text-amber-700">
                {reasoningCorrect} / {reasoningTotal || 1}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EEEEFF] overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${reasoningTotal > 0 ? (reasoningCorrect / reasoningTotal) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-[#666A83]">
              {reasoningTotal > 0 ? Math.round((reasoningCorrect / reasoningTotal) * 100) : 0}% accuracy in deduction & traps
            </span>
          </div>
        </div>
      </div>

      {/* 4. CONCEPT-WISE PERFORMANCE */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#666A83] mb-3.5 flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#4938C8]" />
          <span>Concept Performance Breakdown</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allConceptPerformance.map((c, idx) => {
            const isStrong = c.status === 'Strong';
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-[#DFE1F0] bg-[#F8F9FD] hover:bg-white hover:border-[#5B46E8]/40 flex items-center justify-between gap-3 text-xs transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isStrong ? (
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[#17172D] leading-tight truncate">
                      {c.conceptName}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#666A83] mt-1">
                      <span>Attempted: {c.attempted}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">
                        Correct: {c.correct}
                      </span>
                      <span>•</span>
                      <span className="text-rose-600 font-semibold">
                        Incorrect: {c.incorrect}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-black text-xs text-[#17172D]">
                      {c.correct}/{c.attempted}
                    </span>
                    <span className="block text-[10px] text-[#666A83] font-bold">
                      {c.accuracy}%
                    </span>
                  </div>

                  {c.timestamp && onSeek && typeof c.timestampSeconds === 'number' && (
                    <button
                      type="button"
                      onClick={() => onSeek(c.timestampSeconds!)}
                      className="p-1.5 rounded-lg text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF] transition-colors"
                      title={`Review at ${c.timestamp}`}
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Strong vs Weak Concepts Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Strong Concepts (≥ 75% Mastery)</span>
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {strongConcepts.length > 0 ? (
                strongConcepts.map((sc, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-emerald-300 text-emerald-900 shadow-xs">
                    {sc.conceptName}: {sc.correct}/{sc.attempted} ({sc.accuracy}%)
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#666A83] italic">No concepts reached ≥75% mastery</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Weak Concepts (&lt; 50% Mastery — Needs Revision)</span>
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {weakConcepts.length > 0 ? (
                weakConcepts.map((wc, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-rose-300 text-rose-900 shadow-xs">
                    {wc.conceptName}: {wc.correct}/{wc.attempted} ({wc.accuracy}%)
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#666A83] italic">No concepts scored below 50%</span>
              )}
            </div>
          </div>
        </div>

        {/* Concept Coverage Table */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#DFE1F0] shadow-xs">
          <div className="px-4 py-3 bg-[#F8F9FD] border-b border-[#DFE1F0] flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#17172D] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4938C8]" />
              <span>Concept Coverage Table</span>
            </h5>
            <span className="text-[11px] text-[#666A83] font-medium">
              Evaluated across all {total} questions
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#17172D] text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Concept Tested</th>
                  <th className="py-2.5 px-3 text-center">Questions</th>
                  <th className="py-2.5 px-3 text-center">Correct</th>
                  <th className="py-2.5 px-3 text-center">Incorrect</th>
                  <th className="py-2.5 px-3 text-center">Mastery %</th>
                  <th className="py-2.5 px-3 text-center">Evaluation</th>
                  <th className="py-2.5 px-3 text-right">Lecture Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE1F0] bg-white">
                {allConceptPerformance.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F9FD] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#17172D]">{c.conceptName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#666A83]">{c.attempted}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{c.correct}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-600">{c.incorrect}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#17172D]">{c.accuracy}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Strong'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : c.status === 'Weak'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {c.timestamp && onSeek && typeof c.timestampSeconds === 'number' ? (
                        <button
                          type="button"
                          onClick={() => onSeek(c.timestampSeconds!)}
                          className="inline-flex items-center gap-1 text-[11px] text-[#4938C8] hover:underline font-semibold"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{c.timestamp}</span>
                        </button>
                      ) : (
                        <span className="text-[#666A83] text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Actionable Revision Recommendations linked to Weak Concepts */}
      {((evaluationResult?.recommendedRevision && evaluationResult.recommendedRevision.length > 0) || revisionRecommendations.length > 0) && (
        <div className="p-5 rounded-2xl bg-[#EEEEFF] border border-[#DFE1F0] space-y-3">
          <h4 className="font-bold text-sm text-[#17172D] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#4938C8]" />
            <span>Recommended Revision & Practice (Targeted by Weak Concepts)</span>
          </h4>
          <ul className="space-y-2 text-xs text-[#17172D]">
            {evaluationResult?.recommendedRevision && evaluationResult.recommendedRevision.length > 0
              ? evaluationResult.recommendedRevision.map((rec, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-white border border-[#DFE1F0]">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4938C8] shrink-0 mt-1.5" />
                      <div>
                        <span className="font-bold text-[#17172D] block">{rec.conceptName}</span>
                        <span className="leading-relaxed font-medium text-[#666A83]">{rec.summary}</span>
                      </div>
                    </div>
                    {rec.timestampFormatted && onSeek && typeof rec.timestampSeconds === 'number' && (
                      <button
                        type="button"
                        onClick={() => onSeek(rec.timestampSeconds!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EEEEFF] hover:bg-[#4938C8] hover:text-white text-[#4938C8] text-[11px] font-semibold transition-colors shrink-0"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Watch {rec.timestampFormatted}</span>
                      </button>
                    )}
                  </li>
                ))
              : revisionRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4938C8] shrink-0 mt-1.5" />
                    <span className="leading-relaxed font-medium">{rec}</span>
                  </li>
                ))}
          </ul>
        </div>
      )}

      {/* 6. Weak Concepts Detailed Review Panel with Practice Generator */}
      {weakConceptDetails.length > 0 && (
        <div className="p-6 rounded-3xl bg-white border border-[#DFE1F0] space-y-4 shadow-resting">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DFE1F0]">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#17172D] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4938C8]" />
                <span>Weak Concepts Detailed Analysis</span>
              </h4>
              <p className="text-xs text-[#666A83] mt-0.5">
                Key concepts where answers indicated misconceptions or room for growth.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onGeneratePractice(weakConcepts.map(w => w.conceptName))}
              disabled={isGeneratingPractice}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4938C8] hover:bg-[#5B46E8] text-white font-bold text-xs shadow-cta hover:shadow-cta-hover active:scale-[0.98] transition-all shrink-0 self-start sm:self-auto disabled:opacity-60"
            >
              {isGeneratingPractice ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Targeted Practice...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Practice Weak Concepts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {weakConceptDetails.map((weak, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#17172D] text-sm">
                      {weak.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEEEFF] text-[#4938C8]">
                      {weak.correct} / {weak.total} Correct
                    </span>
                  </div>
                  {weak.timestamp && onSeek && typeof weak.timestampSeconds === 'number' && (
                    <button
                      type="button"
                      onClick={() => onSeek(weak.timestampSeconds!)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#4938C8] font-semibold hover:underline"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Review lecture at {weak.timestamp}</span>
                    </button>
                  )}
                </div>
                <p className="text-[#17172D] leading-relaxed">
                  {weak.explanation}
                </p>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900">
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
