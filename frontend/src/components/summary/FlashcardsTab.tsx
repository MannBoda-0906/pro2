import React, { useState, useEffect } from 'react';
import {
  Layers,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Shuffle,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Download
} from 'lucide-react';
import { Flashcard } from '../../types';

interface FlashcardsTabProps {
  flashcards: Flashcard[];
  onGenerateFlashcards: (count: number) => void;
  isGenerating: boolean;
  onExport: () => void;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  flashcards,
  onGenerateFlashcards,
  isGenerating,
  onExport
}) => {
  const [cards, setCards] = useState<Flashcard[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCards(flashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cards.length === 0) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length, currentIndex]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleMarkMastered = (id: string) => {
    setMasteredIds(prev => new Set([...prev, id]));
    setReviewIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    handleNext();
  };

  const handleMarkReview = (id: string) => {
    setReviewIds(prev => new Set([...prev, id]));
    setMasteredIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    handleNext();
  };

  const handleResetProgress = () => {
    setMasteredIds(new Set());
    setReviewIds(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center max-w-xl mx-auto animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
          Generate Study Flashcards
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Create 3D flip flashcards for active recall and spaced repetition based on this video.
        </p>

        <button
          onClick={() => onGenerateFlashcards(8)}
          disabled={isGenerating}
          className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-400 text-white font-semibold text-sm transition-all shadow-md shadow-brand-600/25 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Generating Flashcards...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate 8 Flashcards</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const isMastered = masteredIds.has(currentCard.id);
  const needsReview = reviewIds.has(currentCard.id);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Top Bar: Progress & Tools */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span>•</span>
          <span className="text-emerald-600 font-bold">{masteredIds.size} Mastered</span>
          <span>•</span>
          <span className="text-amber-600 font-bold">{reviewIds.size} Need Review</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Shuffle cards"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={onExport}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Export flashcards"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetProgress}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Reset progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-brand-600 transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* 3D Interactive Flip Card */}
      <div
        onClick={() => setIsFlipped(prev => !prev)}
        className="group relative h-80 sm:h-96 w-full cursor-pointer perspective-1000 select-none"
        tabIndex={0}
        role="button"
        aria-label="Click or press Space to flip flashcard"
      >
        <div
          className={`relative h-full w-full rounded-3xl transition-transform duration-500 transform-style-3d shadow-md hover:shadow-xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Card Front */}
          <div className="absolute inset-0 backface-hidden p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                {currentCard.category || 'Concept'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Front</span>
            </div>

            <div className="text-center my-auto px-4">
              <h4 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                {currentCard.front}
              </h4>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Click or press Space to reveal answer</span>
            </div>
          </div>

          {/* Card Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 p-8 sm:p-10 rounded-3xl bg-brand-50/90 dark:bg-slate-900 border-2 border-brand-500/40 dark:border-brand-500/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-200 dark:bg-brand-950 text-brand-800 dark:text-brand-300">
                Answer & Explanation
              </span>
              <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">Back</span>
            </div>

            <div className="text-center my-auto px-4">
              <p className="text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                {currentCard.back}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-medium">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Click or press Space to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mastery Response Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleMarkReview(currentCard.id)}
          className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            needsReview
              ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200'
              : 'border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-slate-700 dark:text-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span>Still Learning / Review</span>
        </button>

        <button
          type="button"
          onClick={() => handleMarkMastered(currentCard.id)}
          className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            isMastered
              ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 text-emerald-900 dark:text-emerald-200'
              : 'border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-200'
          }`}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>Got It! Mastered</span>
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Use ← / → arrow keys to navigate
        </span>

        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
