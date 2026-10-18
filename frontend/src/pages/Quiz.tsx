import React from 'react';
import { QuizTab } from '../components/quiz/QuizTab';
import { QuizData } from '../types';

export interface QuizPageProps {
  quiz: QuizData | null;
  videoId?: string;
  analysisSessionId?: string;
  onGenerateQuiz: (difficulty: 'easy' | 'medium' | 'hard', count: number) => void;
  isGenerating: boolean;
  onExportQuiz: () => void;
  onSeek?: (seconds: number) => void;
}

export const QuizPage: React.FC<QuizPageProps> = (props) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <QuizTab {...props} />
    </div>
  );
};

export default QuizPage;
