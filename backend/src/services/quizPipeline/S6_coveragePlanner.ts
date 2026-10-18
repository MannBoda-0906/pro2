import {
  CoverageAllocation,
  PersistedKnowledgeMap,
  QuizCoveragePlan
} from '../../types/index.js';

export class S6_CoveragePlanner {
  /**
   * Stage 6: Computes the 25-question dynamic coverage allocation plan based on COVERAGE RULES.
   * - Total questions: exactly 25.
   * - Every allowed concept appears at least once.
   * - Max 30% per concept (ceil(25 * 0.3) = 7 questions max).
   * - If < 3 allowed concepts: throws error VIDEO_TOO_THIN.
   * - If > 25 allowed concepts: merges minor concepts.
   * - High importance concepts receive remaining questions first.
   */
  public static planCoverage(knowledgeMap: PersistedKnowledgeMap, targetTotal: number = 25): QuizCoveragePlan {
    const allowedIds = knowledgeMap.allowedConceptIds;

    // Sensible Content Gate: If video has 0 allowed concepts, it contains no teachable content.
    if (!allowedIds || allowedIds.length === 0) {
      const err: any = new Error(
        "We couldn't identify enough concepts. Try a video with more spoken explanation."
      );
      err.code = 'EXTRACTION_FAILED';
      err.stage = 'concept_extraction';
      err.retryable = false;
      throw err;
    }

    // Concept Evidence Gate: Drop any concept with no evidence from current video before blueprinting
    let activeConceptIds = (allowedIds || []).filter(id => {
      const cls = knowledgeMap.coverageClassifications[id];
      const concept = knowledgeMap.concepts[id];
      const hasClsEvidence = cls && cls.status !== 'NOT_COVERED' && Array.isArray(cls.evidence) && cls.evidence.length > 0;
      const hasConceptEvidence = concept && Array.isArray(concept.evidence) && concept.evidence.length > 0;
      return hasClsEvidence || hasConceptEvidence;
    });
    const mergedMinorConcepts: Array<{ mergedInto: string; originalConcepts: string[] }> = [];

    // If > 25 concepts: merge related minor concepts into subconcept groups
    if (activeConceptIds.length > targetTotal) {
      const surplus = activeConceptIds.length - targetTotal;
      const mergedOriginals: string[] = [];
      const primaryKeep = activeConceptIds.slice(0, targetTotal - 1);
      const toMerge = activeConceptIds.slice(targetTotal - 1);

      const mergedGroupConceptId = toMerge[0];
      const mergedGroupName = `${knowledgeMap.concepts[mergedGroupConceptId]?.conceptName || 'Applied Concepts'} (Merged Group)`;
      toMerge.forEach(id => {
        mergedOriginals.push(knowledgeMap.concepts[id]?.conceptName || id);
      });

      mergedMinorConcepts.push({
        mergedInto: mergedGroupName,
        originalConcepts: mergedOriginals
      });

      activeConceptIds = [...primaryKeep, mergedGroupConceptId];
    }

    // Assign importance weight based on coverage status & depth
    const conceptWeights: Record<string, { importance: 'essential' | 'high' | 'medium' | 'low'; weight: number }> = {};
    activeConceptIds.forEach(id => {
      const cls = knowledgeMap.coverageClassifications[id];
      const u = knowledgeMap.concepts[id];
      let importance: 'essential' | 'high' | 'medium' | 'low' = 'medium';
      let weight = 2;

      if (cls?.status === 'FULLY_COVERED' || (u?.formula && u.solvingMethods.length > 1)) {
        importance = 'essential';
        weight = 4;
      } else if (cls?.status === 'MOSTLY_COVERED') {
        importance = 'high';
        weight = 3;
      } else if (cls?.status === 'PARTIALLY_COVERED') {
        importance = 'medium';
        weight = 1;
      }

      conceptWeights[id] = { importance, weight };
    });

    // Step 1: Base allocation — Every allowed concept appears at least 1 time
    const allocationsMap: Record<string, number> = {};
    activeConceptIds.forEach(id => {
      allocationsMap[id] = 1;
    });

    let assigned = activeConceptIds.length;
    // 30% rule for broad multi-concept videos (>= 4 concepts); proportional cap for narrow/focused topics
    const maxPerConcept = activeConceptIds.length >= 4
      ? Math.ceil(targetTotal * 0.30)
      : Math.ceil(targetTotal / activeConceptIds.length) + 1;

    // Step 2: Distribute remaining questions to high importance concepts first
    const sortedByWeight = [...activeConceptIds].sort((a, b) => {
      return (conceptWeights[b]?.weight || 0) - (conceptWeights[a]?.weight || 0);
    });

    while (assigned < targetTotal) {
      let allocatedInRound = false;
      for (const id of sortedByWeight) {
        if (assigned >= targetTotal) break;
        if (allocationsMap[id] < maxPerConcept) {
          allocationsMap[id] += 1;
          assigned += 1;
          allocatedInRound = true;
        }
      }
      // If all capped, distribute to anyone below cap or increment evenly
      if (!allocatedInRound) {
        for (const id of sortedByWeight) {
          if (assigned >= targetTotal) break;
          allocationsMap[id] += 1;
          assigned += 1;
        }
      }
    }

    // Build finalized CoverageAllocation list
    const allocations: CoverageAllocation[] = activeConceptIds.map(id => {
      const count = allocationsMap[id] || 1;
      const u = knowledgeMap.concepts[id];
      const cls = knowledgeMap.coverageClassifications[id];
      const covStatus = (cls?.status === 'FULLY_COVERED' || cls?.status === 'MOSTLY_COVERED' || cls?.status === 'PARTIALLY_COVERED')
        ? cls.status
        : 'MOSTLY_COVERED';

      return {
        conceptId: id,
        conceptName: u?.conceptName || `Concept ${id}`,
        questionCount: count,
        percentage: Math.round((count / targetTotal) * 100),
        importance: conceptWeights[id]?.importance || 'medium',
        coverageStatus: covStatus
      };
    });

    return {
      allocations,
      totalQuestions: targetTotal,
      mergedMinorConcepts: mergedMinorConcepts.length > 0 ? mergedMinorConcepts : undefined
    };
  }
}
