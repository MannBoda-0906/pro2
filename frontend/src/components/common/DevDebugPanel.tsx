import React, { useState } from 'react';
import { Terminal, ChevronDown, ShieldCheck, AlertCircle, CheckCircle2, XCircle, RefreshCw, Database } from 'lucide-react';
import { QuizQuestion } from '../../types';

export interface DevDiagnosticData {
  analysisSessionId?: string | null;
  generationAttemptId?: string | null;
  videoId?: string | null;
  transcriptHash?: string | null;
  currentStage?: string;
  conceptCount?: number;
  coveredConcepts?: number;
  blueprintCount?: number;
  validCount?: number;
  rejectedCount?: number;
  rejectionReasons?: Record<string, number>;
  retryCount?: number;
  checkpointHits?: Record<string, number | boolean>;
  lastError?: {
    code?: string;
    stage?: string;
    message?: string;
    refId?: string;
  } | null;
  questions?: QuizQuestion[];
  discardedCount?: number;
  lastDiscardedReason?: string;
}

export const DevDebugPanel: React.FC<DevDiagnosticData> = ({
  analysisSessionId,
  generationAttemptId = 'att_1',
  videoId,
  transcriptHash,
  currentStage = 'Idle',
  conceptCount = 0,
  coveredConcepts = 0,
  blueprintCount = 0,
  validCount = 0,
  rejectedCount = 0,
  rejectionReasons = {},
  retryCount = 0,
  checkpointHits = {},
  lastError = null,
  questions = [],
  discardedCount = 0,
  lastDiscardedReason = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // In production, never render
  if (!(import.meta as any).env?.DEV) {
    return null;
  }

  const effectiveValid = questions.length > 0 ? questions.length : validCount;
  const checkpointEntries = Object.entries(checkpointHits);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs select-none">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#17172D] text-emerald-400 border border-emerald-500/40 shadow-xl hover:scale-105 transition-all"
          title="Open Dev Diagnostics HUD"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold text-[11px]">DEV DIAGNOSTICS</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
            {videoId ? videoId.slice(0, 8) : 'idle'}
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px]">
            {generationAttemptId}
          </span>
          {lastError && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px]">
              ERR
            </span>
          )}
        </button>
      ) : (
        <div className="w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl bg-[#131326] text-slate-200 border border-slate-700 shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>StudyTube Dev Diagnostics HUD</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Session & Attempt Overview */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Stage:</span>
              <span className="font-bold text-indigo-300">{currentStage}</span>
            </div>
            <div>
              <span className="text-slate-400">Video ID: </span>
              <span className="text-cyan-300 font-mono">{videoId || 'none'}</span>
            </div>
            <div>
              <span className="text-slate-400">Session ID: </span>
              <span className="text-amber-300 font-mono break-all">{analysisSessionId || 'none'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Attempt ID: </span>
              <span className="text-purple-300 font-mono font-bold">{generationAttemptId} (Retries: {retryCount})</span>
            </div>
            {transcriptHash && (
              <div>
                <span className="text-slate-400">Transcript Hash: </span>
                <span className="text-slate-400 font-mono text-[10px]">{transcriptHash.slice(0, 18)}...</span>
              </div>
            )}
          </div>

          {/* Concepts & Blueprint Counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Concepts</span>
              <span className="text-sm font-bold text-emerald-400">{conceptCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Covered</span>
              <span className="text-sm font-bold text-cyan-400">{coveredConcepts}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Blueprint</span>
              <span className="text-sm font-bold text-amber-400">{blueprintCount || 25}</span>
            </div>
          </div>

          {/* Question Validation Metrics */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-[11px]">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
              Validation Distribution
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Valid Accepted: <strong>{effectiveValid}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected: <strong>{rejectedCount}</strong></span>
              </div>
            </div>

            {Object.keys(rejectionReasons).length > 0 && (
              <div className="pt-1.5 border-t border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] font-semibold block">Rejection Breakdown:</span>
                {Object.entries(rejectionReasons).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between text-[10px] text-slate-300">
                    <span className="truncate max-w-[280px]" title={reason}>• {reason}</span>
                    <span className="text-rose-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cache & Checkpoint Hits */}
          {checkpointEntries.length > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] uppercase font-bold">
                <Database className="w-3.5 h-3.5" />
                <span>Stage Checkpoints Hit</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {checkpointEntries.map(([stg, hit]) => (
                  <div key={stg} className="flex justify-between px-1.5 py-0.5 rounded bg-slate-800/60">
                    <span className="text-slate-400 truncate">{stg}</span>
                    <span className="text-emerald-400 font-bold">{hit ? 'HIT' : 'MISS'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Error (if any) */}
          {lastError && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Last Error: [{lastError.code || 'UNKNOWN'}]</span>
              </div>
              <p className="text-slate-200 text-[10px]">{lastError.message}</p>
              <div className="flex justify-between text-[10px] text-rose-400 pt-1">
                <span>Stage: {lastError.stage || 'pipeline'}</span>
                {lastError.refId && <span>Ref: {lastError.refId}</span>}
              </div>
            </div>
          )}

          {/* Session Isolation Discarded */}
          {discardedCount > 0 && (
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[10px] space-y-1">
              <span className="font-bold">Stale Discards: {discardedCount}</span>
              {lastDiscardedReason && <p className="text-slate-300">{lastDiscardedReason}</p>}
            </div>
          )}

          {/* Verified Questions Breakdown */}
          {questions.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Question Details ({questions.length}):
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[10px]">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-800/80 border border-slate-700/50 flex flex-col">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-bold">Q{idx + 1} ({q.questionFormat || q.type})</span>
                      <span className="text-emerald-400">{q.conceptId}</span>
                    </div>
                    <span className="text-slate-400 text-[9px] truncate">
                      Method: {q.methodId || q.taskFamily || 'N/A'} | Math: {q.validationStatus?.mathVerified ? '✓' : '—'}
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
