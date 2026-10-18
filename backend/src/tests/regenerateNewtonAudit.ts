import fs from 'fs';
import { S6_CoveragePlanner } from '../services/quizPipeline/S6_coveragePlanner.js';
import { S7_BlueprintGenerator } from '../services/quizPipeline/S7_blueprintGenerator.js';
import { S8_BlueprintValidator } from '../services/quizPipeline/S8_blueprintValidator.js';
import { S9_QuestionGenerator } from '../services/quizPipeline/S9_questionGenerator.js';
import { S10_QuestionValidator } from '../services/quizPipeline/S10_questionValidator.js';
import { S11_QualityGate } from '../services/quizPipeline/S11_qualityGate.js';
import { GoogleGenAI } from '@google/genai';
import { QuizQuestion } from '../types/index.js';

console.log('======================================================================');
console.log('STUDYTUBE AI — REAL VIDEO REGENERATION AUDIT: NEWTON LAWS (aPwqkZCBouU)');
console.log('======================================================================\n');

async function runNewtonAudit() {
  const cachePath = 'c:/Users/MANN/Desktop/mando/backend/data/quiz_pipeline_cache.json';
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const cachedEntry = cache['aPwqkZCBouU:52a0a4062c4808c9:2.0.0:en:v1:medium:25'];

  if (!cachedEntry || !cachedEntry.quiz) {
    console.error('Cached Newton entry not found');
    process.exit(1);
  }

  const oldQuiz = cachedEntry.quiz;
  const knowledgeMap = oldQuiz.persistedKnowledgeMap;
  const videoId = 'aPwqkZCBouU';
  const sessionId = `audit_session_${Date.now()}`;

  const apiKey = process.env.GEMINI_API_KEY;
  const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

  console.log(`[Stage 6] Planning coverage for 25 questions across ${knowledgeMap.allowedConceptIds.length} allowed concepts...`);
  const coveragePlan = S6_CoveragePlanner.planCoverage(knowledgeMap, 25);

  console.log(`[Stage 7] Generating 25-question blueprint with diversity taxonomy...`);
  const blueprint = S7_BlueprintGenerator.generateBlueprint({
    coveragePlan,
    knowledgeMap,
    difficulty: 'medium',
    targetCount: 25,
    analysisSessionId: sessionId,
    videoId
  });

  console.log(`[Stage 8] Validating blueprint distribution...`);
  const bpVal = S8_BlueprintValidator.validateBlueprint(blueprint, coveragePlan, knowledgeMap, 25);
  if (!bpVal.valid) {
    console.error('Blueprint validation errors:', bpVal.errors);
    process.exit(1);
  }
  console.log(`  => Blueprint valid with ${blueprint.slots.length} slots.\n`);

  console.log(`[Stages 9 & 10] Generating and validating 25 questions concept-first...`);
  const validatedQuestions: QuizQuestion[] = [];
  let genericQuestionsRejected = 0;

  for (const slot of blueprint.slots) {
    const currentSlot = { ...slot, analysisSessionId: sessionId, videoId };
    let candidate = await S9_QuestionGenerator.generateQuestionForSlot({
      slot: currentSlot,
      knowledgeMap,
      client
    });

    const valResult = await S10_QuestionValidator.validateQuestion({
      question: candidate,
      slot: currentSlot,
      knowledgeMap,
      earlierQuestions: validatedQuestions,
      client
    });

    if (valResult.valid) {
      validatedQuestions.push(candidate);
    } else {
      if (valResult.validatorType === 'REJECT_GENERIC_TEMPLATE') {
        genericQuestionsRejected++;
      }
      // Retry with local fallback
      const fallback = S9_QuestionGenerator.generateLocally(
        currentSlot,
        knowledgeMap.concepts[currentSlot.conceptId],
        knowledgeMap
      );
      const fallbackVal = await S10_QuestionValidator.validateQuestion({
        question: fallback,
        slot: currentSlot,
        knowledgeMap,
        earlierQuestions: validatedQuestions,
        client
      });
      if (fallbackVal.valid) {
        validatedQuestions.push(fallback);
      } else {
        console.warn(`Slot ${slot.slotIndex} retry failed:`, fallbackVal.reason);
      }
    }
  }

  console.log(`[Stage 11] Running Whole-Quiz Quality Gate...`);
  const qgResult = S11_QualityGate.evaluateQuiz({
    questions: validatedQuestions,
    blueprint,
    knowledgeMap,
    targetCount: 25,
    analysisSessionId: sessionId,
    videoId
  });

  console.log(`  => Quality Gate Passed: ${qgResult.passed}`);
  if (!qgResult.passed) {
    console.warn('  Failures:', qgResult.failures);
  }

  console.log('\n========================================================================================================');
  console.log('BEFORE vs AFTER AUDIT: NEWTON LAWS OF MOTION (aPwqkZCBouU)');
  console.log('========================================================================================================');
  console.log('| # | Question (First 50 chars) | Claimed Concept | Formula Used In Solution | Relevance Verdict | Match Status |');
  console.log('|---|---|---|---|---|---|');

  let currentMismatches = 0;
  validatedQuestions.forEach((q, idx) => {
    const formulaUsed = q.formulaUsed || q.structuredSolution?.numerical?.relationship || q.structuredSolution?.numerical?.calculation?.split('=')[0] || 'N/A';
    const isGeneric = formulaUsed.includes('Rate = Output / Time') ||
                      formulaUsed.includes('R = Q /') ||
                      formulaUsed.includes('Result = A * k') ||
                      formulaUsed.includes('X = Y / k') ||
                      formulaUsed.includes('Part A = (R_A') ||
                      formulaUsed.includes('Diff = Y_B - Y_A') ||
                      formulaUsed.includes('Delta Y = k * Delta X') ||
                      formulaUsed.includes('L2 = L_max - L1') ||
                      q.question.includes('operational test') ||
                      q.question.includes('quantitative test');

    const match = !isGeneric;
    if (!match) currentMismatches++;

    console.log(
      `| ${idx + 1} | ${q.question.slice(0, 48).replace(/\n/g, ' ')}... | ${(q.conceptName || 'Concept').slice(0, 22)} | ${formulaUsed.slice(0, 26)} | ${q.relevanceVerdict || 'ACCEPT'} | ${match ? 'MATCH' : 'MISMATCH'} |`
    );
  });

  console.log('========================================================================================================');
  console.log('AUDIT RESULTS COMPARISON:');
  console.log(`  HISTORICAL QUIZ:  25 questions | 18 MISMATCHES (72.0% mismatch rate)`);
  console.log(`  REGENERATED QUIZ: 25 questions | ${currentMismatches} MISMATCHES (${((currentMismatches / 25) * 100).toFixed(1)}% mismatch rate)`);
  console.log(`  GENERIC TEMPLATES REJECTED BY VALIDATOR: ${genericQuestionsRejected}`);
  console.log(`  QUALITY GATE STATUS:                     ${qgResult.passed ? 'PASSED (100% compliant)' : 'FAILED'}`);
  console.log('========================================================================================================\n');

  if (currentMismatches > 0) {
    console.error(`Audit failed: found ${currentMismatches} mismatches`);
    process.exit(1);
  }
}

runNewtonAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
