import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
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
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

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
      <div className="flex items-center gap-3">
        {icons[toast.type]}
        <p className="text-xs sm:text-sm font-medium leading-snug text-[#17172D]">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1.5 rounded-lg text-[#666A83] hover:text-[#17172D] hover:bg-[#EEEEFF] transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
