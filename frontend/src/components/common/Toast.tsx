import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, RotateCw } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  useEffect(() => {
    // Longer timeout when a retry button is provided so students can click it
    const duration = toast.onRetry ? 8000 : 4500;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.onRetry, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-[#4938C8] shrink-0" />
  };

  const badgeBorders = {
    success: 'border-emerald-200 bg-white/95 text-[#17172D]',
    error: 'border-rose-200 bg-white/95 text-[#17172D]',
    info: 'border-[#DFE1F0] bg-white/95 text-[#17172D]'
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-floating backdrop-blur-xl transition-all duration-300 animate-slide-up ${badgeBorders[toast.type]}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icons[toast.type]}
        <div className="text-xs sm:text-sm font-medium leading-snug text-[#17172D] break-words whitespace-pre-line">{toast.message}</div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {toast.onRetry && (
          <button
            onClick={() => {
              onDismiss(toast.id);
              toast.onRetry!();
            }}
            className="px-2.5 py-1 text-xs font-semibold text-[#4938C8] bg-[#EEEEFF] hover:bg-[#E3E4FF] active:scale-95 rounded-lg border border-[#4938C8]/20 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{toast.retryLabel || 'Retry'}</span>
          </button>
        )}

        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1.5 rounded-lg text-[#666A83] hover:text-[#17172D] hover:bg-[#EEEEFF] transition-colors"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
