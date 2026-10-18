import { GoogleGenAI } from '@google/genai';
import {
  BlueprintSlot,
  QuizData,
  QuizQuestion,
  TranscriptSegment
} from '../../types/index.js';
import { VideoIdentity } from '../../utils/videoIdentity.js';
import { PipelineLogger } from '../../utils/pipelineLogger.js';
import { S1_VideoAnalysis } from './S1_videoAnalysis.js';
import { S2_ConceptExtraction } from './S2_conceptExtraction.js';
import { S3_CoverageClassifier } from './S3_coverageClassifier.js';
import { S4_ConceptUnderstanding } from './S4_conceptUnderstanding.js';
import { S5_KnowledgeMap } from './S5_knowledgeMap.js';
import { S6_CoveragePlanner } from './S6_coveragePlanner.js';
import { S7_BlueprintGenerator } from './S7_blueprintGenerator.js';
import { S8_BlueprintValidator } from './S8_blueprintValidator.js';
import { S9_QuestionGenerator } from './S9_questionGenerator.js';
import { S10_QuestionValidator } from './S10_questionValidator.js';
import { S11_QualityGate } from './S11_qualityGate.js';
import { S12_TranslationService } from './S12_translationService.js';
import { QuizPersistenceService } from './quizPersistenceService.js';
import { StageCheckpointService } from './stageCheckpointService.js';
import { GenerationJobService } from '../generationJobService.js';

export interface GeneratePipelineQuizParams {
  videoId: string;
  videoUrl?: string;
  title: string;
  transcript: TranscriptSegment[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
  language?: string;
  apiKey?: string;
  skipCache?: boolean;
  analysisSessionId?: string;
  generationAttemptId?: string;
  generationJobId?: string;
  transcriptHash?: string;
}

export class QuizPipelineOrchestrator {
  private static getClient(userApiKey?: string): GoogleGenAI | null {
    const key = userApiKey || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '' || key.startsWith('your_') || key === 'PLACEHOLDER') {
      return null;
    }
    return new GoogleGenAI({ apiKey: key.trim() });
  }

  /**
   * Main entry point: Executes S1 through S13 end to end in the real application.
   */
  public static async executePipeline(params: GeneratePipelineQuizParams): Promise<QuizData> {
    const {
      videoId,
      videoUrl,
      title,
      transcript,
      difficulty = 'medium',
      count = 25,
      language = 'en',
      apiKey,
      skipCache = false,
      analysisSessionId,
      transcriptHash
    } = params;

    const canonicalVideoId = VideoIdentity.parseCanonicalVideoId(videoId || videoUrl || '') || videoId || 'video';
    const computedSessionId = analysisSessionId || VideoIdentity.createSessionId();
    const computedTranscriptHash = transcriptHash || VideoIdentity.computeTranscriptHash(transcript);

    const targetCount = [10, 15, 20, 25].includes(Number(count)) ? Number(count) : 25;
    const jobId = params.generationJobId;

    // Check Cache with strict session and hash isolation
    if (!skipCache) {
      const cached = QuizPersistenceService.getCachedQuiz({
        videoId: canonicalVideoId,
        language,
        count: targetCount,
        difficulty,
        transcriptHash: computedTranscriptHash
      });
      if (cached && cached.questions && cached.questions.length === targetCount && cached.difficulty === difficulty) {
        console.log(`[QuizPipeline] Serving cached validated quiz for ${canonicalVideoId} (${language}, ${targetCount} Qs, ${difficulty})`);
        const refreshedQuestions = cached.questions.map((q: any, idx: number) => ({
          ...q,
          slotIndex: q.slotIndex ?? idx,
          analysisSessionId: computedSessionId,
          generationAttemptId: params.generationAttemptId || 'att_1',
          generationJobId: jobId,
          videoId: canonicalVideoId
        }));
        const refreshedQuiz = {
          ...cached,
          analysisSessionId: computedSessionId,
          generationAttemptId: params.generationAttemptId || 'att_1',
          generationJobId: jobId,
          isValidated: true,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          questions: refreshedQuestions
        };

        if (jobId) {
          GenerationJobService.completeJob(jobId, refreshedQuiz);
        }

        return refreshedQuiz;
      }
    }

    let effectiveClient = this.getClient(apiKey);
    const generationAttemptId = params.generationAttemptId || 'att_1';

    const checkpointKey = StageCheckpointService.buildCheckpointKey({
      videoId: canonicalVideoId,
      analysisSessionId: computedSessionId,
      transcriptHash: computedTranscriptHash,
      language,
      difficulty,
      count: targetCount
    });

    console.log(`[QuizPipeline] ========================================================`);
    console.log(`[QuizPipeline] STARTING 13-STAGE CONCEPT-FIRST QUIZ ENGINE`);
    console.log(`[QuizPipeline] Video: "${title}" | Target Language: ${language} | Attempt: ${generationAttemptId}`);
    console.log(`[QuizPipeline] Checkpoint Key: ${checkpointKey}`);
    console.log(`[QuizPipeline] ========================================================`);

    try {
      // =========================================================================
      // STAGE 1: Video Analysis -> Structured Evidence
      // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'ANALYZING_VIDEO',
        stage: 'video_analysis',
        stageDescription: 'Analyzing video lecture and educational structure'
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'video_analysis', {
      title,
      segmentCount: transcript.length,
      characterCount: transcript.reduce((acc, t) => acc + (t.text?.length || 0), 0)
    });
    let evidence = !skipCache ? StageCheckpointService.getStage({ key: checkpointKey, stage: 'video_analysis' }) : null;
    if (evidence) {
      console.log(`[QuizPipeline] Checkpoint HIT: Stage 1 (video_analysis)`);
    } else {
      try {
        evidence = await S1_VideoAnalysis.analyzeVideo({
          title,
          videoId: canonicalVideoId,
          transcript,
          client: effectiveClient
        });
        StageCheckpointService.saveStage({
          key: checkpointKey,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          stage: 'video_analysis',
          data: evidence,
          language,
          difficulty,
          count: targetCount
        });
      } catch (err: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'video_analysis', err);
        throw err;
      }
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'video_analysis', {
      subject: evidence.subject,
      chapter: evidence.chapter,
      definitions: evidence.definitions?.length || 0,
      formulas: evidence.formulas?.length || 0
    });

