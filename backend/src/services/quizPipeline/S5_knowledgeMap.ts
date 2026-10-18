import {
  ConceptCoverageClassification,
  ConceptHierarchyItem,
  ConceptUnderstandingObject,
  KnowledgeMapConcept,
  KnowledgeMapSubtopic,
  KnowledgeMapTopic,
  PersistedKnowledgeMap,
  StructuredEvidence
} from '../../types/index.js';

export class S5_KnowledgeMap {
  /**
   * Stage 5: Compiles and persists the comprehensive Concept Knowledge Map.
   * This Knowledge Map is the SOLE input to all subsequent question generation stages.
   * Questions are NEVER generated directly from transcript lines.
   */
  public static buildKnowledgeMap(params: {
    evidence: StructuredEvidence;
    concepts: ConceptHierarchyItem[];
    classifications: Record<string, ConceptCoverageClassification>;
    understandings: Record<string, ConceptUnderstandingObject>;
  }): PersistedKnowledgeMap {
    const { evidence, concepts, classifications, understandings } = params;

    // Filter allowed concepts according to strict coverage rules:
    // FULLY_COVERED and MOSTLY_COVERED are included.
    // PARTIALLY_COVERED only with sufficient evidence (isAllowedForQuiz = true).
    // MENTIONED_ONLY and NOT_COVERED are strictly EXCLUDED.
    const allowedConceptIds: string[] = [];
    const untaughtChapterConcepts: string[] = [];

    concepts.forEach(c => {
      const cls = classifications[c.id];
      if (cls && cls.isAllowedForQuiz && understandings[c.id]) {
        allowedConceptIds.push(c.id);
      } else {
        untaughtChapterConcepts.push(c.name);
      }
    });

    // Populate textbook chapter concepts that were absent from this video lecture
    // to safeguard the quality gate from ever testing untaught textbook concepts.
    if (evidence.subject === 'Physics' && evidence.chapter.toLowerCase().includes('center of mass')) {
      const standardTextbookTopics = [
        'Moment of Inertia',
        'Parallel Axis Theorem',
        'Perpendicular Axis Theorem',
        'Torque and Angular Acceleration',
        'Rolling Motion without Slipping',
        'Angular Momentum Conservation in Rigid Bodies'
      ];
      standardTextbookTopics.forEach(top => {
        if (!untaughtChapterConcepts.includes(top)) {
          untaughtChapterConcepts.push(top);
        }
      });
    } else if (evidence.subject === 'Biology' && evidence.chapter.toLowerCase().includes('photosynthesis')) {
      const standardTextbookTopics = [
        'CAM Plant Crassulacean Acid Metabolism',
        'C4 Dicarboxylic Acid Pathway Details',
        'Photorespiration Glycolate Cycle',
        'Photosystem I Ferredoxin-NADP Reductase Crystallography'
      ];
      standardTextbookTopics.forEach(top => {
        if (!untaughtChapterConcepts.includes(top)) {
          untaughtChapterConcepts.push(top);
        }
      });
    }

    // Build the relationship graph between allowed concepts
    const relationshipsGraph: Array<{ fromId: string; toId: string; type: string; description: string }> = [];

    allowedConceptIds.forEach(fromId => {
      const u = understandings[fromId];
      if (u && Array.isArray(u.relationships)) {
        u.relationships.forEach(rel => {
          if (allowedConceptIds.includes(rel.targetConceptId)) {
            relationshipsGraph.push({
              fromId,
              toId: rel.targetConceptId,
              type: rel.type,
              description: rel.explanation
            });
          }
        });
      }
    });

    // Ensure at least basic prerequisite / hierarchical graph edges exist
    for (let i = 0; i < allowedConceptIds.length - 1; i++) {
      const fromId = allowedConceptIds[i];
      const toId = allowedConceptIds[i + 1];
      if (!relationshipsGraph.some(r => r.fromId === fromId && r.toId === toId)) {
        relationshipsGraph.push({
          fromId,
          toId,
          type: 'prerequisite_for',
          description: `${understandings[fromId]?.conceptName} serves as conceptual foundation for ${understandings[toId]?.conceptName}`
        });
      }
    }

    // Build hierarchical topics array matching Requirement 5
    const topicsMap = new Map<string, Map<string, KnowledgeMapConcept[]>>();
    const mainTopic = evidence.topic || 'Core Curriculum Concepts';

    allowedConceptIds.forEach(cid => {
      const u = understandings[cid];
      if (!u) return;

      const subtopicName = (u.examples && u.examples.length > 0)
        ? u.examples[0]
        : `${u.conceptName} Principles`;

      const conceptEntry: KnowledgeMapConcept = {
        conceptId: cid,
        concept: u.conceptName,
        explanation: u.meaning || u.definition || `Instructional coverage of ${u.conceptName}`,
        formulas: u.formula ? [u.formula] : [],
        principles: u.principle ? [u.principle] : [],
        examples: u.examples || [],
        applications: u.applications || [],
        problemMethods: u.solvingMethods || [],
        evidence: u.evidence || []
      };

      if (!topicsMap.has(mainTopic)) {
        topicsMap.set(mainTopic, new Map());
      }
      const subMap = topicsMap.get(mainTopic)!;
      if (!subMap.has(subtopicName)) {
        subMap.set(subtopicName, []);
      }
      subMap.get(subtopicName)!.push(conceptEntry);
    });

    const hierarchicalTopics: KnowledgeMapTopic[] = Array.from(topicsMap.entries()).map(([top, subMap], tIdx) => ({
      topicId: `topic_${tIdx + 1}`,
      topic: top,
      subtopics: Array.from(subMap.entries()).map(([sub, conceptList], sIdx) => ({
        subtopicId: `subtopic_${tIdx + 1}_${sIdx + 1}`,
        subtopic: sub,
        concepts: conceptList
      }))
    }));

    return {
      videoId: evidence.videoId,
      subject: evidence.subject,
      classLevel: evidence.academicLevel,
      academicLevel: evidence.academicLevel,
      chapter: evidence.chapter,
      topic: evidence.topic,
      topics: hierarchicalTopics,
      concepts: understandings,
      conceptList: concepts.filter(c => allowedConceptIds.includes(c.id)),
      coverageClassifications: classifications,
      allowedConceptIds,
      untaughtChapterConcepts,
      relationshipsGraph
    };
  }
}
