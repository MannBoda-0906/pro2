import {
  ConceptCoverageClassification,
  ConceptHierarchyItem,
  StructuredEvidence,
  TranscriptSegment
} from '../../types/index.js';

export class S3_CoverageClassifier {
  /**
   * Stage 3: Classifies coverage for every extracted concept.
   * Categories:
   * - FULLY_COVERED: Extensive discussion, formulas/laws, solving steps, multiple segments.
   * - MOSTLY_COVERED: Direct definition and standard applications taught.
   * - PARTIALLY_COVERED: Mentioned with some instructional detail; only allowed if evidence is substantial.
   * - MENTIONED_ONLY: Casual or one-off mention; excluded from main quiz.
   * - NOT_COVERED: Concept was not taught in this video; NEVER used in main quiz.
   */
  public static classifyCoverage(params: {
    concepts: ConceptHierarchyItem[];
    transcript: TranscriptSegment[];
    evidence: StructuredEvidence;
  }): Record<string, ConceptCoverageClassification> {
    const { concepts, transcript, evidence } = params;
    const classifications: Record<string, ConceptCoverageClassification> = {};

    concepts.forEach(concept => {
      // Find matching segments across transcript
      const keywords = this.extractConceptKeywords(concept.name, concept.subconcepts);
      const matchingSegments: Array<{ text: string; start: number; duration: number; timestamp: string }> = [];

      transcript.forEach(seg => {
        const textLower = seg.text.toLowerCase();
        const matches = keywords.some(k => textLower.includes(k.toLowerCase()));
        if (matches) {
          const min = Math.floor(seg.start / 60);
          const sec = Math.floor(seg.start % 60);
          matchingSegments.push({
            text: seg.text,
            start: seg.start,
            duration: seg.duration,
            timestamp: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
          });
        }
      });

      // Also check if formulas, laws, or definitions explicitly address this concept
      const hasFormulas = evidence.formulas.some(f =>
        keywords.some(k => f.name.toLowerCase().includes(k) || f.formula.toLowerCase().includes(k))
      );
      const hasLaws = evidence.laws.some(l =>
        keywords.some(k => l.name.toLowerCase().includes(k) || l.statement.toLowerCase().includes(k))
      );
      const hasDefs = evidence.definitions.some(d =>
        keywords.some(k => d.term.toLowerCase().includes(k) || d.definition.toLowerCase().includes(k))
      );

      let status: 'FULLY_COVERED' | 'MOSTLY_COVERED' | 'PARTIALLY_COVERED' | 'MENTIONED_ONLY' | 'NOT_COVERED' = 'NOT_COVERED';
      let isAllowedForQuiz = false;
      let exclusionReason: string | undefined;

      const segmentCount = matchingSegments.length;

      if ((segmentCount >= 3 && (hasFormulas || hasLaws)) || (segmentCount >= 4)) {
        status = 'FULLY_COVERED';
        isAllowedForQuiz = true;
      } else if (segmentCount >= 2 || (segmentCount >= 1 && (hasFormulas || hasDefs || hasLaws))) {
        status = 'MOSTLY_COVERED';
        isAllowedForQuiz = true;
      } else if (segmentCount === 1) {
        // Evaluate if segment has substantial instructional density (> 60 chars)
        const isDense = matchingSegments[0]?.text.length > 60;
        if (isDense) {
          status = 'PARTIALLY_COVERED';
          isAllowedForQuiz = true; // Allowed with sufficient evidence
        } else {
          status = 'MENTIONED_ONLY';
          isAllowedForQuiz = false;
          exclusionReason = 'Concept was only mentioned briefly without instructional depth.';
        }
      } else {
        // 0 matching segments
        status = 'NOT_COVERED';
        isAllowedForQuiz = false;
        exclusionReason = 'Concept was not taught in this video lecture.';
      }

      classifications[concept.id] = {
        conceptId: concept.id,
        conceptName: concept.name,
        status,
        evidence: matchingSegments,
        isAllowedForQuiz,
        exclusionReason
      };
    });

    return classifications;
  }

  private static extractConceptKeywords(name: string, subconcepts: string[]): string[] {
    const rawTokens = [
      name,
      ...subconcepts,
      ...name.split(/[\s,–—\-:]+/).filter(w => w.length > 3 && !/^(about|their|there|which|these|those|between|across|system|properties|principles|general)$/i.test(w))
    ];
    // Return unique keywords
    return Array.from(new Set(rawTokens.map(t => t.trim().toLowerCase()).filter(t => t.length > 2)));
  }
}
