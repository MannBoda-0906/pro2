import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export interface NotFoundPageProps {
  onGoHome?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
        The requested lesson or study resource does not exist or has been moved.
      </p>
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      )}
    </div>
  );
};

export default NotFoundPage;
