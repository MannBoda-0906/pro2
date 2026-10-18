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

export type QuestionFormat = 'numerical' | 'true_false' | 'fill_blank' | 'match_columns' | 'theoretical';

export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'scenario' | 'numerical' | 'fill_blank' | 'match_columns' | 'theoretical';

export type QuestionCategory = 'numerical' | 'application' | 'conceptual' | 'reasoning' | 'exam_style' | 'true_false' | 'fill_blank' | 'match_columns' | 'theoretical';

export type VideoCoverageLevel =
  | 'FULLY_COVERED'
  | 'MOSTLY_COVERED'
  | 'PARTIALLY_COVERED'
  | 'MENTIONED_ONLY'
  | 'NOT_COVERED'
  | 'fully_covered'
  | 'mostly_covered'
  | 'partially_covered'
  | 'mentioned_only'
  | 'not_covered';

export type CognitiveLevel =
  | 'level_1_recall'
  | 'level_2_understanding'
  | 'level_3_application'
  | 'level_4_analysis'
  | 'level_5_exam_reasoning';

export interface StructuredSolution {
  format: QuestionFormat;
  numerical?: {
    given: string;
    required: string;
    relationship: string;
    substitution: string;
    calculation: string;
    finalAnswer: string;
    unit: string;
  };
  theory?: {
    concept: string;
    reasoning: string;
    correctExplanation: string;
  };
  trueFalse?: {
    truthValue: boolean;
    reasoning: string;
    conceptExplanation: string;
  };
  fillBlank?: {
    correctTermOrValue: string;
    explanation: string;
    acceptedEquivalents: string[];
  };
  match?: {
    pairs: Array<{ itemA: string; itemB: string }>;
    explanationPerPair: Array<{ pair: string; explanation: string }>;
  };
  fullText: string;
}

export interface QuestionValidationRecord {
  isValid: boolean;
  validatorType: string;
  passCount: number;
  recomputedAnswer?: string | number;
  rejectionHistory?: string[];
  mathVerified?: boolean;
}

export interface QuizQuestion {
  id: string;
  analysisSessionId?: string;
  generationAttemptId?: string;
  videoId?: string;
  slotIndex?: number;
  type: QuestionType;
  questionFormat?: QuestionFormat;
  questionCategory?: QuestionCategory;
  topic?: string;
  subtopic?: string;
  concept?: string;
  conceptName?: string;
  conceptId?: string;
  taskFamily?: string;
  methodId?: string;
  problemArchetype?: string;
  archetypeId?: string;
  procedureSignature?: string;
  unknownType?: string;
  requiredOperation?: string;
  cognitiveTask?: string;
  scenarioType?: string;
  givenInformation?: string;
  videoCoverage?: VideoCoverageLevel;
  difficulty: 'easy' | 'medium' | 'hard';
  cognitiveLevel?: CognitiveLevel;
  numericalOrTheory?: 'numerical' | 'theory';
  isDirectFormulaCalculation?: boolean;
  question: string;
  options: string[];
  correctAnswer: string;
  acceptedEquivalents?: string[];
  matchPairs?: Array<{ left: string; right: string }>;
  columnA?: string[];
  columnB?: string[];
  solution?: string;
  structuredSolution?: StructuredSolution;
  stepByStepSolution?: string;
  explanation: string;
  mistakeExplanation?: string;
  correctMethod?: string;
  distractorRationale?: { option: string; errorType: string }[];
  misconceptionExploration?: string;
  validationStatus?: QuestionValidationRecord;
  timestampSeconds?: number;
  timestampFormatted?: string;
}

export interface ConceptKnowledgeItem {
  topic: string;
  subtopic: string;
  concept: string;
  definition?: string;
  principle?: string;
  formula?: string;
  variables?: { symbol: string; meaning: string; unit?: string }[];
  conditions?: string;
  relationships?: string[];
  applications?: string[];
  problem_solving_method?: string;
  examples?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  video_coverage: VideoCoverageLevel;
  importance?: 'essential' | 'high' | 'medium' | 'low';
  timestamp?: string;
  timestampSeconds?: number;
}

export interface ConceptCoverageEntry {
  concept: string;
  subtopic?: string;
  importance: 'essential' | 'high' | 'medium' | 'low';
  videoCoverage: VideoCoverageLevel;
  questionsAssigned: number;
  questionsAllocated?: number;
  testedArchetypes?: string[];
}

