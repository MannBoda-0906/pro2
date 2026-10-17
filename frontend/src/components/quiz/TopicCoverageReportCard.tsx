import React from 'react';
import { CheckCircle2, BookOpen, Clock, Sparkles } from 'lucide-react';
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
    <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#DFE1F0] shadow-resting mb-6 animate-fade-in hover:shadow-raised transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#DFE1F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#17172D] tracking-tight">
              Topic & Concept Coverage Map
            </h3>
            <p className="text-xs text-[#666A83]">
              {report.summaryText || `${totalQuestions} questions covering ${report.coveredConcepts.length} major concepts`}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EEEEFF] border border-[#DFE1F0] text-[#4938C8] shadow-xs self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-[#4938C8]" />
          <span>Grounded in Lesson Concepts</span>
        </span>
      </div>

      {/* Concept Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {report.coveredConcepts.map((concept, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] flex items-start justify-between gap-2.5 text-xs hover:border-[#5B46E8]/40 hover:bg-white transition-all duration-200 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#17172D] leading-snug">
                  {concept.name}
                </p>
                <span className="text-[10px] text-[#666A83] uppercase tracking-wider font-semibold">
                  {concept.importance}
                </span>
              </div>
            </div>

            {concept.timestamp && onSeek && typeof concept.timestampSeconds === 'number' && (
              <button
                type="button"
                onClick={() => onSeek(concept.timestampSeconds!)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4938C8] hover:bg-[#4938C8] hover:text-white shrink-0 bg-[#EEEEFF] px-2 py-1 rounded-lg transition-colors"
                title={`Jump to ${concept.timestamp} in video`}
              >
                <Clock className="w-3 h-3" />
                <span>{concept.timestamp}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
