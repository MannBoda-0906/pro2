/**
 * Subject-Adaptive Task-Family Taxonomy for StudyTube AI.
 * Enforces that every question requires a meaningfully different mental operation,
 * not merely reworded sentences or renumbered values.
 */

export type TaskFamily =
  | 'DIRECT_CALC'
  | 'INVERSE_FIND_UNKNOWN'
  | 'REARRANGE_RELATION'
  | 'COMPARE_CASES'
  | 'PREDICT_CHANGE'
  | 'CAUSE_EFFECT'
  | 'RATIO_PROPORTION'
  | 'MULTI_STEP'
  | 'REAL_WORLD_APPLICATION'
  | 'CASE_STUDY'
  | 'DATA_TABLE_INTERPRETATION'
  | 'GRAPH_INTERPRETATION'
  | 'DIAGRAM_INTERPRETATION'
  | 'ERROR_ANALYSIS'
  | 'CHOOSE_METHOD_OR_FORMULA'
  | 'CONDITION_ASSUMPTION_CHECK'
  | 'BOUNDARY_LIMITING_CASE'
  | 'MISSING_INFORMATION'
  | 'CONSTRAINT_PROBLEM'
  | 'MULTI_CONCEPT_INTEGRATION'
  | 'MISCONCEPTION_DETECTION'
  | 'CLASSIFICATION'
  | 'SEQUENCE_ORDERING'
  | 'STATEMENT_EVALUATION'
  | 'MATCHING'
  | 'FILL_BLANK'
  | 'TRUE_FALSE'
  | 'THEORY_EXPLANATION';

export interface TaskFamilyDefinition {
  family: TaskFamily;
  category: 'numerical' | 'application' | 'conceptual' | 'format_specific';
  description: string;
  expectedOperations: string[];
  applicableSubjects: string[]; // ['*'] for all
}

