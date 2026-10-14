import React from 'react';
import { FlashcardsTab } from '../components/summary/FlashcardsTab';
import { Flashcard } from '../types';

export interface FlashcardsPageProps {
  flashcards: Flashcard[];
  onGenerateFlashcards: (count: number) => void;
  isGenerating: boolean;
  onExport: () => void;
}

export const FlashcardsPage: React.FC<FlashcardsPageProps> = (props) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <FlashcardsTab {...props} />
    </div>
  );
};

export default FlashcardsPage;
