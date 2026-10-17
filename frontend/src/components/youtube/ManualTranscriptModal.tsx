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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17172D]/35 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-3xl border border-[#DFE1F0] shadow-floating p-6 sm:p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#17172D] tracking-tight">
                Manual Transcript Fallback
              </h3>
              <p className="text-xs text-[#666A83]">
                Paste any lecture text, subtitles, or study notes to generate your study guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#666A83] hover:text-[#17172D] hover:bg-[#EEEEFF] transition-all active:scale-[0.98]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {initialError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#EEEEFF] border border-[#DFE1F0] text-[#4938C8] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#4938C8]" />
            <span>{initialError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#666A83] mb-1.5">
              Subject / Lesson Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Intro to Microeconomics"
              className="w-full px-4 py-2.5 rounded-xl border border-[#DFE1F0] bg-white text-xs sm:text-sm text-[#17172D] placeholder-[#666A83] focus:outline-none focus:ring-2 focus:ring-[#5B46E8]/20 focus:border-[#5B46E8] shadow-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#666A83]">
                Transcript / Text Content *
              </label>
              <button
                type="button"
                onClick={handleFillSample}
                className="text-xs font-semibold text-[#4938C8] hover:text-[#5B46E8] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
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
              className="w-full px-4 py-3 rounded-xl border border-[#DFE1F0] bg-white text-xs sm:text-sm text-[#17172D] placeholder-[#666A83] focus:outline-none focus:ring-2 focus:ring-[#5B46E8]/20 focus:border-[#5B46E8] resize-none font-mono shadow-xs"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[#666A83] hover:text-[#17172D] hover:bg-[#EEEEFF] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#4938C8] hover:bg-[#5B46E8] text-white shadow-cta hover:shadow-cta-hover active:scale-[0.98] transition-all"
            >
              Generate Study Guide
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
