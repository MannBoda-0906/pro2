import React, { useState } from 'react';
import { X, FileText, Sparkles, AlertCircle } from 'lucide-react';

interface ManualTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, transcript: string) => void;
  initialTitle?: string;
  initialError?: string;
}

export const ManualTranscriptModal: React.FC<ManualTranscriptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = '',
  initialError
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) {
      setError('Please paste or type the transcript text.');
      return;
    }
    setError(null);
    onSubmit(title.trim() || 'Custom Study Material', transcript.trim());
  };

  const handleFillSample = () => {
    setTitle('Quantum Computing: Superposition & Qubits');
    setTranscript(`Welcome to this quick lesson on Quantum Computing.
Unlike classical computers that operate on bits representing strictly zeros or ones, quantum computers leverage qubits.
A qubit can exist in a superposition of states, allowing it to represent 0, 1, or both simultaneously with complex amplitudes.
Another fundamental principle is quantum entanglement. When qubits become entangled, the quantum state of one instantaneously determines the state of another, regardless of distance.
Quantum computing offers exponential speedups for problems like integer factorization using Shor's algorithm, simulating molecular chemistry, and optimizing complex logistics networks.`);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Manual Transcript Fallback
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste any lecture text, subtitles, or study notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {initialError && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{initialError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Video / Subject Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Intro to Microeconomics"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Transcript / Text Content *
              </label>
              <button
                type="button"
                onClick={handleFillSample}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Fill Sample Text
              </button>
            </div>
            <textarea
              rows={8}
              value={transcript}
              onChange={e => {
                setTranscript(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Paste captions or lecture transcript here..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono text-xs"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-medium">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all"
            >
              Generate Study Guide
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
