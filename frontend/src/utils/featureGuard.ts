/**
 * Central Feature Guard for StudyTube AI
 * 
 * Enforces strict filtering of disabled legacy UI features:
 * - "Summerized Quiz" / "Summarized Quiz"
 * - "Full notes & Summary" / "Full Notes"
 * - "Flashcards"
 * 
 * Any item, tab, button, card, menu, or AI-generated action matching
 * these patterns MUST be filtered out before React renders it.
 */

export const DISABLED_FEATURE_PATTERNS = [
  'summerized-quiz',
  'summarized-quiz',
  'summary-quiz',
  'summerizedquiz',
  'summarizedquiz',
  'summaryquiz',
  'summerized quiz',
  'summarized quiz',
  'summary quiz',
  'full-notes',
  'full notes',
  'fullnotes',
  'full-notes-summary',
  'full notes & summary',
  'full notes and summary',
  'notes & summary',
  'notes and summary',
  'full notes & textbook',
  'full notes and textbook',
  'study-notes',
  'studynotes',
  'study notes',
  'summary',
  'flashcards',
  'flashcard',
  'flash-cards',
  'flash-card',
  'flash cards',
  'flash card'
] as const;

export const ALLOWED_FEATURES = [
  'quiz',
  'exam-quiz',
  'practice-quiz',
  'concept-quiz',
  '25-question-quiz',
  'assistant',
  'ai-tutor',
  'video-analysis',
  'concept-map',
  'topics',
  'performance',
  'weak-concepts'
] as const;

/**
 * Normalizes any feature name for case-insensitive, symbol-agnostic matching.
 */
export function normalizeFeatureName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Returns TRUE if the feature name, ID, or label matches a disabled feature.
 */
export function isFeatureDisabled(nameOrId: string): boolean {
  if (!nameOrId) return false;
  const raw = nameOrId.toLowerCase().trim();
  const normalized = normalizeFeatureName(nameOrId);
  const compact = raw.replace(/[^a-z0-9]/g, '');

  return DISABLED_FEATURE_PATTERNS.some(pattern => {
    const normPattern = normalizeFeatureName(pattern);
    const compactPattern = pattern.replace(/[^a-z0-9]/g, '');
    return (
      raw === pattern ||
      normalized === normPattern ||
      compact === compactPattern ||
      normalized.includes(normPattern) ||
      raw.includes(pattern)
    );
  });
}

/**
 * Hard array filter for navigation items, cards, actions, or tabs.
 */
export function filterDisabledFeatures<T>(
  items: T[],
  getName: (item: T) => string
): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !isFeatureDisabled(getName(item)));
}

/**
 * Sanitizes list of string feature tokens.
 */
export function sanitizeFeatureList(features: string[]): string[] {
  if (!Array.isArray(features)) return [];
  return features.filter(f => !isFeatureDisabled(f));
}

/**
 * Purges obsolete feature preferences or cached state from localStorage/sessionStorage.
 */
export function cleanOldFeatureStorage(): void {
  try {
    if (typeof window === 'undefined') return;

    // Check localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (isFeatureDisabled(key) || key.includes('flashcard') || key.includes('summary'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Reset activeTab if previously persisted to a disabled tab
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && isFeatureDisabled(savedTab)) {
      localStorage.setItem('activeTab', 'quiz');
    }
  } catch {
    // Silently continue
  }
}