    // =========================================================================
    // STAGE 2: Concept Extraction -> Hierarchy with IDs (C1, C2...)
    // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'EXTRACTING_CONCEPTS',
        stage: 'concept_extraction',
        stageDescription: 'Extracting taught curriculum concepts from transcript'
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'concept_extraction', { subject: evidence.subject });
    let conceptHierarchy = !skipCache ? StageCheckpointService.getStage({ key: checkpointKey, stage: 'concept_extraction' }) : null;
    if (conceptHierarchy) {
      console.log(`[QuizPipeline] Checkpoint HIT: Stage 2 (concept_extraction)`);
    } else {
      try {
        conceptHierarchy = await S2_ConceptExtraction.extractConcepts({
          evidence,
          transcript,
          client: effectiveClient
        });
        StageCheckpointService.saveStage({
          key: checkpointKey,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          stage: 'concept_extraction',
          data: conceptHierarchy,
          language,
          difficulty,
          count: targetCount
        });
      } catch (err: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'concept_extraction', err);
        throw err;
      }
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'concept_extraction', {
      conceptCount: conceptHierarchy.length,
      concepts: conceptHierarchy.map((c: any) => `${c.id}:${c.name}`)
    });

    // =========================================================================
    // STAGE 3: Coverage Classification -> FULLY / MOSTLY / PARTIALLY / MENTIONED / NOT_COVERED
    // =========================================================================
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'coverage_classification');
    let classifications = !skipCache ? StageCheckpointService.getStage({ key: checkpointKey, stage: 'coverage_classification' }) : null;
    if (classifications) {
      console.log(`[QuizPipeline] Checkpoint HIT: Stage 3 (coverage_classification)`);
    } else {
      try {
        classifications = S3_CoverageClassifier.classifyCoverage({
          concepts: conceptHierarchy,
          transcript,
          evidence
        });
        StageCheckpointService.saveStage({
          key: checkpointKey,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          stage: 'coverage_classification',
          data: classifications,
          language,
          difficulty,
          count: targetCount
        });
      } catch (err: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'coverage_classification', err);
        throw err;
      }
    }
    const allowedCount = Object.values(classifications).filter((c: any) => c.isAllowedForQuiz).length;
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'coverage_classification', {
      totalConcepts: Object.keys(classifications).length,
      allowedConcepts: allowedCount
    });

    // =========================================================================
    // STAGE 4: Concept Understanding -> Rich pedagogical understanding objects
    // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'UNDERSTANDING_CONCEPTS',
        stage: 'concept_understanding',
        stageDescription: 'Verifying concept evidence, definitions, and formulas'
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'concept_understanding');
    let understandings = !skipCache ? StageCheckpointService.getStage({ key: checkpointKey, stage: 'concept_understanding' }) : null;
    if (understandings) {
      console.log(`[QuizPipeline] Checkpoint HIT: Stage 4 (concept_understanding)`);
    } else {
      try {
        understandings = await S4_ConceptUnderstanding.buildConceptUnderstanding({
          concepts: conceptHierarchy,
          classifications,
          evidence,
          client: effectiveClient
        });
        StageCheckpointService.saveStage({
          key: checkpointKey,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          stage: 'concept_understanding',
          data: understandings,
          language,
          difficulty,
          count: targetCount
        });
      } catch (err: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'concept_understanding', err);
        throw err;
      }
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'concept_understanding', {
      understandingsCount: Object.keys(understandings).length
    });

    // =========================================================================
    // STAGE 5: Knowledge Map -> Persisted graph of concepts & relationships
    // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'BUILDING_CONCEPT_MAP',
        stage: 'knowledge_map',
        stageDescription: 'Constructing topic knowledge map & prerequisite graph'
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'knowledge_map');
    let knowledgeMap = !skipCache ? StageCheckpointService.getStage({ key: checkpointKey, stage: 'knowledge_map' }) : null;
    if (knowledgeMap) {
      console.log(`[QuizPipeline] Checkpoint HIT: Stage 5 (knowledge_map)`);
    } else {
      try {
        knowledgeMap = S5_KnowledgeMap.buildKnowledgeMap({
          evidence,
          concepts: conceptHierarchy,
          classifications,
          understandings
        });
        StageCheckpointService.saveStage({
          key: checkpointKey,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          stage: 'knowledge_map',
          data: knowledgeMap,
          language,
          difficulty,
          count: targetCount
        });
      } catch (err: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'knowledge_map', err);
        throw err;
      }
    }
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        conceptCount: Object.keys(knowledgeMap.concepts || {}).length,
        allowedConceptCount: knowledgeMap.allowedConceptIds.length
      });
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'knowledge_map', {
      allowedConceptIds: knowledgeMap.allowedConceptIds,
      untaughtCount: knowledgeMap.untaughtChapterConcepts.length
    });

    // =========================================================================
    // STAGE 6: Coverage Plan -> Dynamic question allocation by importance
    // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'BUILDING_COVERAGE_PLAN',
        stage: 'coverage_planning',
        stageDescription: 'Allocating questions across taught lecture concepts'
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'coverage_planning', { targetCount });
    let coveragePlan = !skipCache ? StageCheckpointService.getStage({ key: checkpointKey, stage: 'coverage_planning' }) : null;
    if (coveragePlan) {
      console.log(`[QuizPipeline] Checkpoint HIT: Stage 6 (coverage_planning)`);
    } else {
      try {
        coveragePlan = S6_CoveragePlanner.planCoverage(knowledgeMap, targetCount);
        StageCheckpointService.saveStage({
          key: checkpointKey,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          stage: 'coverage_planning',
          data: coveragePlan,
          language,
          difficulty,
          count: targetCount
        });
      } catch (err: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'coverage_planning', err);
        throw err;
      }
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'coverage_planning', {
      allocationsCount: coveragePlan.allocations.length
    });

    // =========================================================================
    // STAGE 7: Blueprint -> Formats, methods, procedures, cognitive levels
    // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'BUILDING_QUESTION_BLUEPRINT',
        stage: 'blueprint_planning',
        stageDescription: 'Designing 25-question blueprint across archetypes & formats'
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'blueprint_generation');
    let blueprint = !skipCache ? StageCheckpointService.getStage({ key: checkpointKey, stage: 'blueprint_generation' }) : null;
    if (blueprint) {
      console.log(`[QuizPipeline] Checkpoint HIT: Stage 7 (blueprint_generation)`);
    } else {
      try {
        blueprint = S7_BlueprintGenerator.generateBlueprint({
          coveragePlan,
          knowledgeMap,
          difficulty,
          targetCount,
          analysisSessionId: computedSessionId,
          videoId: canonicalVideoId
        });
        StageCheckpointService.saveStage({
          key: checkpointKey,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash,
          stage: 'blueprint_generation',
          data: blueprint,
          language,
          difficulty,
          count: targetCount
        });
      } catch (err: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'blueprint_generation', err);
        throw err;
      }
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'blueprint_generation', {
      slotCount: blueprint.slots.length,
      formatCounts: blueprint.formatCounts
    });

    // =========================================================================
    // STAGE 8: Blueprint Validation -> Pre-generation distribution & diversity check
    // =========================================================================
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'blueprint_validation');
    const blueprintValidation = S8_BlueprintValidator.validateBlueprint(
      blueprint,
      coveragePlan,
      knowledgeMap,
      targetCount
    );
    if (!blueprintValidation.valid) {
      const bpErr: any = new Error(`Quiz plan could not be balanced for this video. Please retry.`);
      bpErr.stage = 'blueprint_validation';
      bpErr.code = 'QUESTION_BLUEPRINT_INVALID';
      bpErr.retryable = true;
      bpErr.details = { errors: blueprintValidation.errors };
      PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'blueprint_validation', bpErr, bpErr.details);
      throw bpErr;
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'blueprint_validation', { valid: true });

    // =========================================================================
    // STAGE 9 & 10: Question Generation & In-Code Validation with Per-Slot Retries
    // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'GENERATING_QUESTIONS',
        stage: 'question_generation_and_validation',
        stageDescription: `Generating and validating exam questions (0/${targetCount})`,
        validQuestionCount: 0,
        totalQuestionCount: targetCount
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'question_generation_and_validation', {
      totalSlots: blueprint.slots.length,
      targetCount
    });

    const acceptedFromCheckpoints = !skipCache ? StageCheckpointService.getAcceptedQuestions(checkpointKey) : {};
    const validatedQuestions: QuizQuestion[] = [];
    const maxRetriesPerSlot = 3;
    const slotErrors: Record<number, string[]> = {};

    for (const slot of blueprint.slots) {
      // 0. Check if user cancelled or switched videos
      if (jobId && GenerationJobService.isCancelled(jobId)) {
        const cErr: any = new Error('Generation job was cancelled.');
        cErr.code = 'GENERATION_CANCELLED';
        cErr.stage = 'question_generation_and_validation';
        cErr.retryable = false;
        throw cErr;
      }

      // 1. Check if slot was already validated and saved in checkpoints (e.g. on Retry)
      const existingCandidate = acceptedFromCheckpoints[slot.slotIndex];
      if (existingCandidate && existingCandidate.question && existingCandidate.correctAnswer) {
        console.log(`[QuizPipeline] Checkpoint HIT: Slot #${slot.slotIndex} (Concept: ${existingCandidate.conceptId}) reused from checkpoint`);
        existingCandidate.analysisSessionId = computedSessionId;
        validatedQuestions.push(existingCandidate);

        if (jobId) {
          GenerationJobService.updateJob(jobId, {
            status: 'VALIDATING_QUESTIONS',
            stage: 'question_generation_and_validation',
            stageDescription: `Question ${validatedQuestions.length} of ${targetCount} verified`,
            validQuestionCount: validatedQuestions.length,
            totalQuestionCount: targetCount
          });
        }
        continue;
      }

      let attempts = 0;
      let slotAccepted = false;
      let currentSlot = { ...slot, analysisSessionId: computedSessionId, videoId: canonicalVideoId };
      let lastRejectionReason = '';

      while (attempts < maxRetriesPerSlot && !slotAccepted) {
        if (jobId && GenerationJobService.isCancelled(jobId)) {
          const cErr: any = new Error('Generation job was cancelled.');
          cErr.code = 'GENERATION_CANCELLED';
          cErr.stage = 'question_generation_and_validation';
          cErr.retryable = false;
          throw cErr;
        }

        attempts++;

        // On 3rd attempt, switch task family to break repetitive traps
        if (attempts === 3 && currentSlot.questionFormat === 'numerical') {
          const usedFamilies = new Set(validatedQuestions.map(q => q.taskFamily || q.methodId));
          const availableFamilies = [
            'INVERSE_FIND_UNKNOWN', 'RATIO_PROPORTION', 'PREDICT_CHANGE',
            'COMPARE_CASES', 'MULTI_STEP', 'REAL_WORLD_APPLICATION',
            'ERROR_ANALYSIS', 'BOUNDARY_LIMITING_CASE', 'CONSTRAINT_PROBLEM',
            'MULTI_CONCEPT_INTEGRATION', 'DIRECT_CALC'
          ].filter(f => !usedFamilies.has(f));

          if (availableFamilies.length > 0) {
            currentSlot.taskFamily = availableFamilies[0];
            currentSlot.methodId = availableFamilies[0];
            currentSlot.procedureSignature = `${currentSlot.procedureSignature}_alt_${availableFamilies[0].toLowerCase()}`;
          }
        }

        try {
          const acceptedQuestionsSummary = validatedQuestions.map(vq => ({
            conceptId: vq.conceptId || '',
            conceptName: vq.conceptName || '',
            taskFamily: vq.taskFamily || vq.methodId,
            unknownType: vq.unknownType,
            methodId: vq.methodId
          }));

          const candidate = await S9_QuestionGenerator.generateQuestionForSlot({
            slot: currentSlot,
            knowledgeMap,
            client: effectiveClient,
            rejectionReason: lastRejectionReason || undefined,
            acceptedQuestionsSummary,
            onQuotaExhausted: () => {
              effectiveClient = null;
            }
          });

          candidate.analysisSessionId = computedSessionId;
          const validationResult = await S10_QuestionValidator.validateQuestion({
            question: candidate,
            slot: currentSlot,
            knowledgeMap,
            earlierQuestions: validatedQuestions,
            client: effectiveClient
          });

          if (validationResult.valid) {
            candidate.validationStatus = {
              isValid: true,
              validatorType: validationResult.validatorType,
              passCount: attempts,
              recomputedAnswer: validationResult.recomputedAnswer,
              mathVerified: Boolean(validationResult.recomputedAnswer)
            };
            validatedQuestions.push(candidate);
            slotAccepted = true;

            // Save valid question to checkpoint
            StageCheckpointService.saveAcceptedQuestion({
              key: checkpointKey,
              videoId: canonicalVideoId,
              transcriptHash: computedTranscriptHash,
              slotIndex: slot.slotIndex,
              question: candidate
            });

            if (jobId) {
              GenerationJobService.updateJob(jobId, {
                status: 'VALIDATING_QUESTIONS',
                stage: 'question_generation_and_validation',
                stageDescription: `Question ${validatedQuestions.length} of ${targetCount} verified`,
                validQuestionCount: validatedQuestions.length,
                totalQuestionCount: targetCount
              });
            }

            console.log(
              `[DEV_DEBUG][ACCEPTED] Slot #${slot.slotIndex} | QID: ${candidate.id} | Concept: ${candidate.conceptId} | TF: ${candidate.taskFamily} | Sig: ${candidate.procedureSignature} | Verdict: ${candidate.relevanceVerdict || 'ACCEPT'} | Formula: ${candidate.formulaUsed || candidate.structuredSolution?.numerical?.relationship || 'N/A'}`
            );
          } else {
            lastRejectionReason = validationResult.reason || 'Validation check failed';
            if (!slotErrors[slot.slotIndex]) slotErrors[slot.slotIndex] = [];
            slotErrors[slot.slotIndex].push(`Attempt ${attempts}: ${lastRejectionReason}`);

            console.warn(
              `[DEV_DEBUG][REJECTED] Slot #${slot.slotIndex} (Concept: ${currentSlot.conceptId}) Attempt ${attempts} REJECTED | Reason: "${lastRejectionReason}" | Verdict: ${validationResult.validatorType}`
            );
          }
        } catch (genErr: any) {
          lastRejectionReason = genErr.message || 'Generation error';
          if (!slotErrors[slot.slotIndex]) slotErrors[slot.slotIndex] = [];
          slotErrors[slot.slotIndex].push(`Attempt ${attempts} error: ${lastRejectionReason}`);

          // Detect rate limit / quota exhaustion to bypass futile calls
          if (genErr?.status === 429 || lastRejectionReason.includes('RESOURCE_EXHAUSTED') || lastRejectionReason.includes('429')) {
            console.warn(`[QuizPipeline] Rate limit / quota exhausted detected. Switching to deterministic local engine.`);
            effectiveClient = null;
          }
        }
      }

      // Slot Salvaging: Never throw away the entire quiz if 1 or 2 slots struggle.
      // Reassign to an allowed concept that has verified evidence and adapt format if needed.
      if (!slotAccepted) {
        if (jobId) {
          GenerationJobService.updateJob(jobId, {
            status: 'REPAIRING_QUESTIONS',
            stage: 'repairing_questions',
            stageDescription: `Repairing and salvaging question slot #${slot.slotIndex}`,
            invalidQuestionCount: (slotErrors[slot.slotIndex]?.length || 1)
          });
        }
        console.log(`[QuizPipeline] Salvaging Slot #${slot.slotIndex} with grounded allowed concepts`);
        const allowedConcepts = (knowledgeMap.allowedConceptIds || [])
          .map((id: string) => knowledgeMap.concepts[id])
          .filter(Boolean);

        const candidateConcepts = [
          knowledgeMap.concepts[currentSlot.conceptId],
          ...allowedConcepts
        ].filter(Boolean);

        const familyCounts: Record<string, number> = {};
        for (const q of validatedQuestions) {
          const fam = (q.taskFamily || q.methodId || '').toUpperCase();
          familyCounts[fam] = (familyCounts[fam] || 0) + 1;
        }

        const candidateFamilies = [
          'INVERSE_FIND_UNKNOWN', 'RATIO_PROPORTION', 'PREDICT_CHANGE', 'COMPARE_CASES',
          'MULTI_STEP', 'BOUNDARY_LIMITING_CASE', 'ERROR_ANALYSIS', 'MULTI_CONCEPT_INTEGRATION',
          'REAL_WORLD_APPLICATION', 'DIRECT_CALC'
        ];

        // Try up to 3 candidate concepts for salvaging
        for (const targetConcept of candidateConcepts.slice(0, 3)) {
          if (slotAccepted) break;

          let salvagedFormat = currentSlot.questionFormat;
          if (salvagedFormat === 'numerical' && (!targetConcept.formula || targetConcept.formula.trim().length === 0)) {
            salvagedFormat = 'theoretical';
          }

          const validFamily = candidateFamilies.find(f => (familyCounts[f] || 0) < 3) || candidateFamilies[0];
          const salvagedSlot = {
            ...currentSlot,
            conceptId: targetConcept.conceptId || targetConcept.id,
            questionFormat: salvagedFormat,
            taskFamily: validFamily,
            methodId: validFamily,
            procedureSignature: `${salvagedFormat}_${(targetConcept.conceptId || targetConcept.id).toLowerCase()}_salvaged_s${slot.slotIndex}_${validFamily.toLowerCase()}`
          };

          const fallbackCandidate = S9_QuestionGenerator.generateLocally(
            salvagedSlot,
            targetConcept,
            knowledgeMap,
            validatedQuestions.map(vq => ({
              conceptId: vq.conceptId || '',
              conceptName: vq.conceptName || '',
              taskFamily: vq.taskFamily || vq.methodId,
              unknownType: vq.unknownType,
              methodId: vq.methodId
            }))
          );
          fallbackCandidate.analysisSessionId = computedSessionId;
          fallbackCandidate.videoId = canonicalVideoId;
          fallbackCandidate.slotIndex = slot.slotIndex;
          fallbackCandidate.conceptId = salvagedSlot.conceptId;
          fallbackCandidate.conceptName = targetConcept.conceptName;
          fallbackCandidate.taskFamily = salvagedSlot.taskFamily;
          fallbackCandidate.unknownType = salvagedSlot.unknownType;
          fallbackCandidate.methodId = salvagedSlot.methodId;
          fallbackCandidate.procedureSignature = salvagedSlot.procedureSignature;
          fallbackCandidate.evidenceRef = {
            conceptId: salvagedSlot.conceptId,
            sourceSegments: (targetConcept.evidence || []).map((e: any) => ({
              text: e.text,
              start: e.start,
              duration: e.duration,
              timestamp: e.timestamp
            })),
            sourceVideoId: canonicalVideoId
          };

          const valResult = await S10_QuestionValidator.validateQuestion({
            question: fallbackCandidate,
            slot: salvagedSlot,
            knowledgeMap,
            earlierQuestions: validatedQuestions,
            client: effectiveClient
          });

          if (valResult.valid) {
            fallbackCandidate.validationStatus = {
              isValid: true,
              validatorType: valResult.validatorType,
              passCount: 4,
              recomputedAnswer: valResult.recomputedAnswer,
              mathVerified: Boolean(valResult.recomputedAnswer)
            };
            validatedQuestions.push(fallbackCandidate);
            slotAccepted = true;

            StageCheckpointService.saveAcceptedQuestion({
              key: checkpointKey,
              videoId: canonicalVideoId,
              transcriptHash: computedTranscriptHash,
              slotIndex: slot.slotIndex,
              question: fallbackCandidate
            });

            if (jobId) {
              GenerationJobService.updateJob(jobId, {
                status: 'VALIDATING_QUESTIONS',
                stage: 'question_generation_and_validation',
                stageDescription: `Question ${validatedQuestions.length} of ${targetCount} verified`,
                validQuestionCount: validatedQuestions.length,
                totalQuestionCount: targetCount
              });
            }

            console.log(
              `[DEV_DEBUG][SALVAGED_ACCEPTED] Slot #${slot.slotIndex} | QID: ${fallbackCandidate.id} | Concept: ${fallbackCandidate.conceptId} | TF: ${fallbackCandidate.taskFamily} | Sig: ${fallbackCandidate.procedureSignature}`
            );
            break;
          } else {
            console.warn(`[DEV_DEBUG][SALVAGE_REJECT] Slot #${slot.slotIndex} candidate rejected:`, valResult.reason);
          }
        }
      }
    }

    if (validatedQuestions.length < targetCount) {
      const qvErr: any = new Error(`We couldn't build a high-quality quiz this time. Please try again.`);
      qvErr.code = 'QUESTION_VALIDATION_EXHAUSTED';
      qvErr.stage = 'question_generation_and_validation';
      qvErr.retryable = true;
      qvErr.details = { failedSlots: slotErrors, generated: validatedQuestions.length, required: targetCount };
      PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'question_generation_and_validation', qvErr, qvErr.details);
      throw qvErr;
    }

    // =========================================================================
    // POST-GENERATION CONCEPT COVERAGE VERIFICATION PASS
    // Requirement: Every covered concept MUST get at least one question.
    // List each concept and its question count; any concept with 0 gets a question.
    // =========================================================================
    const coverageDistribution: Record<string, { conceptName: string; count: number }> = {};
    for (const cid of knowledgeMap.allowedConceptIds) {
      const cName = knowledgeMap.concepts[cid]?.conceptName || cid;
      coverageDistribution[cid] = { conceptName: cName, count: 0 };
    }
    for (const q of validatedQuestions) {
      if (q.conceptId && coverageDistribution[q.conceptId]) {
        coverageDistribution[q.conceptId].count++;
      }
    }

    console.log(`\n[QuizPipeline] --- POST-GENERATION CONCEPT COVERAGE TABLE ---`);
    for (const [cid, info] of Object.entries(coverageDistribution)) {
      console.log(`  [Concept: ${cid}] "${info.conceptName}": ${info.count} questions`);
    }

    const uncoveredCids = Object.keys(coverageDistribution).filter(cid => coverageDistribution[cid].count === 0);
    if (uncoveredCids.length > 0 && validatedQuestions.length > uncoveredCids.length) {
      console.warn(`[QuizPipeline] Warning: ${uncoveredCids.length} covered concepts had 0 questions. Synthesizing questions for uncovered concepts...`);
      for (const uncId of uncoveredCids) {
        const targetConcept = knowledgeMap.concepts[uncId];
        if (!targetConcept) continue;

        // Find a question slot belonging to an overrepresented concept (> 2 questions)
        const overrepIdx = validatedQuestions.findIndex(q => (coverageDistribution[q.conceptId || '']?.count || 0) > 2);
        if (overrepIdx >= 0) {
          const oldCid = validatedQuestions[overrepIdx].conceptId || '';
          coverageDistribution[oldCid].count--;

          const replacementSlot: BlueprintSlot = {
            slotIndex: validatedQuestions[overrepIdx].slotIndex ?? (overrepIdx + 1),
            conceptId: uncId,
            subconcept: targetConcept.conceptName,
            questionFormat: targetConcept.formula ? 'numerical' : 'theoretical',
            taskFamily: 'DIRECT_CALC',
            methodId: 'DIRECT_CALC',
            procedureSignature: `coverage_${uncId.toLowerCase()}_direct`,
            expectedAnswerFormat: targetConcept.formula ? 'mcq_with_unit' : 'mcq_concept',
            unknownType: 'direct_understanding',
            cognitiveLevel: 'level_3_application',
            difficulty,
            analysisSessionId: computedSessionId,
            videoId: canonicalVideoId,
            videoCoverage: 'MOSTLY_COVERED'
          };

          const newQ = S9_QuestionGenerator.generateLocally(
            replacementSlot,
            targetConcept,
            knowledgeMap
          );
          newQ.analysisSessionId = computedSessionId;
          newQ.videoId = canonicalVideoId;
          newQ.slotIndex = validatedQuestions[overrepIdx].slotIndex;
          validatedQuestions[overrepIdx] = newQ;
          coverageDistribution[uncId].count = 1;
          console.log(`[QuizPipeline] Reassigned slot #${newQ.slotIndex} to uncovered concept ${uncId} ("${targetConcept.conceptName}")`);
        }
      }
    }

    // DEV DEBUGGING SUMMARY
    console.log(`\n[DEV_DEBUG_SUMMARY] ==========================================`);
    console.log(`[DEV_DEBUG_SUMMARY] Video ID:            ${canonicalVideoId}`);
    console.log(`[DEV_DEBUG_SUMMARY] Analysis Session ID: ${computedSessionId}`);
    console.log(`[DEV_DEBUG_SUMMARY] Generation Attempt:  ${generationAttemptId}`);
    console.log(`[DEV_DEBUG_SUMMARY] Allowed Concepts:   ${knowledgeMap.allowedConceptIds.length}`);
    console.log(`[DEV_DEBUG_SUMMARY] Questions Produced:  ${validatedQuestions.length}`);
    console.log(`[DEV_DEBUG_SUMMARY] Question Details:`);
    validatedQuestions.forEach((q, idx) => {
      console.log(
        `  #${idx + 1} | QID: ${q.id} | Concept: ${q.conceptId} (${q.conceptName}) | TF: ${q.taskFamily} | Sig: ${q.procedureSignature} | Verdict: ${q.relevanceVerdict || 'ACCEPT'} | Formula: ${q.formulaUsed || q.structuredSolution?.numerical?.relationship || 'N/A'}`
      );
    });
    console.log(`[DEV_DEBUG_SUMMARY] ==========================================\n`);

    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'question_generation_and_validation', {
      generatedCount: validatedQuestions.length
    });

    // =========================================================================
    // STAGE 11: Whole-Quiz Quality Gate
    // =========================================================================
    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'FINAL_VALIDATION',
        stage: 'quality_gate',
        stageDescription: 'Performing whole-quiz quality gate & coverage verification'
      });
    }
    PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'quality_gate');
    const qualityGateResult = S11_QualityGate.evaluateQuiz({
      questions: validatedQuestions,
      blueprint,
      knowledgeMap,
      targetCount,
      analysisSessionId: computedSessionId,
      videoId: canonicalVideoId
    });

    if (!qualityGateResult.passed) {
      const qgErr: any = new Error(`Quiz quality gate failed. Please retry.`);
      qgErr.stage = 'quality_gate';
      qgErr.code = 'QUIZ_VALIDATION_FAILED';
      qgErr.retryable = true;
      qgErr.details = { failures: qualityGateResult.failures };
      PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'quality_gate', qgErr, qgErr.details);
      throw qgErr;
    }
    PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'quality_gate', { passed: true });

    // Stamp exact identity envelope on every question produced
    const finalQuestions = validatedQuestions.map(q => ({
      ...q,
      analysisSessionId: computedSessionId,
      generationAttemptId,
      generationJobId: jobId,
      videoId: canonicalVideoId
    }));

    // Build base English quiz
    let finalQuiz: QuizData = {
      id: `quiz_${canonicalVideoId}_${Date.now()}`,
      videoId: canonicalVideoId,
      analysisSessionId: computedSessionId,
      generationAttemptId,
      generationJobId: jobId,
      isValidated: true,
      transcriptHash: computedTranscriptHash,
      analysisVersion: 2,
      quizVersion: 1,
      title: `${title} — Exam Mastery Quiz`,
      subject: evidence.subject,
      academicLevel: evidence.academicLevel,
      chapter: evidence.chapter,
      difficulty,
      language: 'en',
      pipelineEvidence: evidence,
      persistedKnowledgeMap: knowledgeMap,
      coveragePlan,
      quizBlueprint: blueprint,
      formatDistribution: blueprint.formatCounts,
      distribution: {
        numericalAndProblemSolving: blueprint.formatCounts.numerical,
        conceptualAndReasoning: blueprint.formatCounts.true_false + blueprint.formatCounts.fill_blank + blueprint.formatCounts.match_columns + blueprint.formatCounts.theoretical,
        easy: finalQuestions.filter(q => q.difficulty === 'easy').length,
        medium: finalQuestions.filter(q => q.difficulty === 'medium').length,
        hard: finalQuestions.filter(q => q.difficulty === 'hard').length
      },
      topicCoverageReport: {
        mainTopic: title,
        subjectCategory: evidence.subject.toLowerCase(),
        coveredConcepts: coveragePlan.allocations.map((a: any) => ({
          name: a.conceptName,
          importance: a.importance === 'essential' ? 'essential' : a.importance === 'high' ? 'important' : 'supporting',
          timestamp: '00:10',
          timestampSeconds: 10
        })),
        summaryText: `Exam quiz rigorously grounded in ${knowledgeMap.allowedConceptIds.length} verified lecture concepts with zero untaught intrusion.`
      },
      questions: finalQuestions
    };

    // =========================================================================
    // STAGE 12: Translation (ONLY after full validation in base language)
    // =========================================================================
    if (language.toLowerCase() !== 'en') {
      if (jobId) {
        GenerationJobService.updateJob(jobId, {
          status: 'SAVING_QUIZ',
          stage: 'translation',
          stageDescription: `Translating quiz into ${language}`
        });
      }
      PipelineLogger.startStage(computedSessionId, canonicalVideoId, 'translation', { targetLanguage: language });
      try {
        finalQuiz = await S12_TranslationService.translateQuiz({
          quiz: finalQuiz,
          targetLanguage: language,
          client: effectiveClient
        });
        PipelineLogger.endStage(computedSessionId, canonicalVideoId, 'translation', { targetLanguage: language });
      } catch (transErr: any) {
        PipelineLogger.failStage(computedSessionId, canonicalVideoId, 'translation', transErr);
        const tErr: any = new Error(`The AI service is busy or unavailable. Please try again shortly.`);
        tErr.stage = 'translation';
        tErr.code = 'AI_SERVICE_ERROR';
        tErr.retryable = true;
        throw tErr;
      }
    }

    if (jobId) {
      GenerationJobService.updateJob(jobId, {
        status: 'SAVING_QUIZ',
        stage: 'saving_quiz',
        stageDescription: 'Saving verified exam quiz to isolated storage'
      });
    }

    // Persist to cache
    QuizPersistenceService.cacheQuiz({
      videoId: canonicalVideoId,
      language,
      quiz: finalQuiz,
      count: targetCount,
      difficulty,
      transcriptHash: computedTranscriptHash
    });

    if (jobId) {
      GenerationJobService.completeJob(jobId, finalQuiz);
    }

    console.log(`[QuizPipeline] ========================================================`);
    console.log(`[QuizPipeline] PIPELINE COMPLETE: ${targetCount}-QUESTION VALIDATED QUIZ READY`);
    console.log(`[QuizPipeline] ========================================================`);
    return finalQuiz;
    } catch (err: any) {
      if (jobId) {
        const refId = PipelineLogger.getLastErrorRef(computedSessionId);
        GenerationJobService.failJob(jobId, {
          code: err.code || 'PIPELINE_ERROR',
          stage: err.stage || 'pipeline',
          message: err.message || 'An unexpected error occurred during quiz generation.',
          refId,
          retryable: err.retryable ?? true
        });
      }
      throw err;
    }
  }
}
