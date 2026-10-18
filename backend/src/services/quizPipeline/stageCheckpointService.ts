import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuizQuestion } from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../../data');
const CHECKPOINTS_FILE = path.join(DATA_DIR, 'quiz_stage_checkpoints.json');

export type PipelineCheckpointStage =
  | 'video_analysis'
  | 'concept_extraction'
  | 'coverage_classification'
  | 'concept_understanding'
  | 'knowledge_map'
  | 'coverage_planning'
  | 'blueprint_generation'
  | 'accepted_questions';

export interface StageCheckpointData {
  videoId: string;
  transcriptHash: string;
  analysisVersion: string;
  language: string;
  difficulty: string;
  count: number;
  updatedAt: string;
  checkpoints: {
    video_analysis?: any;
    concept_extraction?: any;
    coverage_classification?: any;
    concept_understanding?: any;
    knowledge_map?: any;
    coverage_planning?: any;
    blueprint_generation?: any;
    accepted_questions?: Record<number, QuizQuestion>;
  };
}

export class StageCheckpointService {
  public static readonly ANALYSIS_VERSION = '2.0.0';
  public static readonly QUIZ_VERSION = 'v1';

  private static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CHECKPOINTS_FILE)) {
      fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
  }

  public static buildCheckpointKey(params: {
    videoId: string;
    transcriptHash: string;
    analysisSessionId?: string;
    language?: string;
    difficulty?: string;
    count?: number;
  }): string {
    const {
      videoId,
      transcriptHash,
      analysisSessionId,
      language = 'en',
      difficulty = 'medium',
      count = 25
    } = params;
    const sessionPart = analysisSessionId ? `:${analysisSessionId}` : '';
    return `${videoId}${sessionPart}:${transcriptHash}:${this.ANALYSIS_VERSION}:${language.toLowerCase()}:${difficulty.toLowerCase()}:${count}`;
  }

  public static saveStage<T = any>(params: {
    key: string;
    videoId: string;
    transcriptHash: string;
    stage: PipelineCheckpointStage;
    data: T;
    language?: string;
    difficulty?: string;
    count?: number;
  }): void {
    try {
      this.init();
      const raw = fs.readFileSync(CHECKPOINTS_FILE, 'utf-8');
      const store: Record<string, StageCheckpointData> = JSON.parse(raw);

      const existing: StageCheckpointData = store[params.key] || {
        videoId: params.videoId,
        transcriptHash: params.transcriptHash,
        analysisVersion: this.ANALYSIS_VERSION,
        language: (params.language || 'en').toLowerCase(),
        difficulty: (params.difficulty || 'medium').toLowerCase(),
        count: params.count || 25,
        updatedAt: new Date().toISOString(),
        checkpoints: {}
      };

      existing.checkpoints[params.stage] = params.data;
      existing.updatedAt = new Date().toISOString();
      store[params.key] = existing;

      fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
      console.log(`[StageCheckpointService] Saved stage '${params.stage}' checkpoint for key: ${params.key}`);
    } catch (err) {
      console.warn(`[StageCheckpointService] Failed to save checkpoint for ${params.stage}:`, err);
    }
  }

  public static getStage<T = any>(params: {
    key: string;
    stage: PipelineCheckpointStage;
  }): T | null {
    try {
      this.init();
      if (!fs.existsSync(CHECKPOINTS_FILE)) return null;
      const raw = fs.readFileSync(CHECKPOINTS_FILE, 'utf-8');
      const store: Record<string, StageCheckpointData> = JSON.parse(raw);
      const entry = store[params.key];
      if (!entry || !entry.checkpoints || !entry.checkpoints[params.stage]) {
        return null;
      }
      return entry.checkpoints[params.stage] as T;
    } catch {
      return null;
    }
  }

  public static saveAcceptedQuestion(params: {
    key: string;
    videoId: string;
    transcriptHash: string;
    slotIndex: number;
    question: QuizQuestion;
  }): void {
    try {
      this.init();
      const raw = fs.readFileSync(CHECKPOINTS_FILE, 'utf-8');
      const store: Record<string, StageCheckpointData> = JSON.parse(raw);

      const existing = store[params.key] || {
        videoId: params.videoId,
        transcriptHash: params.transcriptHash,
        analysisVersion: this.ANALYSIS_VERSION,
        language: 'en',
        difficulty: 'medium',
        count: 25,
        updatedAt: new Date().toISOString(),
        checkpoints: {}
      };

      if (!existing.checkpoints.accepted_questions) {
        existing.checkpoints.accepted_questions = {};
      }
      existing.checkpoints.accepted_questions[params.slotIndex] = params.question;
      existing.updatedAt = new Date().toISOString();
      store[params.key] = existing;

      fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[StageCheckpointService] Failed to save accepted question #${params.slotIndex}:`, err);
    }
  }

  public static getAcceptedQuestions(key: string): Record<number, QuizQuestion> {
    try {
      this.init();
      const raw = fs.readFileSync(CHECKPOINTS_FILE, 'utf-8');
      const store: Record<string, StageCheckpointData> = JSON.parse(raw);
      return store[key]?.checkpoints?.accepted_questions || {};
    } catch {
      return {};
    }
  }

  public static clearCheckpoints(key: string): void {
    try {
      this.init();
      const raw = fs.readFileSync(CHECKPOINTS_FILE, 'utf-8');
      const store: Record<string, StageCheckpointData> = JSON.parse(raw);
      if (store[key]) {
        delete store[key];
        fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
      }
    } catch (err) {
      console.warn(`[StageCheckpointService] Failed to clear checkpoints for ${key}:`, err);
    }
  }

  public static clearAll(): void {
    try {
      this.init();
      fs.writeFileSync(CHECKPOINTS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[StageCheckpointService] Failed to clear all checkpoints:', err);
    }
  }
}
