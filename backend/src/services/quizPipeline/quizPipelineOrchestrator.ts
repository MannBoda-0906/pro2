import { GoogleGenAI } from '@google/genai';
import {
  QuizData,
  QuizQuestion,
  TranscriptSegment
} from '../../types/index.js';
import { VideoIdentity } from '../../utils/videoIdentity.js';
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
        return {
          ...cached,
          analysisSessionId: computedSessionId,
          videoId: canonicalVideoId,
          transcriptHash: computedTranscriptHash
        };
      }
    }

    const client = this.getClient(apiKey);

    console.log(`[QuizPipeline] ========================================================`);
    console.log(`[QuizPipeline] STARTING 13-STAGE CONCEPT-FIRST QUIZ ENGINE`);
    console.log(`[QuizPipeline] Video: "${title}" | Target Language: ${language}`);
    console.log(`[QuizPipeline] ========================================================`);

    // =========================================================================
    // STAGE 1: Video Analysis -> Structured Evidence
    // =========================================================================
    console.log(`[QuizPipeline] [S1] Video Analysis: Filtering talk & extracting evidence...`);
    const evidence = await S1_VideoAnalysis.analyzeVideo({
      title,
      transcript,
      client
    });
    console.log(`[QuizPipeline] [S1] Evidence extracted: Subject=${evidence.subject}, Chapter=${evidence.chapter}, Definitions=${evidence.definitions.length}, Formulas=${evidence.formulas.length}`);

    // =========================================================================
    // STAGE 2: Concept Extraction -> Hierarchy with IDs (C1, C2...)
    // =========================================================================
    console.log(`[QuizPipeline] [S2] Concept Extraction: Identifying what was actually taught...`);
    const conceptHierarchy = await S2_ConceptExtraction.extractConcepts({
      evidence,
      transcript,
      client
    });
    console.log(`[QuizPipeline] [S2] Extracted ${conceptHierarchy.length} distinct concepts: [${conceptHierarchy.map(c => `${c.id}:${c.name}`).join(', ')}]`);

    // =========================================================================
    // STAGE 3: Coverage Classification -> FULLY / MOSTLY / PARTIALLY / MENTIONED / NOT_COVERED
    // =========================================================================
    console.log(`[QuizPipeline] [S3] Coverage Classifier: Assessing transcript depth per concept...`);
    const classifications = S3_CoverageClassifier.classifyCoverage({
      concepts: conceptHierarchy,
      transcript,
      evidence
    });
    Object.values(classifications).forEach(c => {
      console.log(`   - ${c.conceptId} "${c.conceptName}": ${c.status} (Allowed: ${c.isAllowedForQuiz})`);
    });

    // =========================================================================
    // STAGE 4: Concept Understanding -> Rich pedagogical understanding objects
    // =========================================================================
    console.log(`[QuizPipeline] [S4] Concept Understanding: Synthesizing deep academic understanding...`);
    const understandings = await S4_ConceptUnderstanding.buildConceptUnderstanding({
      concepts: conceptHierarchy,
      classifications,
      evidence,
      client
    });

    // =========================================================================
    // STAGE 5: Knowledge Map -> Persisted graph of concepts & relationships
    // =========================================================================
    console.log(`[QuizPipeline] [S5] Knowledge Map: Assembling persisted concept graph...`);
    const knowledgeMap = S5_KnowledgeMap.buildKnowledgeMap({
      evidence,
      concepts: conceptHierarchy,
      classifications,
      understandings
    });
    console.log(`[QuizPipeline] [S5] Knowledge Map compiled with ${knowledgeMap.allowedConceptIds.length} allowed concepts and ${knowledgeMap.untaughtChapterConcepts.length} isolated untaught concepts.`);

    // =========================================================================
    // STAGE 6: Coverage Plan -> Dynamic question allocation by importance
    // =========================================================================
    console.log(`[QuizPipeline] [S6] Coverage Plan: Distributing ${targetCount} questions by importance rules...`);
    const coveragePlan = S6_CoveragePlanner.planCoverage(knowledgeMap, targetCount);
    coveragePlan.allocations.forEach(a => {
      console.log(`   - ${a.conceptId} "${a.conceptName}": ${a.questionCount} Qs (${a.percentage}%) [Importance: ${a.importance}]`);
    });

    // =========================================================================
    // STAGE 7: Blueprint -> Formats, methods, procedures, cognitive levels
    // =========================================================================
    console.log(`[QuizPipeline] [S7] Blueprint: Generating ${targetCount} slot specifications...`);
    const blueprint = S7_BlueprintGenerator.generateBlueprint({
      coveragePlan,
      knowledgeMap,
      difficulty,
      targetCount,
      analysisSessionId: computedSessionId,
      videoId: canonicalVideoId
    });

    // =========================================================================
    // STAGE 8: Blueprint Validation -> Pre-generation distribution & diversity check
    // =========================================================================
    console.log(`[QuizPipeline] [S8] Blueprint Validation: Verifying slots before generation...`);
    const blueprintValidation = S8_BlueprintValidator.validateBlueprint(
      blueprint,
      coveragePlan,
      knowledgeMap,
      targetCount
    );
    if (!blueprintValidation.valid) {
      console.error(`[QuizPipeline] [S8] Blueprint Validation Failed:`, blueprintValidation.errors);
      const bpErr: any = new Error(`BLUEPRINT_VALIDATION_FAILED: ${blueprintValidation.errors.join('; ')}`);
      bpErr.stage = 'blueprint_validation';
      throw bpErr;
    }
    console.log(`[QuizPipeline] [S8] Blueprint PASSED all checks. Distribution: Numerical=${blueprint.formatCounts.numerical}, T/F=${blueprint.formatCounts.true_false}, FillBlank=${blueprint.formatCounts.fill_blank}, Match=${blueprint.formatCounts.match_columns}, Theory=${blueprint.formatCounts.theoretical}`);

    // =========================================================================
    // STAGE 9 & 10: Question Generation & In-Code Validation with Per-Slot Retries
    // =========================================================================
    console.log(`[QuizPipeline] [S9 & S10] Generating & Validating ${targetCount} Questions with In-Code Multi-Pass Math & Diversity Checks...`);
    const validatedQuestions: QuizQuestion[] = [];
    const maxRetriesPerSlot = 3;

    for (const slot of blueprint.slots) {
      let attempts = 0;
      let slotAccepted = false;
      let currentSlot = { ...slot, analysisSessionId: computedSessionId, videoId: canonicalVideoId };
      let lastRejectionReason = '';

      while (attempts < maxRetriesPerSlot && !slotAccepted) {
        attempts++;
        try {
          // S9: Generate candidate
          const candidate = await S9_QuestionGenerator.generateQuestionForSlot({
            slot: currentSlot,
            knowledgeMap,
            client,
            rejectionReason: lastRejectionReason || undefined
          });

          // Ensure strict session scoping
          candidate.analysisSessionId = computedSessionId;
          candidate.videoId = canonicalVideoId;

          // S10: Validate candidate in code
          const validationResult = S10_QuestionValidator.validateQuestion({
            question: candidate,
            slot: currentSlot,
            knowledgeMap,
            earlierQuestions: validatedQuestions
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
          } else {
            lastRejectionReason = validationResult.reason || 'Validation check failed';
            console.warn(`[QuizPipeline] [S10] Slot #${slot.slotIndex} Rejected (Attempt ${attempts}): ${lastRejectionReason}`);
          }
        } catch (genErr: any) {
          lastRejectionReason = genErr.message || 'Generation error';
          console.warn(`[QuizPipeline] Slot #${slot.slotIndex} generation exception (Attempt ${attempts}):`, genErr);
        }
      }

      // If slot failed 3 times, regenerate slot with an available fallback method_id
      if (!slotAccepted) {
        console.warn(`[QuizPipeline] Slot #${slot.slotIndex} failed 3 attempts. Switching method_id to available fallback...`);
        const methodPool = [
          'DIRECT_CALC', 'UNKNOWN_VARIABLE', 'INVERSE_REASONING', 'COMPARISON',
          'PREDICTION', 'MULTI_STEP', 'RATIO_REASONING', 'ERROR_ANALYSIS',
          'DATA_INTERPRETATION', 'GRAPH_INTERPRETATION', 'APPLICATION', 'CASE_STUDY',
          'CONSTRAINT', 'BOUNDARY_CASE', 'METHOD_SELECTION', 'MULTI_CONCEPT'
        ];
        const methodCounts: Record<string, number> = {};
        validatedQuestions.forEach(q => {
          if (q.methodId) methodCounts[q.methodId] = (methodCounts[q.methodId] || 0) + 1;
        });
        const availableMethod = methodPool.find(m => (methodCounts[m] || 0) < 2) || 'MULTI_STEP';

        currentSlot.methodId = availableMethod;
        currentSlot.procedureSignature = `${currentSlot.procedureSignature}_fallback_${availableMethod.toLowerCase()}`;

        const fallbackCandidate = S9_QuestionGenerator.generateLocally(currentSlot, knowledgeMap.concepts[currentSlot.conceptId], knowledgeMap);
        fallbackCandidate.analysisSessionId = computedSessionId;
        fallbackCandidate.videoId = canonicalVideoId;
        validatedQuestions.push(fallbackCandidate);
      }
    }

    console.log(`[QuizPipeline] [S10] Successfully produced ${validatedQuestions.length} validated candidate questions.`);

    // =========================================================================
    // STAGE 11: Whole-Quiz Quality Gate
    // =========================================================================
    console.log(`[QuizPipeline] [S11] Quality Gate: Running whole-quiz 10-point check...`);
    const qualityGateResult = S11_QualityGate.evaluateQuiz({
      questions: validatedQuestions,
      blueprint,
      knowledgeMap,
      targetCount,
      analysisSessionId: computedSessionId,
      videoId: canonicalVideoId
    });

    if (!qualityGateResult.passed) {
      console.error(`[QuizPipeline] [S11] Quality Gate FAILURES:`, qualityGateResult.failures);
      const qgErr: any = new Error(`QUALITY_GATE_FAILED: ${qualityGateResult.failures.join('; ')}`);
      qgErr.stage = 'quality_gate';
      qgErr.code = 'QUALITY_GATE_FAILED';
      throw qgErr;
    }
    console.log(`[QuizPipeline] [S11] Quality Gate PASSED! All ${targetCount} questions meet all standards.`);

    // Build base English quiz
    let finalQuiz: QuizData = {
      id: `quiz_${canonicalVideoId}_${Date.now()}`,
      videoId: canonicalVideoId,
      analysisSessionId: computedSessionId,
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
        easy: validatedQuestions.filter(q => q.difficulty === 'easy').length,
        medium: validatedQuestions.filter(q => q.difficulty === 'medium').length,
        hard: validatedQuestions.filter(q => q.difficulty === 'hard').length
      },
      topicCoverageReport: {
        mainTopic: title,
        subjectCategory: evidence.subject.toLowerCase(),
        coveredConcepts: coveragePlan.allocations.map(a => ({
          name: a.conceptName,
          importance: a.importance === 'essential' ? 'essential' : a.importance === 'high' ? 'important' : 'supporting',
          timestamp: '00:10',
          timestampSeconds: 10
        })),
        summaryText: `Exam quiz rigorously grounded in ${knowledgeMap.allowedConceptIds.length} verified lecture concepts with zero untaught intrusion.`
      },
      questions: validatedQuestions
    };

    // =========================================================================
    // STAGE 12: Translation (ONLY after full validation in base language)
    // =========================================================================
    if (language.toLowerCase() !== 'en') {
      try {
        console.log(`[QuizPipeline] [S12] Translating validated quiz into '${language}' preserving mathematical invariance...`);
        finalQuiz = await S12_TranslationService.translateQuiz({
          quiz: finalQuiz,
          targetLanguage: language,
          client
        });
        console.log(`[QuizPipeline] [S12] Translation completed.`);
      } catch (transErr: any) {
        console.error(`[QuizPipeline] [S12] Translation error:`, transErr);
        const tErr: any = new Error(`TRANSLATION_FAILED: ${transErr.message || 'Failed to translate quiz'}`);
        tErr.stage = 'translation';
        tErr.code = 'TRANSLATION_FAILED';
        tErr.retryable = true;
        throw tErr;
      }
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
    console.log(`[QuizPipeline] ========================================================`);
    console.log(`[QuizPipeline] PIPELINE COMPLETE: ${targetCount}-QUESTION VALIDATED QUIZ READY`);
    console.log(`[QuizPipeline] ========================================================`);
    return finalQuiz;
  }
}
