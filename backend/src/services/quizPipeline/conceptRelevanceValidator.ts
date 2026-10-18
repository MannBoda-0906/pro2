import { GoogleGenAI } from '@google/genai';
import {
  ConceptUnderstandingObject,
  PersistedKnowledgeMap,
  QuizQuestion
} from '../../types/index.js';

export interface RelevanceValidationResult {
  valid: boolean;
  verdict:
    | 'ACCEPT_CONCEPT_SPECIFIC'
    | 'REJECT_GENERIC_TEMPLATE'
    | 'REJECT_TITLE_DERIVED'
    | 'REJECT_SCORE_BELOW_THRESHOLD'
    | 'REJECT_FORMULA_MISMATCH'
    | 'REJECT_BLIND_CLASSIFICATION_MISMATCH'
    | 'REJECT_MISSING_TERMINOLOGY'
    | 'REJECT_EVIDENCE_MISSING'
    | 'REJECT_ARBITRARY_SUBSTITUTION';
  reason?: string;
  formulaUsed?: string;
  variablesUsed?: string[];
  bestMatchingConceptId?: string;
  score?: number;
}

export class ConceptRelevanceValidator {
  /**
   * Phase 1C: Concept-Question Relevance Validator
   * Computes relevance strictly from the SOLUTION and QUESTION content, not just claimed labels.
   */
  public static async validateQuestionAgainstConcept(params: {
    question: QuizQuestion;
    conceptObj: ConceptUnderstandingObject;
    knowledgeMap: PersistedKnowledgeMap;
    client?: GoogleGenAI | null;
  }): Promise<RelevanceValidationResult> {
    const { question, conceptObj, knowledgeMap, client } = params;

    const qText = (
      (question.question || '') + ' ' +
      (question.columnA?.join(' ') || '') + ' ' +
      (question.columnB?.join(' ') || '') + ' ' +
      (question.options?.join(' ') || '')
    ).toLowerCase();
    const solText = (
      (question.structuredSolution?.fullText || '') + ' ' +
      (question.solution || '') + ' ' +
      (question.explanation || '')
    ).toLowerCase();

    // =========================================================================
    // STEP 1: Derive formula/relationship and variables actually used in solution
    // =========================================================================
    const formulaUsed = this.extractFormulaFromSolution(question);
    const variablesUsed = this.extractVariables(question);
    question.formulaUsed = formulaUsed;

    // =========================================================================
    // STEP 2: Genericness Test (Reject arithmetic templates and arbitrary scaling)
    // =========================================================================
    const genericnessCheck = this.checkGenericness(qText, solText, formulaUsed, conceptObj);
    if (!genericnessCheck.valid) {
      question.relevanceVerdict = genericnessCheck.verdict;
      return genericnessCheck;
    }

    // =========================================================================
    // STEP 2B: Anti-Title Validation Check (Reject questions built from video title)
    // =========================================================================
    const antiTitleCheck = this.checkAntiTitle(question, conceptObj, knowledgeMap);
    if (!antiTitleCheck.valid) {
      question.relevanceVerdict = antiTitleCheck.verdict;
      return antiTitleCheck;
    }

    // =========================================================================
    // STEP 3: Evidence Traceability Check (Question -> Concept -> Video Evidence)
    // =========================================================================
    const evidenceCheck = this.checkEvidenceTraceability(question, conceptObj);
    if (!evidenceCheck.valid) {
      question.relevanceVerdict = evidenceCheck.verdict;
      return evidenceCheck;
    }

    // =========================================================================
    // STEP 4: Terminology & Quantity Check
    // =========================================================================
    const termCheck = this.checkTerminologyAndQuantities(qText, solText, conceptObj, question.questionFormat);
    if (!termCheck.valid) {
      question.relevanceVerdict = termCheck.verdict;
      return termCheck;
    }

    // =========================================================================
    // STEP 5: Formula / Principle Belonging Check
    // =========================================================================
    const formulaCheck = this.checkFormulaBelongsToConcept(formulaUsed, conceptObj, question.questionFormat);
    if (!formulaCheck.valid) {
      question.relevanceVerdict = formulaCheck.verdict;
      return formulaCheck;
    }

    // =========================================================================
    // STEP 6: Blind Classification (Independent Verifier)
    // =========================================================================
    const blindCheck = await this.performBlindClassification({
      question,
      claimedConcept: conceptObj,
      knowledgeMap,
      client
    });
    if (!blindCheck.valid) {
      question.relevanceVerdict = blindCheck.verdict;
      return blindCheck;
    }

    // Calculate internal relevance score from 0-100 (Requirement 12)
    let score = 100;
    if (!conceptObj.evidence || conceptObj.evidence.length === 0) {
      score -= 30;
    }
    const fullQText = `${qText} ${solText}`;
    for (const untaught of knowledgeMap.untaughtChapterConcepts || []) {
      if (untaught.length > 4 && fullQText.includes(untaught.toLowerCase())) {
        score -= 25;
        break;
      }
    }
    const conceptTokens = conceptObj.conceptName.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const hasConceptMention = conceptTokens.length === 0 || conceptTokens.some(t => fullQText.includes(t));
    if (!hasConceptMention) {
      score -= 15;
    }
    if (question.questionFormat === 'numerical' && conceptObj.formula) {
      if (!formulaUsed || formulaUsed === 'Conceptual Verification') {
        score -= 15;
      }
    }

    question.relevanceScore = Math.max(0, score);
    if (score < 85) {
      question.relevanceVerdict = 'REJECT_SCORE_BELOW_THRESHOLD';
      return {
        valid: false,
        verdict: 'REJECT_SCORE_BELOW_THRESHOLD',
        score,
        reason: `Relevance score ${score}/100 is below required threshold of 85`
      };
    }

    question.relevanceVerdict = 'ACCEPT_CONCEPT_SPECIFIC';
    return {
      valid: true,
      verdict: 'ACCEPT_CONCEPT_SPECIFIC',
      formulaUsed,
      variablesUsed,
      score,
      bestMatchingConceptId: conceptObj.conceptId
    };
  }

