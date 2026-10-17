import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export interface NotFoundPageProps {
  onGoHome?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-3xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center mb-5 shadow-resting">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-[#17172D] mb-2 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm text-[#666A83] max-w-md mb-8 leading-relaxed">
        The requested lesson or study resource does not exist or has been moved to another section.
      </p>
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#4938C8] hover:bg-[#5B46E8] rounded-2xl transition-all shadow-cta hover:shadow-cta-hover active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      )}
    </div>
  );
};

export default NotFoundPage;
