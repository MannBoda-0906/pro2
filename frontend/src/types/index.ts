export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  author: string;
  authorUrl?: string;
  thumbnailUrl: string;
  duration?: string;
  durationSeconds?: number;
  embedUrl: string;
}

export interface Chapter {
  title: string;
  timestamp: string;
  seconds: number;
  summary: string;
}

export interface ImportantDefinition {
  term: string;
  definition: string;
  simpleExplanation: string;
}

export interface SummaryData {
  shortSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  studyNotes: string;
  importantDefinitions: ImportantDefinition[];
  keyTakeaways: string[];
  chapters: Chapter[];
  language: string;
}

export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'scenario' | 'numerical';

export type CognitiveLevel =
  | 'level_1_recall'
  | 'level_2_understanding'
  | 'level_3_application'
  | 'level_4_analysis'
  | 'level_5_exam_reasoning';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  misconceptionExploration?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cognitiveLevel?: CognitiveLevel;
  conceptName?: string;
  conceptId?: string;
  timestampSeconds?: number;
  timestampFormatted?: string;
}

export interface Concept {
  id: string;
  name: string;
  simpleExplanation: string;
  detailedExplanation: string;
  relatedConcepts: string[];
  examples: string[];
  terminology: string[];
  formula?: string;
  conditionsOrLimitations?: string;
  commonMisconceptions: string[];
  examImportance: 'essential' | 'important' | 'supporting';
  approximateTimestamp?: {
    startSeconds: number;
    timestamp: string;
  };
}

export interface ConceptRelationship {
  sourceConcept: string;
  targetConcept: string;
  relationshipType: 'causes' | 'proportional_to' | 'inversely_proportional' | 'component_of' | 'prerequisite_for' | 'contrasts_with' | 'applies_to';
  description: string;
}

export interface ConceptProcess {
  processName: string;
  steps: string[];
  outcome: string;
}

export interface ConceptFormula {
  name: string;
  formula: string;
  variables: { symbol: string; meaning: string; unit?: string }[];
  applicability: string;
}

export interface ConceptMap {
  mainTopic: string;
  subjectCategory:
    | 'physics'
    | 'mathematics'
    | 'chemistry'
    | 'biology'
    | 'computer_science'
    | 'programming'
    | 'history'
    | 'geography'
    | 'economics'
    | 'business'
    | 'engineering'
    | 'general';
  subtopics: string[];
  concepts: Concept[];
  relationships: ConceptRelationship[];
  definitions: { term: string; definition: string; simpleExplanation: string }[];
  formulas: ConceptFormula[];
  processes: ConceptProcess[];
  examples: { concept: string; example: string; takeaway: string }[];
  misconceptions: { misconception: string; correction: string; concept: string }[];
  examImportantPoints: string[];
  language?: string;
}

export interface TopicCoverageReport {
  mainTopic: string;
  subjectCategory: string;
  coveredConcepts: {
    name: string;
    importance: 'essential' | 'important' | 'supporting';
    timestamp?: string;
    timestampSeconds?: number;
  }[];
  summaryText: string;
}

export interface QuizData {
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language?: string;
  conceptMap?: ConceptMap;
  topicCoverageReport?: TopicCoverageReport;
  questions: QuizQuestion[];
}

export interface WeakConceptReview {
  conceptName: string;
  explanation: string;
  examples: string[];
  misconceptionToAvoid: string;
  reviewTimestamp?: string;
  reviewTimestampSeconds?: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  groundedInVideo: boolean;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  videoId: string;
  url: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  createdAt: string;
  summary?: SummaryData;
  quiz?: QuizData;
  flashcards?: Flashcard[];
}

export interface DemoSample {
  id: string;
  url: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  duration: string;
  durationSeconds: number;
  summaryPreview: string;
}
