import React from 'react';
import { GraduationCap, ShieldCheck, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-[#DFE1F0] bg-white/75 backdrop-blur-md py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shadow-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#17172D]">
                Lumora AI
              </span>
            </div>
            <p className="text-sm text-[#666A83] max-w-md leading-relaxed">
              A spatial AI education platform designed for students and educators. Transforming video lessons into interactive concept knowledge maps, procedural diversity quizzes, and adaptive learning experiences.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17172D] mb-3">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-[#666A83]">
              <li>• Concept Knowledge Maps & Topics</li>
              <li>• 25-Question Exam Practice Quizzes</li>
              <li>• Procedural Mathematical Problem Solving</li>
              <li>• Transcript-Grounded AI Tutor</li>
              <li>• Multilingual Adaptation (Hindi, Gujarati, Spanish)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17172D] mb-3">
              Safety & Precision
            </h4>
            <div className="space-y-2 text-xs text-[#666A83]">
              <div className="flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Strict transcript grounding — zero hallucinated questions</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Zap className="w-4 h-4 text-[#4938C8] shrink-0 mt-0.5" />
                <span>Private client state & verified mathematical verification</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#DFE1F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#666A83]">
          <p>© {new Date().getFullYear()} Lumora AI. Designed for students and teachers.</p>
          <div className="flex items-center gap-4">
            <span>Powered by Google Gemini 3.8 Flash</span>
            <span>•</span>
            <span>Spatial UI Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
