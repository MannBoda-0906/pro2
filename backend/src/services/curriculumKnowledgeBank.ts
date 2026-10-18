export class CurriculumKnowledgeBank {
  /**
   * Expert prompt training directives, cognitive rubrics, and distractor doctrine
   * used to guide Gemini models in concept-level analysis and exam construction.
   */
  static getPedagogicalTrainingPrompt(): string {
    return `
EXPERT PEDAGOGICAL DECONSTRUCTION & EXAM COMMISSIONER TRAINING DIRECTIVES:

1. STRICT VIDEO TRANSCRIPT CONCEPTUAL GROUNDING:
   - The transcript and captions are the SOLE authoritative source of truth.
   - NEVER create questions by copying the video title or asking about title wording.
   - NEVER copy teacher filler sentences or ask "What did the teacher say?" or "According to the video...".
   - Transform the educational concepts into novel, original application problems and conceptual reasoning questions.
   - DO NOT hallucinate concepts that were not taught in the video. If the video covers 5 concepts, questions must come ONLY from those 5 concepts.
   - Strictly separate VIDEO COVERED CONCEPTS from ADDITIONAL CHAPTER CONCEPTS.

2. EXAM BLUEPRINT DISTRIBUTION:
   - Numerical/application questions MUST require actual problem solving using formulas from the transcript.
   - Every numerical question MUST be independently calculated and verified step-by-step.
   - Conceptual questions must test physical/scientific meaning, cause-and-effect, boundary conditions, and common misconceptions from the transcript evidence.

3. DISTRACTOR DESIGN DOCTRINE (ZERO-JOKE RULE):
   - EVERY distractor MUST be diagnostic: an incorrect choice should map directly to a recognized student cognitive error.
   - NEVER use absurd, silly, or giveaway choices. All options MUST be credible, plausible academic choices.

4. STEP-BY-STEP PEDAGOGICAL EXPLANATIONS:
   - Explanations must clearly state the relevant formula/principle, substitute given values, carry out calculations with units, and explain the physical logic.

5. MULTILINGUAL DISCIPLINE:
   - For Hindi and Gujarati, preserve technical scientific terms in English within parentheses where appropriate.
   - ALWAYS preserve mathematical formulas, coordinate numbers, signs, Greek symbols, and scientific units standard across all languages.
`;
  }
}
