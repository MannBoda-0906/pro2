import crypto from 'crypto';
import { QuizQuestion, StructuredSolution } from '../../types/index.js';
import { TaskFamily, TASK_FAMILY_TAXONOMY } from './taskFamilyTaxonomy.js';

export interface CanonicalSolutionFingerprint {
  conceptId: string;
  subconcept: string;
  givenQuantities: string[]; // names only, no numeric values
  unknownQuantity: string;   // what is being solved for
  relationships: string[];   // normalized formulas or principles used
  orderedOperations: string[]; // e.g. ['substitute', 'rearrange', 'ratio', 'difference']
  taskFamily: TaskFamily;
  scenarioType: string;      // abstract setting (e.g. 'two_body_collinear', 'single_reaction')
  outputKind: 'numeric_value' | 'ordering' | 'boolean' | 'identify_error' | 'choose_method' | 'matched_pairs' | 'exact_term';
  procedureSignature: string; // SHA-256 / hex hash of normalized components
  declaredMethodId?: string;
  declaredProcedureSignature?: string;
  discrepancyLogged?: boolean;
}

export class SolutionFingerprinter {
  /**
   * Derives a canonical solution fingerprint strictly from the candidate's question and stored solution.
   * Numbers, units, object names, and cosmetic wording are completely stripped.
   */
  public static computeFingerprint(q: QuizQuestion): CanonicalSolutionFingerprint {
    const format = q.questionFormat || q.type || 'numerical';
    const conceptId = q.conceptId || 'C1';
    const subconcept = q.conceptName || 'Core Concept';

    const qText = (q.question || '').toLowerCase();
    const sol = q.structuredSolution;
    const solText = ((q.solution || '') + ' ' + (q.explanation || '')).toLowerCase();

    let givenQuantities: string[] = [];
    let unknownQuantity = 'target_value';
    let relationships: string[] = [];
    let orderedOperations: string[] = ['substitute', 'evaluate_arithmetic'];
    let taskFamily: TaskFamily = 'DIRECT_CALC';
    let scenarioType = 'general_scenario';
    let outputKind: CanonicalSolutionFingerprint['outputKind'] = 'numeric_value';

    if (format === 'true_false') {
      outputKind = 'boolean';
      taskFamily = (q.taskFamily as TaskFamily) || 'TRUE_FALSE';
      unknownQuantity = q.unknownType || (sol?.trueFalse?.truthValue ? 'truth_value_true' : 'truth_value_false');
      relationships = [
        sol?.trueFalse?.conceptExplanation
          ? this.normalizeRelationship(sol.trueFalse.conceptExplanation)
          : 'governing_principle_truth_relation'
      ];
      orderedOperations = ['boolean_truth_evaluation'];
      scenarioType = 'theoretical_proposition';
    } else if (format === 'fill_blank') {
      outputKind = 'exact_term';
      taskFamily = 'FILL_BLANK';
      unknownQuantity = q.unknownType || `term_${(q.correctAnswer || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      relationships = [
        sol?.fillBlank?.explanation
          ? this.normalizeRelationship(sol.fillBlank.explanation)
          : 'canonical_terminology_relation'
      ];
      orderedOperations = ['exact_term_identification'];
      scenarioType = 'vocabulary_principle_definition';
    } else if (format === 'match_columns') {
      outputKind = 'matched_pairs';
      taskFamily = 'MATCHING';
      unknownQuantity = q.unknownType || 'bipartite_mapping';
      relationships = [
        q.question
          ? this.normalizeRelationship(q.question)
          : 'entity_property_correspondence'
      ];
      orderedOperations = ['bipartite_mapping'];
      scenarioType = 'multi_property_system';
    } else if (format === 'theoretical') {
      outputKind = 'choose_method';
      taskFamily = 'THEORY_EXPLANATION';
      unknownQuantity = q.unknownType || `mechanism_${this.normalizeRelationship(q.conceptName || 'core')}`;
      relationships = [
        sol?.theory?.reasoning
          ? this.normalizeRelationship(sol.theory.reasoning)
          : 'causal_theory_relation'
      ];
      orderedOperations = ['deductive_reasoning'];
      scenarioType = 'conceptual_justification';
    } else {
      // NUMERICAL / APPLICATION FORMAT
      outputKind = 'numeric_value';

      const declaredFamily = ((q.taskFamily || q.methodId || '') as string).toUpperCase() as TaskFamily;
      const isValidDeclared = Boolean(declaredFamily && TASK_FAMILY_TAXONOMY[declaredFamily]);

      if (isValidDeclared) {
        taskFamily = declaredFamily;
        const taxDef = TASK_FAMILY_TAXONOMY[declaredFamily];
        orderedOperations = taxDef?.expectedOperations || ['substitute', 'evaluate_arithmetic'];
        scenarioType = taxDef?.category || 'numerical';

        if (q.unknownType) {
          unknownQuantity = q.unknownType;
        } else if (taskFamily === 'INVERSE_FIND_UNKNOWN') {
          unknownQuantity = (qText.includes('mass') || solText.includes('mass'))
            ? 'missing_mass_parameter'
            : (qText.includes('coordinate') || qText.includes('position'))
            ? 'missing_coordinate_position'
            : (qText.includes('water') || solText.includes('water'))
            ? 'missing_water_parameter'
            : 'inverted_input_parameter';
        } else if (taskFamily === 'COMPARE_CASES') {
          unknownQuantity = 'case_difference_or_comparison_ratio';
        } else if (taskFamily === 'PREDICT_CHANGE') {
          unknownQuantity = 'displacement_shift_delta';
        } else if (taskFamily === 'RATIO_PROPORTION') {
          unknownQuantity = 'ratio_of_partition';
        } else if (taskFamily === 'BOUNDARY_LIMITING_CASE') {
          unknownQuantity = 'limiting_asymptotic_value';
        } else if (taskFamily === 'MULTI_STEP') {
          unknownQuantity = 'final_multi_stage_result';
        } else if (taskFamily === 'ERROR_ANALYSIS') {
          unknownQuantity = 'erroneous_step_or_corrected_value';
          outputKind = 'identify_error';
        } else if (taskFamily === 'MULTI_CONCEPT_INTEGRATION') {
          unknownQuantity = 'integrated_vector_quantity';
        } else if (taskFamily === 'REAL_WORLD_APPLICATION') {
          unknownQuantity = 'applied_context_quantity';
        } else {
          unknownQuantity = `primary_calculated_${q.slotIndex || 1}`;
        }

        relationships = [
          this.normalizeRelationship(
            sol?.numerical?.relationship ||
            sol?.numerical?.required ||
            (q.conceptName ? `${q.conceptName}_${taskFamily}` : taskFamily)
          )
        ];
      } else {
        // Fallback heuristic classification when taskFamily is not declared
        if (
          qText.includes('student') ||
          qText.includes('incorrect step') ||
          qText.includes('identify the error') ||
          qText.includes('mistake') ||
          qText.includes('flawed')
        ) {
          taskFamily = 'ERROR_ANALYSIS';
          unknownQuantity = 'erroneous_step_or_corrected_value';
          relationships = ['diagnostic_rubric_check'];
          orderedOperations = ['diagnose_error', 'correct_calculation'];
          scenarioType = 'student_solution_audit';
          outputKind = 'identify_error';
        } else if (
          qText.includes('unknown mass') ||
          qText.includes('find the mass') ||
          qText.includes('determine the mass') ||
          qText.includes('calculate the mass') ||
          qText.includes('unknown coordinate') ||
          qText.includes('unknown position') ||
          qText.includes('find the coordinate') ||
          qText.includes('find the position') ||
          qText.includes('find x') ||
          qText.includes('find m') ||
          qText.includes('at what position') ||
          solText.includes('rearrang') ||
          solText.includes('isolate')
        ) {
          taskFamily = 'INVERSE_FIND_UNKNOWN';
          if (qText.includes('mass') || solText.includes('mass')) {
            unknownQuantity = 'missing_mass_parameter';
          } else if (qText.includes('coordinate') || qText.includes('position')) {
            unknownQuantity = 'missing_coordinate_position';
          } else {
            unknownQuantity = 'inverted_input_parameter';
          }
          relationships = [this.normalizeRelationship(sol?.numerical?.relationship || 'weighted_average_inversion')];
          orderedOperations = ['substitute', 'rearrange', 'isolate_variable', 'evaluate_arithmetic'];
          scenarioType = 'parameter_inversion';
        } else if (
          (qText.includes('case a') && qText.includes('case b')) ||
          (qText.includes('system 1') && qText.includes('system 2')) ||
          (qText.includes('system a') && qText.includes('system b')) ||
          qText.includes('which system') ||
          qText.includes('compare') ||
          qText.includes('difference between')
        ) {
          taskFamily = 'COMPARE_CASES';
          unknownQuantity = 'case_difference_or_comparison_ratio';
          relationships = [this.normalizeRelationship(sol?.numerical?.relationship || 'dual_case_evaluation')];
          orderedOperations = ['evaluate_case_a', 'evaluate_case_b', 'compare', 'difference'];
          scenarioType = 'dual_configuration';
        } else if (
          qText.includes('shift') ||
          qText.includes('displace') ||
          qText.includes('moved by') ||
          qText.includes('predict the change') ||
          qText.includes('how far does')
        ) {
          taskFamily = 'PREDICT_CHANGE';
          unknownQuantity = 'displacement_shift_delta';
          relationships = [this.normalizeRelationship(sol?.numerical?.relationship || 'differential_displacement')];
          orderedOperations = ['delta_shift', 'evaluate_arithmetic'];
          scenarioType = 'dynamic_displacement';
        } else if (
          qText.includes('ratio') ||
          qText.includes('inversely proportional') ||
          qText.includes('proportion') ||
          qText.includes('fraction of')
        ) {
          taskFamily = 'RATIO_PROPORTION';
          unknownQuantity = 'ratio_of_partition';
          relationships = [this.normalizeRelationship(sol?.numerical?.relationship || 'inverse_ratio_law')];
          orderedOperations = ['ratio_formulation', 'scale_factor'];
          scenarioType = 'proportional_partition';
        } else if (
          qText.includes('much larger') ||
          qText.includes('approaches') ||
          qText.includes('limit') ||
          qText.includes('infinite') ||
          qText.includes('>>')
        ) {
          taskFamily = 'BOUNDARY_LIMITING_CASE';
          unknownQuantity = 'limiting_asymptotic_value';
          relationships = ['limiting_case_asymptote'];
          orderedOperations = ['asymptotic_limit', 'boundary_eval'];
          scenarioType = 'limiting_extreme';
        } else if (
          qText.includes('first') && (qText.includes('then') || qText.includes('next')) ||
          sol?.numerical?.calculation?.includes('Step 1') ||
          solText.includes('substituting into step 2')
        ) {
          taskFamily = 'MULTI_STEP';
          unknownQuantity = 'final_multi_stage_result';
          relationships = [this.normalizeRelationship(sol?.numerical?.relationship || 'sequential_governing_formula')];
          orderedOperations = ['intermediate_solve', 'second_step_solve'];
          scenarioType = 'multi_stage_calculation';
        } else if (
          qText.includes('velocity of center of mass') ||
          qText.includes('momentum') ||
          qText.includes('conservation') ||
          qText.includes('energy')
        ) {
          taskFamily = 'MULTI_CONCEPT_INTEGRATION';
          unknownQuantity = 'integrated_vector_quantity';
          relationships = ['kinematic_momentum_conservation'];
          orderedOperations = ['link_concept_a_b', 'evaluate_arithmetic'];
          scenarioType = 'cross_concept_system';
        } else {
          taskFamily = 'DIRECT_CALC';
          unknownQuantity = `primary_calculated_${q.slotIndex || 1}`;
          relationships = [this.normalizeRelationship(sol?.numerical?.relationship || 'canonical_governing_equation')];
          orderedOperations = ['substitute', 'evaluate_arithmetic'];
          scenarioType = 'direct_evaluation';
        }
      }

      // Extract given quantity names from structured solution if available
      if (sol?.numerical?.given) {
        const givenParts = sol.numerical.given.split(/[,;\n]+/).map(g => g.trim().replace(/=.*$/, '').trim());
        givenQuantities = givenParts.filter(g => g.length > 1 && !/^\d+$/.test(g));
      }
    }

    // Abstract procedure signature: canonical normalized hash of
    // relationships + ordered_operations + unknownQuantity + outputKind
    const signaturePayload = [
      conceptId.toLowerCase(),
      taskFamily.toLowerCase(),
      unknownQuantity.toLowerCase(),
      outputKind.toLowerCase(),
      orderedOperations.join('_'),
      relationships.map(r => r.toLowerCase().replace(/[^a-z0-9_]/g, '')).join('_')
    ].join('::');

    const procedureSignature = `proc_${crypto.createHash('sha256').update(signaturePayload).digest('hex').slice(0, 16)}`;

    const declaredMethodId = q.methodId;
    const declaredProcedureSignature = q.procedureSignature;

    const discrepancy = Boolean(
      (declaredMethodId && declaredMethodId !== taskFamily) ||
      (declaredProcedureSignature && declaredProcedureSignature !== procedureSignature)
    );

    if (discrepancy) {
      console.log(
        `[SolutionFingerprinter] Overruling declared labels for Q#${q.slotIndex || 'unknown'}: ` +
        `Declared[method=${declaredMethodId}, proc=${declaredProcedureSignature?.slice(0, 15)}...] -> ` +
        `Computed[taskFamily=${taskFamily}, unknown=${unknownQuantity}, proc=${procedureSignature}]`
      );
    }

    return {
      conceptId,
      subconcept,
      givenQuantities,
      unknownQuantity,
      relationships,
      orderedOperations,
      taskFamily,
      scenarioType,
      outputKind,
      procedureSignature,
      declaredMethodId,
      declaredProcedureSignature,
      discrepancyLogged: discrepancy
    };
  }

  private static normalizeRelationship(formulaStr: string): string {
    return formulaStr
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_=+\-*/^()]/g, '')
      .slice(0, 40) || 'standard_formula';
  }
}
