import React from 'react';
import { Globe } from 'lucide-react';

export interface LanguageSelectorProps {
  selectedLanguage: 'en' | 'hi' | 'gu' | 'es';
  onChange: (lang: 'en' | 'hi' | 'gu' | 'es') => void;
  className?: string;
  label?: string;
}

export const LANGUAGE_OPTIONS = [
  { code: 'en' as const, label: 'English', native: 'English' },
  { code: 'hi' as const, label: 'Hindi', native: 'हिन्दी' },
  { code: 'gu' as const, label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'es' as const, label: 'Spanish', native: 'Español' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onChange,
  className = '',
  label = 'Quiz Language'
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[#17172D] flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-[#4938C8]" />
          <span>{label}</span>
        </label>
      )}
      <div className="relative">
        <select
          value={selectedLanguage}
          onChange={(e) => onChange(e.target.value as 'en' | 'hi' | 'gu' | 'es')}
          className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-[#DFE1F0] bg-white text-[#17172D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#5B46E8]/20 focus:border-[#4938C8] cursor-pointer"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.native} ({opt.label})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#666A83]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};