export const TASK_FAMILY_TAXONOMY: Record<TaskFamily, TaskFamilyDefinition> = {
  DIRECT_CALC: {
    family: 'DIRECT_CALC',
    category: 'numerical',
    description: 'Direct substitution into standard equation solving for the primary dependent variable.',
    expectedOperations: ['substitute', 'evaluate_arithmetic'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'General Science', 'Computer Science']
  },
  INVERSE_FIND_UNKNOWN: {
    family: 'INVERSE_FIND_UNKNOWN',
    category: 'numerical',
    description: 'Final result is known; student must algebraically invert to find an unknown input parameter or variable.',
    expectedOperations: ['substitute', 'rearrange', 'isolate_variable', 'evaluate_arithmetic'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'General Science']
  },
  REARRANGE_RELATION: {
    family: 'REARRANGE_RELATION',
    category: 'numerical',
    description: 'Symbolic or parametric rearrangement of equations without full numerical calculation.',
    expectedOperations: ['rearrange', 'symbolic_manipulation'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics']
  },
  COMPARE_CASES: {
    family: 'COMPARE_CASES',
    category: 'numerical',
    description: 'Evaluate two distinct setups (Case A vs Case B) and determine magnitude of difference or ratio.',
    expectedOperations: ['evaluate_case_a', 'evaluate_case_b', 'compare', 'difference'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General Science']
  },
  PREDICT_CHANGE: {
    family: 'PREDICT_CHANGE',
    category: 'numerical',
    description: 'One parameter is shifted; compute or predict the differential displacement or shift in result.',
    expectedOperations: ['differential_shift', 'delta_calculation'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'General Science']
  },
  CAUSE_EFFECT: {
    family: 'CAUSE_EFFECT',
    category: 'conceptual',
    description: 'Deduce causal consequence of physical, chemical, or biological interventions.',
    expectedOperations: ['causal_chain', 'deduce_consequence'],
    applicableSubjects: ['*']
  },
  RATIO_PROPORTION: {
    family: 'RATIO_PROPORTION',
    category: 'numerical',
    description: 'Given input ratios (e.g. m1:m2 or stoichiometric ratio), compute resulting partition or scaling.',
    expectedOperations: ['ratio_formulation', 'scale_factor'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General Science']
  },
  MULTI_STEP: {
    family: 'MULTI_STEP',
    category: 'numerical',
    description: 'Sequential problem requiring two distinct mathematical steps or intermediate variables.',
    expectedOperations: ['intermediate_solve', 'second_step_solve'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'General Science']
  },
  REAL_WORLD_APPLICATION: {
    family: 'REAL_WORLD_APPLICATION',
    category: 'application',
    description: 'Concrete physical/engineering/real-world scenario applying the principle.',
    expectedOperations: ['model_context', 'substitute', 'evaluate_arithmetic'],
    applicableSubjects: ['*']
  },
  CASE_STUDY: {
    family: 'CASE_STUDY',
    category: 'application',
    description: 'Deep scenario analysis tracking system evolution or complex constraints.',
    expectedOperations: ['context_analysis', 'synthesize_principles'],
    applicableSubjects: ['*']
  },
  DATA_TABLE_INTERPRETATION: {
    family: 'DATA_TABLE_INTERPRETATION',
    category: 'application',
    description: 'Extract quantitative values from a structured data table or ordered coordinate pairs.',
    expectedOperations: ['table_lookup', 'compute_trend'],
    applicableSubjects: ['*']
  },
  GRAPH_INTERPRETATION: {
    family: 'GRAPH_INTERPRETATION',
    category: 'application',
    description: 'Interpret axes, slopes, areas, or intercepts on a coordinate plot or response curve.',
    expectedOperations: ['slope_area_eval', 'curve_trend'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General Science']
  },
  DIAGRAM_INTERPRETATION: {
    family: 'DIAGRAM_INTERPRETATION',
    category: 'application',
    description: 'Spatial or structural diagram analysis (e.g. geometric symmetry, circuit, chloroplast).',
    expectedOperations: ['spatial_mapping', 'structural_relation'],
    applicableSubjects: ['*']
  },
  ERROR_ANALYSIS: {
    family: 'ERROR_ANALYSIS',
    category: 'numerical',
    description: 'Audit a student calculation: diagnose a specific conceptual trap or algebraic slip.',
    expectedOperations: ['diagnose_error', 'correct_calculation'],
    applicableSubjects: ['*']
  },
  CHOOSE_METHOD_OR_FORMULA: {
    family: 'CHOOSE_METHOD_OR_FORMULA',
    category: 'conceptual',
    description: 'Select the valid mathematical principle, equation, or method among plausible choices.',
    expectedOperations: ['method_selection', 'validate_assumptions'],
    applicableSubjects: ['*']
  },
  CONDITION_ASSUMPTION_CHECK: {
    family: 'CONDITION_ASSUMPTION_CHECK',
    category: 'conceptual',
    description: 'Precondition check: identify under what physical conditions a formula or principle holds.',
    expectedOperations: ['boundary_condition_check', 'domain_validity'],
    applicableSubjects: ['*']
  },
  BOUNDARY_LIMITING_CASE: {
    family: 'BOUNDARY_LIMITING_CASE',
    category: 'numerical',
    description: 'Analyze limiting extremes (e.g. m1 >> m2, zero external force, infinite limit).',
    expectedOperations: ['asymptotic_limit', 'boundary_eval'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'General Science']
  },
  MISSING_INFORMATION: {
    family: 'MISSING_INFORMATION',
    category: 'numerical',
    description: 'Cavity/subtraction method or identifying what parameter is missing to reach uniqueness.',
    expectedOperations: ['cavity_subtraction', 'information_completeness'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics', 'General Science']
  },
  CONSTRAINT_PROBLEM: {
    family: 'CONSTRAINT_PROBLEM',
    category: 'numerical',
    description: 'System governed by an invariant constraint (e.g. stationary center of mass on a movable boat).',
    expectedOperations: ['constraint_relation', 'relative_displacement'],
    applicableSubjects: ['Physics', 'Chemistry', 'Mathematics']
  },
  MULTI_CONCEPT_INTEGRATION: {
    family: 'MULTI_CONCEPT_INTEGRATION',
    category: 'numerical',
    description: 'Integrates two distinct lecture concepts into a single coherent problem.',
    expectedOperations: ['link_concept_a_b', 'unified_solve'],
    applicableSubjects: ['*']
  },
  MISCONCEPTION_DETECTION: {
    family: 'MISCONCEPTION_DETECTION',
    category: 'conceptual',
    description: 'Directly address and disprove a classic student misconception.',
    expectedOperations: ['identify_fallacy', 'rebuttal'],
    applicableSubjects: ['*']
  },
  CLASSIFICATION: {
    family: 'CLASSIFICATION',
    category: 'conceptual',
    description: 'Categorize physical/biological items or states according to taxonomy rules.',
    expectedOperations: ['classify', 'group_properties'],
    applicableSubjects: ['*']
  },
  SEQUENCE_ORDERING: {
    family: 'SEQUENCE_ORDERING',
    category: 'conceptual',
    description: 'Arrange states, magnitudes, or processes in correct chronological or numerical order.',
    expectedOperations: ['order_sequence', 'compare_magnitudes'],
    applicableSubjects: ['*']
  },
  STATEMENT_EVALUATION: {
    family: 'STATEMENT_EVALUATION',
    category: 'conceptual',
    description: 'Evaluate multiple statements (Assertion-Reason or Statement I & II) for truth values.',
    expectedOperations: ['truth_check_statement_1', 'truth_check_statement_2', 'causal_link'],
    applicableSubjects: ['*']
  },
  MATCHING: {
    family: 'MATCHING',
    category: 'format_specific',
    description: 'Bipartite column matching between entities and their governing properties or formulas.',
    expectedOperations: ['bipartite_mapping'],
    applicableSubjects: ['*']
  },
  FILL_BLANK: {
    family: 'FILL_BLANK',
    category: 'format_specific',
    description: 'Fill in single authoritative exact term, quantity, or law with accepted synonyms.',
    expectedOperations: ['exact_term_identification'],
    applicableSubjects: ['*']
  },
  TRUE_FALSE: {
    family: 'TRUE_FALSE',
    category: 'format_specific',
    description: 'Rigorous conceptual proposition verifying core principle boundary condition.',
    expectedOperations: ['boolean_truth_evaluation'],
    applicableSubjects: ['*']
  },
  THEORY_EXPLANATION: {
    family: 'THEORY_EXPLANATION',
    category: 'conceptual',
    description: 'In-depth multiple choice question testing the physical or theoretical mechanism.',
    expectedOperations: ['deductive_reasoning'],
    applicableSubjects: ['*']
  }
};

export class TaskFamilyTaxonomy {
  /**
   * Filters and returns applicable task families for a specific subject and video type.
   */
  public static getAdaptiveFamiliesForSubject(
    subject: string,
    isTheoryOnly: boolean = false
  ): {
    allowedNumericalFamilies: TaskFamily[];
    allowedConceptualFamilies: TaskFamily[];
    excludedFamilies: Array<{ family: TaskFamily; reason: string }>;
  } {
    const s = subject.trim();
    const allFamilies = Object.values(TASK_FAMILY_TAXONOMY);

    const allowedNumerical: TaskFamily[] = [];
    const allowedConceptual: TaskFamily[] = [];
    const excluded: Array<{ family: TaskFamily; reason: string }> = [];

    allFamilies.forEach(def => {
      // Format specific handled directly
      if (def.category === 'format_specific') return;

      const isApplicable = def.applicableSubjects.includes('*') || def.applicableSubjects.includes(s);

      if (!isApplicable) {
        excluded.push({
          family: def.family,
          reason: `Not academically meaningful for subject ${s}`
        });
        return;
      }

      if (isTheoryOnly && def.category === 'numerical') {
        // In theory-only subjects, replace numerical tasks with case-studies and applications
        if (['COMPARE_CASES', 'PREDICT_CHANGE', 'RATIO_PROPORTION', 'REAL_WORLD_APPLICATION', 'CASE_STUDY', 'DATA_TABLE_INTERPRETATION', 'ERROR_ANALYSIS', 'MULTI_CONCEPT_INTEGRATION'].includes(def.family)) {
          allowedNumerical.push(def.family);
        } else {
          excluded.push({
            family: def.family,
            reason: `Strict algebraic formula task excluded for non-numerical subject ${s}`
          });
        }
      } else if (def.category === 'numerical' || def.category === 'application') {
        allowedNumerical.push(def.family);
      } else {
        allowedConceptual.push(def.family);
      }
    });

    return {
      allowedNumericalFamilies: allowedNumerical,
      allowedConceptualFamilies: allowedConceptual,
      excludedFamilies: excluded
    };
  }
}
