import React from 'react';
import { GraduationCap, ShieldCheck, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                StudyTube AI
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Empowering students and self-learners worldwide to turn passive video watching into active, structured knowledge retention with AI-generated notes, quizzes, and flashcards.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Core Capabilities
            </h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>• Multi-format AI Summaries & Study Notes</li>
              <li>• Interactive Quizzes with Explanations</li>
              <li>• 3D Active Recall Flashcards</li>
              <li>• Transcript-Grounded Learning Tutor</li>
              <li>• Multi-Language Translation (Hindi, Gujarati, etc.)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Privacy & Quality
            </h4>
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Strict transcript grounding — eliminates hallucinated questions</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Zap className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>Client-side privacy & secure server-side credential proxying</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} StudyTube AI. Built for students and lifelong learners.</p>
          <div className="flex items-center gap-4">
            <span>Powered by Google Gemini 3.8 Flash</span>
            <span>•</span>
            <span>YouTube Education</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
