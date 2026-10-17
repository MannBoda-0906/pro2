import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Brain,
  Clock,
  Sparkles,
  Calculator,
  Lightbulb,
  AlertTriangle,
  Compass,
  BookOpen
} from 'lucide-react';
import { QuizQuestion } from '../../types';
import { MathRenderer } from '../common/MathRenderer';

interface QuestionReviewCardProps {
  question: QuizQuestion;
  index: number;
  userAnswer?: string;
  onSeek?: (seconds: number) => void;
}

const COGNITIVE_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  level_1_recall: { label: 'Level 1: Recall', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  level_2_understanding: { label: 'Level 2: Understanding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  level_3_application: { label: 'Level 3: Application', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  level_4_analysis: { label: 'Level 4: Analysis', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  level_5_exam_reasoning: { label: 'Level 5: Exam Reasoning', color: 'bg-amber-50 text-amber-800 border-amber-200' }
};

const QUESTION_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  numerical: { label: 'Numerical Calculation', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  application: { label: 'Application Problem', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' },
  conceptual: { label: 'Conceptual Theory', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  reasoning: { label: 'Scientific Reasoning', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  exam_style: { label: 'Exam Pattern', color: 'bg-[#EEEEFF] text-[#4938C8] border-[#DFE1F0]' }
};

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  question,
  index,
  userAnswer,
  onSeek
}) => {
  const [showSolution, setShowSolution] = useState(true);

  const isAnswered = typeof userAnswer === 'string' && userAnswer.trim().length > 0;
  const isCorrect = isAnswered && userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  const getOptionLetter = (optText: string): string => {
    const idx = question.options.findIndex(
      o => o.trim().toLowerCase() === optText.trim().toLowerCase()
    );
    return idx >= 0 ? String.fromCharCode(65 + idx) : '-';
  };

  const userLetter = isAnswered ? getOptionLetter(userAnswer) : 'None';
  const correctLetter = getOptionLetter(question.correctAnswer);

  const archetypeDisplay = question.problemArchetype
    ? question.problemArchetype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : question.numericalOrTheory === 'numerical'
    ? 'Problem Solving Calculation'
    : 'Conceptual Reasoning';

  const fullSolutionText = question.solution || question.stepByStepSolution || question.explanation;

  return (
    <div
      className={`p-6 sm:p-7 rounded-3xl bg-white border transition-all duration-300 space-y-5 shadow-resting hover:shadow-raised ${
        isCorrect
          ? 'border-emerald-300 ring-1 ring-emerald-400/20'
          : 'border-rose-300 ring-1 ring-rose-400/20'
      }`}
    >
      {/* 1. Header with Question Number, Categories, Archetypes, and Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Question Index Badge */}
          <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#17172D] text-white shadow-xs">
            Question {index + 1}
          </span>

          {/* Numerical vs Theory Indicator */}
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-[#EEEEFF] text-[#4938C8] border border-[#DFE1F0]">
            {question.numericalOrTheory === 'numerical' ? 'Numerical Problem' : 'Conceptual Theory'}
          </span>

          {/* Problem Archetype Badge */}
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wide bg-[#F8F9FD] text-[#17172D] border border-[#DFE1F0]">
            Type: {archetypeDisplay}
          </span>

          {/* Difficulty Badge */}
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            {question.difficulty}
          </span>

          {/* Cognitive Level */}
          {question.cognitiveLevel && (
            <span
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                COGNITIVE_LEVEL_LABELS[question.cognitiveLevel]?.color || 'bg-[#F8F9FD] text-[#666A83] border-[#DFE1F0]'
              }`}
            >
              {COGNITIVE_LEVEL_LABELS[question.cognitiveLevel]?.label || question.cognitiveLevel}
            </span>
          )}
        </div>

        {/* Video Jump & Result Indicator */}
        <div className="flex items-center gap-2.5">
          {question.timestampFormatted && onSeek && typeof question.timestampSeconds === 'number' && (
            <button
              type="button"
              onClick={() => onSeek(question.timestampSeconds!)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4938C8] bg-[#EEEEFF] hover:bg-[#4938C8] hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-xs"
              title="Jump to video explanation"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Review ({question.timestampFormatted})</span>
            </button>
          )}

          {/* Prominent TRUE / FALSE Result Indicator (Step 18 & 19) */}
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${
              isCorrect
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Result: TRUE</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Result: FALSE</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Concept Tested Tag */}
      {(question.conceptName || question.concept) && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[#17172D] bg-[#F8F9FD] px-3.5 py-2 rounded-2xl border border-[#DFE1F0] w-fit shadow-xs">
          <Brain className="w-4 h-4 text-[#4938C8] shrink-0" />
          <span>
            Concept Tested:{' '}
            <strong className="text-[#17172D]">
              {question.conceptName || question.concept}
            </strong>
          </span>
          {question.subtopic && (
            <span className="text-[11px] text-[#666A83] ml-1">
              ({question.subtopic})
            </span>
          )}
        </div>
      )}

      {/* 2. Question Text */}
      <div>
        <h4 className="text-base sm:text-lg font-bold text-[#17172D] leading-relaxed">
          <MathRenderer content={question.question} />
        </h4>
      </div>

      {/* 3. User Selection vs Correct Answer Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* User's Answer */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs ${
            isCorrect
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/80 border-rose-300 text-rose-950'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
              isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {userLetter}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666A83]">
                Your Selection
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isCorrect
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-rose-200 text-rose-900'
                }`}
              >
                {isCorrect ? 'Result: TRUE' : 'Result: FALSE'}
              </span>
            </div>
            <div className="text-xs font-semibold mt-1 leading-snug break-words">
              {isAnswered ? <MathRenderer content={userAnswer} /> : 'Not answered'}
            </div>
          </div>
        </div>

        {/* Correct Answer */}
        <div className="p-4 rounded-2xl border bg-emerald-50/80 border-emerald-300 text-emerald-950 flex items-start gap-3 shadow-xs">
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            {correctLetter}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666A83]">
                Verified Key
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                Official Solution
              </span>
            </div>
            <div className="text-xs font-semibold mt-1 leading-snug break-words">
              <MathRenderer content={question.correctAnswer} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Options List with Visual Feedback */}
      <div className="space-y-2.5">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#666A83]">
          All Multiple-Choice Options:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {question.options.map((option, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const isThisCorrect = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            const isThisUserChoice = isAnswered && option.trim().toLowerCase() === userAnswer?.trim().toLowerCase();

            let optionStyle =
              'bg-[#F8F9FD] border-[#DFE1F0] text-[#17172D]';
            let badgeStyle =
              'bg-white text-[#666A83] border border-[#DFE1F0]';

            if (isThisCorrect) {
              optionStyle =
                'bg-[#EEEEFF] border-[#4938C8] text-[#17172D] font-bold ring-2 ring-[#4938C8]/20 shadow-xs';
              badgeStyle = 'bg-[#4938C8] text-white';
            } else if (isThisUserChoice && !isCorrect) {
              optionStyle =
                'bg-rose-50 border-rose-300 text-rose-950 font-medium line-through ring-1 ring-rose-300';
              badgeStyle = 'bg-rose-600 text-white';
            }

            return (
              <div
                key={optIdx}
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all ${optionStyle}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${badgeStyle}`}
                  >
                    {letter}
                  </div>
                  <span className="leading-snug break-words">
                    <MathRenderer content={option} />
                  </span>
                </div>
                {isThisCorrect && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4938C8] shrink-0">
                    <Check className="w-4 h-4 text-[#4938C8]" />
                    <span>Correct</span>
                  </span>
                )}
                {isThisUserChoice && !isCorrect && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 shrink-0">
                    <X className="w-4 h-4 text-rose-600" />
                    <span>Your Choice</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Teacher Explanation, Mistake Diagnosis, and Correct Method Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] space-y-4">
        {/* A. If Wrong: Why your answer is wrong (Diagnostic feedback) */}
        {!isCorrect && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-rose-700 font-bold uppercase tracking-wider text-[11px]">
              <AlertTriangle className="w-4 h-4" />
              <span>Why Your Answer is Incorrect:</span>
            </div>
            <div className="text-rose-950 leading-relaxed font-medium">
              <MathRenderer
                content={
                  question.mistakeExplanation ||
                  `Selecting option ${userLetter} deviates from the required problem-solving principle. Check whether formula variables were swapped, sign conventions omitted, or geometric midpoint confused with mass-weighted center of mass.`
                }
              />
            </div>
          </div>
        )}

        {/* B. Correct Method / Governing Principle */}
        {question.correctMethod && (
          <div className="p-4 rounded-xl bg-[#EEEEFF] border border-[#DFE1F0] space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-[#4938C8] font-bold uppercase tracking-wider text-[11px]">
              <Compass className="w-4 h-4" />
              <span>Correct Method & Governing Principle:</span>
            </div>
            <div className="text-[#17172D] leading-relaxed font-medium">
              <MathRenderer content={question.correctMethod} />
            </div>
          </div>
        )}

        {/* C. Concept Explanation */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 text-[#17172D] font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Concept Explanation:</span>
          </div>
          <div className="text-[#666A83] leading-relaxed pl-6">
            <MathRenderer content={question.explanation} />
          </div>
        </div>

        {/* D. Common Misconception Clarification (if available) */}
        {question.misconceptionExploration && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Common Misconception:</span>
            </div>
            <div className="leading-relaxed pl-5">
              <MathRenderer content={question.misconceptionExploration} />
            </div>
          </div>
        )}

        {/* E. Collapsible / Visible Full Step-by-Step Solution Section */}
        <div className="pt-2 border-t border-[#DFE1F0]">
          <button
            type="button"
            onClick={() => setShowSolution(prev => !prev)}
            className="flex items-center justify-between w-full py-2 text-xs font-bold text-[#17172D] hover:text-[#4938C8] transition-colors"
          >
            <span className="flex items-center gap-2 text-[#4938C8]">
              <Calculator className="w-4 h-4" />
              <span>
                {question.numericalOrTheory === 'numerical'
                  ? 'Step-by-Step Numerical Derivation & Solution'
                  : 'Complete Conceptual & Theoretical Solution'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#666A83] font-semibold">
              <span>{showSolution ? 'Collapse Solution' : 'View Full Solution'}</span>
              {showSolution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {showSolution && (
            <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-white text-[#17172D] border border-[#DFE1F0] text-xs space-y-3 animate-fade-in shadow-resting">
              <div className="flex items-center justify-between border-b border-[#DFE1F0] pb-2.5">
                <span className="font-sans font-bold text-[#4938C8] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#5B46E8]" />
                  <span>Exact Verified Solution ({question.questionFormat || question.type})</span>
                </span>
                <span className="font-sans text-[10px] text-[#666A83]">
                  Method: {question.methodId || 'Standard'} | Proc: {question.procedureSignature ? question.procedureSignature.slice(0, 30) : 'canonical'}
                </span>
              </div>

              {/* Structured Solution Details */}
              {question.structuredSolution?.numerical ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                      <span className="font-bold text-[#4938C8] font-sans block text-[10px] uppercase">Given:</span>
                      <MathRenderer content={question.structuredSolution.numerical.given} />
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                      <span className="font-bold text-[#4938C8] font-sans block text-[10px] uppercase">Required:</span>
                      <MathRenderer content={question.structuredSolution.numerical.required} />
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                    <span className="font-bold text-[#4938C8] font-sans block text-[10px] uppercase">Governing Relationship:</span>
                    <MathRenderer content={question.structuredSolution.numerical.relationship} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                    <span className="font-bold text-[#4938C8] font-sans block text-[10px] uppercase">Substitution:</span>
                    <MathRenderer content={question.structuredSolution.numerical.substitution} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#EEEEFF] border border-[#DFE1F0]">
                    <span className="font-bold text-[#4938C8] font-sans block text-[10px] uppercase">Step-by-Step Calculation:</span>
                    <MathRenderer content={question.structuredSolution.numerical.calculation} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-950 flex items-center justify-between">
                    <span>Final Answer: <MathRenderer content={question.structuredSolution.numerical.finalAnswer} inline /></span>
                    <span className="text-[10px] uppercase bg-emerald-200 px-2 py-0.5 rounded-md">Unit: {question.structuredSolution.numerical.unit}</span>
                  </div>
                </div>
              ) : question.structuredSolution?.trueFalse ? (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#EEEEFF] border border-[#DFE1F0]">
                    <span className="font-bold text-[#4938C8] block text-[10px] uppercase">Truth Value:</span>
                    <span className="font-bold text-sm">{question.structuredSolution.trueFalse.truthValue ? 'TRUE' : 'FALSE'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                    <span className="font-bold text-[#4938C8] block text-[10px] uppercase">Reasoning:</span>
                    <div className="leading-relaxed"><MathRenderer content={question.structuredSolution.trueFalse.reasoning} /></div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                    <span className="font-bold text-[#4938C8] block text-[10px] uppercase">Concept Explanation:</span>
                    <div className="leading-relaxed"><MathRenderer content={question.structuredSolution.trueFalse.conceptExplanation} /></div>
                  </div>
                </div>
              ) : question.structuredSolution?.fillBlank ? (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="font-bold text-emerald-800 block text-[10px] uppercase">Defensible Answer:</span>
                    <span className="font-bold text-sm text-emerald-950"><MathRenderer content={question.structuredSolution.fillBlank.correctTermOrValue} inline /></span>
                  </div>
                  {question.structuredSolution.fillBlank.acceptedEquivalents.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                      <span className="font-bold text-[#4938C8] block text-[10px] uppercase">Accepted Equivalents & Tolerances:</span>
                      <span>{question.structuredSolution.fillBlank.acceptedEquivalents.join(' | ')}</span>
                    </div>
                  )}
                  <div className="p-2.5 rounded-xl bg-[#F8F9FD] border border-[#DFE1F0]">
                    <span className="font-bold text-[#4938C8] block text-[10px] uppercase">Explanation:</span>
                    <div className="leading-relaxed"><MathRenderer content={question.structuredSolution.fillBlank.explanation} /></div>
                  </div>
                </div>
              ) : question.structuredSolution?.match ? (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="font-bold text-emerald-800 block text-[10px] uppercase">Verified Column Mapping:</span>
                    <span className="font-bold text-sm text-emerald-950">{question.correctAnswer}</span>
                  </div>
                  <div className="divide-y divide-[#DFE1F0] border border-[#DFE1F0] rounded-xl overflow-hidden">
                    {question.structuredSolution.match.pairs.map((p, pIdx) => (
                      <div key={pIdx} className="p-2 bg-white flex items-center justify-between">
                        <span className="font-bold text-[#4938C8]"><MathRenderer content={p.itemA} /></span>
                        <span>↔</span>
                        <span className="text-[#17172D]"><MathRenderer content={p.itemB} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-line leading-relaxed text-[#17172D] pt-1 text-xs">
                  <MathRenderer content={fullSolutionText} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
