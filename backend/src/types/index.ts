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
  studyNotes: string; // Markdown formatted
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

export interface StructuredEvidence {
  subject: string;
  academicLevel: string;
  chapter: string;
  topic: string;
  definitions: Array<{ term: string; definition: string; timestamp?: string; timestampSeconds?: number }>;
  laws: Array<{ name: string; statement: string }>;
  formulas: Array<{ name: string; formula: string; variables: string[]; conditions?: string }>;
  variables: Array<{ symbol: string; meaning: string; unit?: string }>;
  conditions: string[];
  examples: string[];
  solvingMethods: Array<{ methodId: string; description: string; steps: string[] }>;
  applications: string[];
  commonMistakes: string[];
}

export interface ConceptHierarchyItem {
  id: string; // C1, C2, C3...
  name: string;
  subconcepts: string[];
  chapter: string;
  orderIndex: number;
}

export interface ConceptCoverageClassification {
  conceptId: string;
  conceptName: string;
  status: 'FULLY_COVERED' | 'MOSTLY_COVERED' | 'PARTIALLY_COVERED' | 'MENTIONED_ONLY' | 'NOT_COVERED';
  evidence: Array<{ text: string; start?: number; duration?: number; timestamp?: string }>;
  isAllowedForQuiz: boolean;
  exclusionReason?: string;
}

export interface ConceptUnderstandingObject {
  conceptId: string;
  conceptName: string;
  meaning: string;
  definition: string;
  purpose: string;
  principle: string;
  formula?: string;
  variables?: Array<{ symbol: string; meaning: string; unit?: string }>;
  units?: string[];
  conditions?: string[];
  relationships?: Array<{ targetConceptId: string; type: string; explanation: string }>;
  causeAndEffect?: string[];
  applications: string[];
  examples: string[];
  commonMistakes: string[];
  misconceptions: string[];
  solvingMethods: string[];
  examRelevance: string;
  videoCoverage: 'FULLY_COVERED' | 'MOSTLY_COVERED' | 'PARTIALLY_COVERED' | 'MENTIONED_ONLY' | 'NOT_COVERED';
  testableTasks: {
    calculate?: string[];
    predict?: string[];
    compare?: string[];
    diagnose?: string[];
    apply?: string[];
  };
}

export interface PersistedKnowledgeMap {
  subject: string;
  academicLevel: string;
  chapter: string;
  topic: string;
  concepts: Record<string, ConceptUnderstandingObject>;
  conceptList: ConceptHierarchyItem[];
  coverageClassifications: Record<string, ConceptCoverageClassification>;
  allowedConceptIds: string[];
  untaughtChapterConcepts: string[];
  relationshipsGraph: Array<{ fromId: string; toId: string; type: string; description: string }>;
}

export interface CoverageAllocation {
  conceptId: string;
  conceptName: string;
  questionCount: number;
  percentage: number;
  importance: 'essential' | 'high' | 'medium' | 'low';
  coverageStatus: 'FULLY_COVERED' | 'MOSTLY_COVERED' | 'PARTIALLY_COVERED';
}

export interface QuizCoveragePlan {
  allocations: CoverageAllocation[];
  totalQuestions: number;
  mergedMinorConcepts?: Array<{ mergedInto: string; originalConcepts: string[] }>;
}

export interface BlueprintSlot {
  slotIndex: number; // 1 to 25
  analysisSessionId?: string;
  videoId?: string;
  conceptId: string;
  subconcept: string;
  questionFormat: QuestionFormat;
  methodId: string;
  procedureSignature: string;
  cognitiveLevel: CognitiveLevel;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswerFormat: string;
  videoCoverage: 'FULLY_COVERED' | 'MOSTLY_COVERED' | 'PARTIALLY_COVERED';
}

export interface QuizBlueprint {
  slots: BlueprintSlot[];
  formatCounts: Record<QuestionFormat, number>;
  numericalMethodCounts: Record<string, number>;
  validated: boolean;
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
  topicCoverageReport?: TopicCoverageReport;
  blueprint?: QuizBlueprintItem[];
  questions: QuizQuestion[];
  pipelineEvidence?: StructuredEvidence;
  persistedKnowledgeMap?: PersistedKnowledgeMap;
  coveragePlan?: QuizCoveragePlan;
  quizBlueprint?: QuizBlueprint;
  formatDistribution?: Record<QuestionFormat, number>;
  distribution?: {
    numericalAndProblemSolving: number;
    conceptualAndReasoning: number;
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface QuestionResultItem {
  questionId: string;
  slotIndex: number;
  question: string;
  format: QuestionFormat;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  resultLocalized: string; // 'TRUE' | 'FALSE' or localized
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
