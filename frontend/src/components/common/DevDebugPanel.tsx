import React, { useState } from 'react';
import { Terminal, ChevronUp, ChevronDown, ShieldCheck, AlertCircle } from 'lucide-react';
import { QuizQuestion } from '../../types';

interface DevDebugPanelProps {
  analysisSessionId?: string | null;
  videoId?: string | null;
  transcriptHash?: string | null;
  conceptCount?: number;
  questionCount?: number;
  questions?: QuizQuestion[];
  discardedCount?: number;
  lastDiscardedReason?: string;
}

export const DevDebugPanel: React.FC<DevDebugPanelProps> = ({
  analysisSessionId,
  videoId,
  transcriptHash,
  conceptCount = 0,
  questionCount = 0,
  questions = [],
  discardedCount = 0,
  lastDiscardedReason = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // In production, never render
  if (!(import.meta as any).env?.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs select-none">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#17172D] text-emerald-400 border border-emerald-500/40 shadow-xl hover:scale-105 transition-all"
          title="Open Dev Debug Panel"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold text-[11px]">DEV SESSION</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
            {videoId ? videoId.slice(0, 8) : 'idle'}
          </span>
          {discardedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px]" title="Stale responses discarded">
              {discardedCount} discarded
            </span>
          )}
        </button>
      ) : (
        <div className="w-96 max-h-[80vh] overflow-y-auto rounded-2xl bg-[#17172D] text-slate-200 border border-slate-700 shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Session Isolation Debugger</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div>
              <span className="text-slate-400">Current Session ID: </span>
              <span className="text-amber-300 break-all">{analysisSessionId || 'none'}</span>
            </div>
            <div>
              <span className="text-slate-400">Canonical Video ID: </span>
              <span className="text-cyan-300">{videoId || 'none'}</span>
            </div>
            <div>
              <span className="text-slate-400">Transcript Hash: </span>
              <span className="text-purple-300 break-all">{transcriptHash ? transcriptHash.slice(0, 16) + '...' : 'none'}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span>Concepts Grounded: <strong className="text-emerald-400">{conceptCount}</strong></span>
              <span>Questions Verified: <strong className="text-emerald-400">{questionCount}</strong></span>
            </div>
            {discardedCount > 0 && (
              <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-[10px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Stale Responses Discarded: {discardedCount}</span>
                </div>
                {lastDiscardedReason && (
                  <p className="text-slate-300">{lastDiscardedReason}</p>
                )}
              </div>
            )}
          </div>

          {questions.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Question Source Metadata ({questions.length}):
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[10px]">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-800/80 border border-slate-700/50 flex flex-col">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-bold">Q{idx + 1} ({q.questionFormat || q.type})</span>
                      <span className="text-emerald-400">{q.conceptId}</span>
                    </div>
                    <span className="text-slate-400 text-[9px] truncate">
                      sess: {q.analysisSessionId ? q.analysisSessionId.slice(0, 8) : 'missing'} | vid: {q.videoId || 'missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