  /**
   * Extracts the mathematical formula or governing relationship used in the solution
   */
  private static extractFormulaFromSolution(q: QuizQuestion): string {
    const numSol = q.structuredSolution?.numerical;
    if (numSol?.relationship && numSol.relationship.trim().length > 0) {
      return numSol.relationship.trim();
    }
    if (numSol?.calculation && numSol.calculation.trim().length > 0) {
      return numSol.calculation.trim();
    }

    const solText = q.structuredSolution?.fullText || q.solution || q.explanation || '';
    const formulaMatch = solText.match(/(?:formula|relationship|law|governing equation|using)[:\s]+([^.\n;]+)/i);
    if (formulaMatch && formulaMatch[1]) {
      return formulaMatch[1].trim();
    }

    return numSol?.finalAnswer || 'Conceptual Verification';
  }

  /**
   * Extracts variable symbols and parameter names used in question & solution
   */
  private static extractVariables(q: QuizQuestion): string[] {
    const text = `${q.question} ${q.structuredSolution?.fullText || ''} ${q.solution || ''}`;
    const vars: string[] = [];
    const varMatches = text.match(/\b([A-Za-z](?:_[A-Za-z0-9]+)?)\s*=/g);
    if (varMatches) {
      varMatches.forEach(m => {
        const v = m.replace('=', '').trim();
        if (!vars.includes(v) && v.length <= 5) vars.push(v);
      });
    }
    return vars;
  }