export interface QuizBlueprintItem {
  questionIndex: number;
  questionId?: string;
  topic?: string;
  subtopic: string;
  concept: string;
  questionCategory: QuestionCategory;
  numericalOrTheory: 'numerical' | 'theory';
  problemArchetype: string;
  archetypeId: string;
  procedureSignature: string;
  unknownType: string;
  requiredOperation: string;
  cognitiveTask: string;
  scenarioType: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cognitiveLevel: CognitiveLevel;
  videoCoverage?: VideoCoverageLevel;
  problemStyle?: string;
  solvingMethodDescription?: string;
  expectedFormula?: string;
}

export interface QuizDesignReportItem {
  questionId: string;
  concept: string;
  archetypeId: string;
  procedureSignature: string;
  unknownType: string;
  numericalOrTheory: 'numerical' | 'theory';
}

export interface ConceptKnowledgeMap {
  subject: string;
  academicLevel: string;
  chapter: string;
  mainTopic: string;
  subtopics: string[];
  videoCoveredConcepts: ConceptKnowledgeItem[];
  additionalChapterConcepts: string[];
  conceptCoverageMap?: ConceptCoverageEntry[];
  blueprint?: QuizBlueprintItem[];
  designReport?: QuizDesignReportItem[];
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
  id?: string;
  analysisSessionId?: string;
  generationAttemptId?: string;
  generationJobId?: string;
  isValidated?: boolean;
  videoId?: string;
  transcriptHash?: string;
  analysisVersion?: number | string;
  quizVersion?: number | string;
  title: string;
  subject?: string;
  academicLevel?: string;
  chapter?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language?: string;
  conceptMap?: ConceptMap;
  conceptKnowledgeMap?: ConceptKnowledgeMap;
  persistedKnowledgeMap?: any;
  quizBlueprint?: any;
  topicCoverageReport?: TopicCoverageReport;
  blueprint?: QuizBlueprintItem[];
  questions: QuizQuestion[];
  formatDistribution?: Record<QuestionFormat, number>;
  distribution?: {
    numericalAndProblemSolving: number;
    conceptualAndReasoning: number;
    easy: number;
    medium: number;
    hard: number;
  };
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
  transcript?: TranscriptSegment[];
  rawText?: string;
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

export interface QuestionResultItem {
  questionId: string;
  slotIndex: number;
  question: string;
  format: QuestionFormat;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  resultLocalized: string;
  solution: StructuredSolution;
  explanation: string;
  conceptTested: string;
  conceptId: string;
  timestampFormatted?: string;
  timestampSeconds?: number;
}

export interface QuizSubmissionResult {
  analysisSessionId?: string;
  videoId?: string;
  total: number;
  correct: number;
  incorrect: number;
  percentage: number;
  questionResults: QuestionResultItem[];
  conceptCoverageTable: Array<{
    conceptId: string;
    conceptName: string;
    questionsCount: number;
    correctCount: number;
    incorrectCount: number;
    percentage: number;
  }>;
  strongConcepts: Array<{ conceptId: string; conceptName: string; percentage: number }>;
  weakConcepts: Array<{ conceptId: string; conceptName: string; percentage: number }>;
  recommendedRevision: Array<{
    conceptId: string;
    conceptName: string;
    summary: string;
    timestampFormatted?: string;
    timestampSeconds?: number;
  }>;
}

export type GenerationJobStatus =
  | 'QUEUED'
  | 'FETCHING_VIDEO'
  | 'FETCHING_TRANSCRIPT'
  | 'ANALYZING_VIDEO'
  | 'EXTRACTING_CONCEPTS'
  | 'UNDERSTANDING_CONCEPTS'
  | 'BUILDING_CONCEPT_MAP'
  | 'BUILDING_COVERAGE_PLAN'
  | 'BUILDING_QUESTION_BLUEPRINT'
  | 'GENERATING_QUESTIONS'
  | 'VALIDATING_QUESTIONS'
  | 'REPAIRING_QUESTIONS'
  | 'FINAL_VALIDATION'
  | 'SAVING_QUIZ'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'STALLED';

export interface GenerationJob {
  generationJobId: string;
  analysisSessionId: string;
  generationAttemptId: string;
  videoId: string;
  sourceUrl: string;
  status: GenerationJobStatus;
  stage: string;
  stageDescription: string;
  progress: number;
  totalQuestionCount: number;
  validQuestionCount: number;
  invalidQuestionCount: number;
  repairAttemptsCount: number;
  conceptCount: number;
  allowedConceptCount: number;
  createdAt: number;
  updatedAt: number;
  error?: {
    code: string;
    stage: string;
    message: string;
    refId?: string;
    retryable: boolean;
  } | null;
  quiz?: QuizData | null;
  metadata?: any;
}