  /**
   * Step 2: Strict Genericness Test
   * Disallows boilerplate templates: Q/Δt, A*k, X=Y/k, ratio partitions of abstract capacity,
   * difference of abstract implementations, arbitrary loads.
   */
  private static checkGenericness(
    qText: string,
    solText: string,
    formulaUsed: string,
    concept: ConceptUnderstandingObject
  ): RelevanceValidationResult {
    const fLower = formulaUsed.toLowerCase();
    const cNameLower = concept.conceptName.toLowerCase();

    // 1. Check for the infamous average rate template: Q = ... Δt = ... find R = Q/Δt
    const isRateTemplate =
      (qText.includes('total output of $q =') || qText.includes('total output of q =') || qText.includes('output of $q')) &&
      (qText.includes('\\delta t =') || qText.includes('delta t =') || qText.includes('duration of')) &&
      (fLower.includes('rate = output / time') || fLower.includes('r = q /') || qText.includes('average rate r = q'));

    if (isRateTemplate) {
      // Allowed ONLY if the concept itself is explicitly about rate of output (e.g. rate of reaction in chemistry)
      const isRateConcept = cNameLower.includes('rate') || cNameLower.includes('velocity') || cNameLower.includes('speed');
      if (!isRateConcept) {
        return {
          valid: false,
          verdict: 'REJECT_GENERIC_TEMPLATE',
          reason: `Rejected generic template: Question uses boilerplate average rate 'R = Q / Δt' for unrelated concept '${concept.conceptName}'.`,
          formulaUsed
        };
      }
    }

    // 2. Check for boilerplate generic scaling: variable A initialized to ... and scales by factor k ... Result = A * k
    const isScalingTemplate =
      (qText.includes('variable $a$ is initialized to') || qText.includes('variable a is initialized to')) &&
      (qText.includes('scales by a factor of') || qText.includes('scaling factor')) &&
      (fLower.includes('result = a * k') || fLower.includes('a * factor'));

    if (isScalingTemplate) {
      return {
        valid: false,
        verdict: 'REJECT_GENERIC_TEMPLATE',
        reason: `Rejected generic template: Question uses ungrounded scalar multiplication 'Result = A * k' with abstract placeholder variables for concept '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    // 3. Check for boilerplate inverse scaling: output magnitude Y = ... transformation factor k = ... X = Y / k
    const isInverseTemplate =
      qText.includes('output magnitude is observed to be $y =') &&
      qText.includes('transformation factor of $k =') &&
      fLower.includes('x = y / k');

    if (isInverseTemplate) {
      return {
        valid: false,
        verdict: 'REJECT_GENERIC_TEMPLATE',
        reason: `Rejected generic template: Question uses generic inverse scaling 'X = Y / k' with abstract parameters for concept '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    // 4. Check for boilerplate ratio partition: partition a total resource capacity of C = 40 units in ratio RA : RB
    const isRatioTemplate =
      qText.includes('partition a total resource capacity of') &&
      fLower.includes('part a = (r_a / (r_a + r_b)) * total');

    if (isRatioTemplate) {
      return {
        valid: false,
        verdict: 'REJECT_GENERIC_TEMPLATE',
        reason: `Rejected generic template: Question uses generic partition of abstract resource capacity for concept '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    // 5. Check for boilerplate sensitivity derivative: Delta Y = k * Delta X
    const isSensitivityTemplate =
      qText.includes('system sensitivity derivative is calibrated at') &&
      fLower.includes('delta y = k * delta x');

    if (isSensitivityTemplate) {
      return {
        valid: false,
        verdict: 'REJECT_GENERIC_TEMPLATE',
        reason: `Rejected generic template: Question uses abstract sensitivity derivative 'Delta Y = k * Delta X' for concept '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    // 6. Check for boilerplate comparison: Implementation A yields YA ... Implementation B yields YB ... Diff = YB - YA
    const isCompareTemplate =
      qText.includes('two contrasting implementations of') &&
      qText.includes('implementation a yields') &&
      fLower.includes('diff = y_b - y_a');

    if (isCompareTemplate) {
      return {
        valid: false,
        verdict: 'REJECT_GENERIC_TEMPLATE',
        reason: `Rejected generic template: Question tests plain subtraction between abstract 'Implementation A vs B' for concept '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    // 7. Check for boilerplate constraint load: equilibrium constraint requires load <= 50 units ... L2 = L_max - L1
    const isConstraintTemplate =
      qText.includes('equilibrium constraint requires that the total system load cannot exceed') &&
      fLower.includes('l2 = l_max - l1');

    if (isConstraintTemplate) {
      return {
        valid: false,
        verdict: 'REJECT_GENERIC_TEMPLATE',
        reason: `Rejected generic template: Question tests generic load subtraction 'L2 = L_max - L1' for concept '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    // 8. Check for generic fill-in-the-blank boilerplate: "In [subject], the foundational mechanism establishing the operational behavior of [concept] is known as ________."
    const isGenericFillBlank =
      qText.includes('foundational mechanism establishing the operational behavior of') &&
      qText.includes('is known as ________');

    if (isGenericFillBlank) {
      return {
        valid: false,
        verdict: 'REJECT_GENERIC_TEMPLATE',
        reason: `Rejected generic template: Fill-in-the-blank question uses trivial self-referential tautology for concept '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    // 9. Plain division check where neither the concept nor subject teaches simple division
    if (
      (fLower === 'x = y / k' || fLower === 'r = q / delta t' || fLower === 'result = a * k') &&
      !concept.formula
    ) {
      return {
        valid: false,
        verdict: 'REJECT_ARBITRARY_SUBSTITUTION',
        reason: `Rejected arbitrary arithmetic: Question is solvable by plain arithmetic substitution without testing concept principles of '${concept.conceptName}'.`,
        formulaUsed
      };
    }

    return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
  }

  /**
   * Anti-Title Check:
   * Reject any question whose main subject is just the title wording or a concept with no transcript evidence.
   * If a question's key terms come from the title but not from the concept's transcript evidence, reject it.
   */
  private static checkAntiTitle(
    q: QuizQuestion,
    concept: ConceptUnderstandingObject,
    knowledgeMap: PersistedKnowledgeMap
  ): RelevanceValidationResult {
    const rawTitle = (knowledgeMap.chapter || '').toLowerCase();
    const stopWords = new Set([
      'video', 'lecture', 'chapter', 'part', 'full', 'one', 'shot', 'class', 'grade',
      'course', 'hindi', 'english', 'gujarati', 'revision', 'complete', 'basics', 'introduction',
      'explained', 'about', 'with', 'from', 'what', 'which', 'their', 'there', 'these', 'those', 'lesson'
    ]);

    const titleTokens = rawTitle
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !stopWords.has(w));

    if (titleTokens.length === 0) {
      return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
    }

    const qTextLower = (q.question || '').toLowerCase();
    const evidenceText = (concept.evidence || []).map(e => e.text).join(' ').toLowerCase();
    const definitionText = (concept.definition || '').toLowerCase();

    // Check if question asks about the title
    if (qTextLower.includes('in the video titled') || qTextLower.includes('according to the title') || qTextLower.includes('as titled in')) {
      return {
        valid: false,
        verdict: 'REJECT_TITLE_DERIVED',
        reason: 'Question explicitly tests the video title phrasing rather than spoken educational content.'
      };
    }

    // Check if key distinctive terms in question match title tokens BUT are absent from concept evidence and definition
    const titleTokensInQuestion = titleTokens.filter(t => qTextLower.includes(t));
    if (titleTokensInQuestion.length > 0) {
      const unsupportedTitleTokens = titleTokensInQuestion.filter(
        t => !evidenceText.includes(t) && !definitionText.includes(t)
      );

      if (unsupportedTitleTokens.length > 0 && unsupportedTitleTokens.length === titleTokensInQuestion.length) {
        const conceptEvidenceWords = evidenceText
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 5 && !stopWords.has(w));
        const hasEvidenceWordInQ = conceptEvidenceWords.some(w => qTextLower.includes(w));

        if (!hasEvidenceWordInQ) {
          return {
            valid: false,
            verdict: 'REJECT_TITLE_DERIVED',
            reason: `Question relies on title wording [${unsupportedTitleTokens.join(', ')}] with zero presence in concept transcript evidence.`
          };
        }
      }
    }

    return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
  }

  /**
   * Step 3: Evidence Traceability Check
   */
  private static checkEvidenceTraceability(
    q: QuizQuestion,
    concept: ConceptUnderstandingObject
  ): RelevanceValidationResult {
    // 1. Concept must not be marked NOT_COVERED
    if (concept.videoCoverage === 'NOT_COVERED') {
      return {
        valid: false,
        verdict: 'REJECT_EVIDENCE_MISSING',
        reason: `Concept '${concept.conceptName}' is marked NOT_COVERED in the video lecture.`
      };
    }

    // 2. Question must have evidence reference or concept must have verified evidence
    const hasConceptEvidence = Array.isArray(concept.evidence) && concept.evidence.length > 0;
    const hasQuestionEvidenceRef = Boolean(q.evidenceRef && q.evidenceRef.conceptId === concept.conceptId);

    if (!hasConceptEvidence && !hasQuestionEvidenceRef) {
      return {
        valid: false,
        verdict: 'REJECT_EVIDENCE_MISSING',
        reason: `Traceability broken: Concept '${concept.conceptName}' lacks video evidence segments in current video.`
      };
    }

    return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
  }

  /**
   * Step 4: Terminology & Quantities Check
   * The question must use terms, variables, or entities belonging to the target concept.
   */
  private static checkTerminologyAndQuantities(
    qText: string,
    solText: string,
    concept: ConceptUnderstandingObject,
    format?: string
  ): RelevanceValidationResult {
    const combined = `${qText} ${solText}`;

    // Extract concept-specific keywords: name tokens, variable symbols, definition tokens
    const cTokens = concept.conceptName
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !['concept', 'theorem', 'theory', 'operational', 'system', 'particles'].includes(w));

    const varSymbols = (concept.variables || []).map(v => {
      const sym = typeof v === 'string' ? v : ((v as any)?.symbol || (v as any)?.name || (v as any)?.meaning || '');
      return sym.toLowerCase().replace(/[^a-z0-9]/g, '');
    });
    const formulaTokens = (concept.formula || '')
      .toLowerCase()
      .split(/[^a-z0-9_]/)
      .filter(w => w.length > 1);

    const hasNameMatch = cTokens.some(tok => combined.includes(tok));
    const hasVarMatch = varSymbols.some(s => s.length > 0 && combined.includes(s));
    const hasFormulaMatch = formulaTokens.some(ft => ft.length > 1 && combined.includes(ft));

    // Also check definition/principle key phrases (at least one 4+ letter domain keyword)
    const domainWords = (concept.principle || concept.definition || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 5 && !['fundamental', 'governing', 'scientific', 'behavior', 'correctness', 'operational'].includes(w));
    const hasDomainMatch = domainWords.some(dw => combined.includes(dw));

    if (!hasNameMatch && !hasVarMatch && !hasFormulaMatch && !hasDomainMatch) {
      return {
        valid: false,
        verdict: 'REJECT_MISSING_TERMINOLOGY',
        reason: `Question and solution lack domain terminology or verified variables from concept '${concept.conceptName}'.`
      };
    }

    return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
  }

  /**
   * Step 5: Check if formula used in solution actually belongs to the target concept
   */
  private static checkFormulaBelongsToConcept(
    formulaUsed: string,
    concept: ConceptUnderstandingObject,
    format?: string
  ): RelevanceValidationResult {
    if (format === 'true_false' || format === 'fill_blank' || format === 'match_columns' || format === 'theoretical') {
      return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
    }

    const fLower = formulaUsed.toLowerCase();

    // If concept has a specified formula, verify compatibility
    if (concept.formula && concept.formula.trim().length > 0) {
      const cFormulaLower = concept.formula.toLowerCase();

      // Normalize formulas by removing whitespace and LaTeX symbols
      const normF = fLower.replace(/\s+|\\text\{.*?\}|\$|\\cdot/g, '');
      const normCF = cFormulaLower.replace(/\s+|\\text\{.*?\}|\$|\\cdot/g, '');

      // Check if formula characters or core operator match
      const cTokens = normCF.split(/[^a-z0-9]/).filter(t => t.length > 0);
      const matchedTokens = cTokens.filter(tok => normF.includes(tok));

      // If solution formula has zero overlap with concept formula tokens and is generic rate/scaling, reject
      if (
        matchedTokens.length === 0 &&
        (fLower.includes('rate = output / time') || fLower.includes('result = a * k') || fLower.includes('diff = y_b - y_a'))
      ) {
        return {
          valid: false,
          verdict: 'REJECT_FORMULA_MISMATCH',
          reason: `Formula mismatch: Solution uses '${formulaUsed}', but concept '${concept.conceptName}' requires formula '${concept.formula}'.`,
          formulaUsed
        };
      }
    }

    return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
  }

  /**
   * Step 6: Blind Classification
   * Gives the verifier the question and solution + list of all concepts in the video,
   * without revealing the claimed concept label. Verifier determines which concept is tested.
   */
  private static async performBlindClassification(params: {
    question: QuizQuestion;
    claimedConcept: ConceptUnderstandingObject;
    knowledgeMap: PersistedKnowledgeMap;
    client?: GoogleGenAI | null;
  }): Promise<RelevanceValidationResult> {
    const { question, claimedConcept, knowledgeMap, client } = params;

    const allConcepts = Object.values(knowledgeMap.concepts);
    if (allConcepts.length <= 1) {
      return { valid: true, verdict: 'ACCEPT_CONCEPT_SPECIFIC' };
    }

    // If Gemini client is available, run independent blind classification call
    if (client) {
      try {
        const conceptCandidates = allConcepts.map(c => ({
          conceptId: c.conceptId,
          conceptName: c.conceptName,
          keyPrinciple: c.principle || c.definition
        }));

        const prompt = `You are an independent academic exam auditor.
Analyze the following exam Question and Solution. Determine which concept from the list it ACTUALLY tests.
CRITICAL: If the question is just generic arithmetic (e.g. Rate = Q / Δt, arbitrary scaling, ratio partition of generic capacity), set "isGenericArithmetic": true.

QUESTION:
"${question.question}"

OPTIONS:
${JSON.stringify(question.options)}

SOLUTION:
"${question.structuredSolution?.fullText || question.solution || question.explanation}"

CANDIDATE CONCEPTS:
${JSON.stringify(conceptCandidates, null, 2)}

Return ONLY a valid JSON object matching this schema:
{
  "bestMatchingConceptId": "C...",
  "confidence": 0.95,
  "isGenericArithmetic": false,
  "reason": "Brief explanation"
}`;

        const res = await client.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
          contents: prompt
        });

        const text = res.text || '';
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);

        if (parsed && typeof parsed.bestMatchingConceptId === 'string') {
          if (parsed.isGenericArithmetic) {
            return {
              valid: false,
              verdict: 'REJECT_GENERIC_TEMPLATE',
              reason: `Blind Auditor flagged question as generic arithmetic: ${parsed.reason}`,
              bestMatchingConceptId: parsed.bestMatchingConceptId
            };
          }

          if (parsed.bestMatchingConceptId !== claimedConcept.conceptId && parsed.confidence >= 0.7) {
            return {
              valid: false,
              verdict: 'REJECT_BLIND_CLASSIFICATION_MISMATCH',
              reason: `Blind classification mismatch: Verifier classified this question as testing '${parsed.bestMatchingConceptId}' rather than claimed '${claimedConcept.conceptId}' (${claimedConcept.conceptName}). Reason: ${parsed.reason}`,
              bestMatchingConceptId: parsed.bestMatchingConceptId
            };
          }
        }
      } catch (err: any) {
        console.warn('[ConceptRelevanceValidator] LLM blind classification warning:', err.message);
      }
    }

    // Deterministic semantic scoring across all concepts in the video
    const questionText = `${question.question} ${question.structuredSolution?.fullText || ''} ${question.solution || ''}`.toLowerCase();
    let bestScore = -1;
    let bestCid = claimedConcept.conceptId;
    let claimedScore = 0;

    for (const c of allConcepts) {
      let score = 0;
      const cWords = c.conceptName
        .toLowerCase()
        .replace(/['’]s\b/g, '')
        .split(/[^a-z0-9]+/)
        .filter(w => w.length > 3 && !['concept', 'theorem', 'theory', 'operational', 'system', 'particles'].includes(w));

      cWords.forEach(w => {
        if (questionText.includes(w)) score += 3;
      });

      if (c.formula) {
        const fTokens = c.formula.toLowerCase().split(/[^a-z0-9]/).filter(t => t.length > 1);
        fTokens.forEach(t => {
          if (questionText.includes(t)) score += 2;
        });
      }

      (c.variables || []).forEach(v => {
        const sym = typeof v === 'string' ? v : ((v as any)?.symbol || (v as any)?.name || (v as any)?.meaning || '');
        const cleanSym = sym.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanSym.length > 0 && questionText.includes(cleanSym)) score += 1;
      });

      if (c.conceptId === claimedConcept.conceptId) {
        claimedScore = score;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCid = c.conceptId;
      }
    }

    // If claimed concept has 0 score, and another concept has score >= 6, reject
    if (claimedScore === 0 && bestScore >= 6 && bestCid !== claimedConcept.conceptId) {
      return {
        valid: false,
        verdict: 'REJECT_BLIND_CLASSIFICATION_MISMATCH',
        reason: `Semantic classifier determined question strongly aligns with '${bestCid}' (score=${bestScore}) instead of claimed '${claimedConcept.conceptId}' (score=${claimedScore}).`,
        bestMatchingConceptId: bestCid,
        score: bestScore
      };
    }

    return {
      valid: true,
      verdict: 'ACCEPT_CONCEPT_SPECIFIC',
      bestMatchingConceptId: claimedConcept.conceptId,
      score: claimedScore
    };
  }
}
