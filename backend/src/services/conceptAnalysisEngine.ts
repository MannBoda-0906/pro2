import { GoogleGenAI } from '@google/genai';
import {
  CognitiveLevel,
  Concept,
  ConceptFormula,
  ConceptMap,
  ConceptProcess,
  ConceptRelationship,
  QuizData,
  QuizQuestion,
  TopicCoverageReport,
  TranscriptSegment,
  WeakConceptReview
} from '../types/index.js';
import { ChunkingService } from './chunkingService.js';
import { DEMO_VIDEOS } from './demoData.js';
import { CurriculumKnowledgeBank } from './curriculumKnowledgeBank.js';

export interface QuizGenerationParams {
  videoId: string;
  videoUrl?: string;
  title: string;
  transcript: TranscriptSegment[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
  language?: string; // 'en' | 'hi' | 'gu' | 'es'
  apiKey?: string;
}

export interface PracticeGenerationParams {
  videoId?: string;
  title: string;
  weakConcepts: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  apiKey?: string;
}

export class ConceptAnalysisEngine {
  private static getClient(apiKey?: string): GoogleGenAI | null {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '' || key.startsWith('your_') || key === 'PLACEHOLDER') {
      return null;
    }
    return new GoogleGenAI({ apiKey: key.trim() });
  }

  private static getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  private static normalizeLanguage(lang?: string): { code: 'en' | 'hi' | 'gu' | 'es'; name: string } {
    if (!lang) return { code: 'en', name: 'English' };
    const lower = lang.toLowerCase().trim();
    if (lower.startsWith('hi') || lower.includes('hindi') || lower.includes('हिन्दी')) {
      return { code: 'hi', name: 'Hindi (हिन्दी)' };
    }
    if (lower.startsWith('gu') || lower.includes('gujarati') || lower.includes('ગુજરાતી')) {
      return { code: 'gu', name: 'Gujarati (ગુજરાતી)' };
    }
    if (lower.startsWith('es') || lower.includes('spanish') || lower.includes('español')) {
      return { code: 'es', name: 'Spanish (Español)' };
    }
    return { code: 'en', name: 'English' };
  }

  private static async generateContentWithTimeout(
    client: GoogleGenAI,
    params: { model: string; contents: string },
    timeoutMs: number = 14000
  ): Promise<any> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Gemini API call exceeded timeout limit of ${timeoutMs}ms`));
      }, timeoutMs);
    });
    try {
      const result = await Promise.race([client.models.generateContent(params), timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  }

  /**
   * Main entrypoint for Concept Analysis -> Exam Quiz Generation -> Quality Check
   */
  static async generateConceptQuiz(params: QuizGenerationParams): Promise<QuizData> {
    const {
      videoId,
      videoUrl,
      title,
      transcript,
      difficulty = 'medium',
      count = 10,
      language = 'en',
      apiKey
    } = params;

    const targetLang = this.normalizeLanguage(language);
    const client = this.getClient(apiKey);
    const fullTranscriptText = transcript.map(t => t.text).join(' ');

    // 1. Build Concept Map (AI or local heuristic)
    let conceptMap: ConceptMap | null = null;
    if (client && fullTranscriptText.length > 50) {
      try {
        conceptMap = await this.buildConceptMapWithAI(client, title, videoUrl, transcript, targetLang.name);
      } catch (err) {
        console.warn('Gemini concept map extraction notice:', err);
      }
    }

    if (!conceptMap) {
      conceptMap = this.buildConceptMapLocally(title, transcript, videoId);
    }

    // 2. Generate Exam-Oriented Quiz using the Concept Map
    let rawQuiz: QuizData | null = null;
    if (client && conceptMap) {
      try {
        rawQuiz = await this.generateQuizFromConceptMapWithAI(
          client,
          title,
          conceptMap,
          difficulty,
          count,
          targetLang
        );
      } catch (err) {
        console.warn('Gemini quiz generation from concept map notice:', err);
      }
    }

    if (!rawQuiz || !rawQuiz.questions || rawQuiz.questions.length === 0) {
      rawQuiz = this.synthesizeQuizLocally(title, conceptMap, difficulty, count, targetLang.code);
    }

    // 3. Build Topic Coverage Report
    const topicCoverageReport = this.buildTopicCoverageReport(conceptMap, rawQuiz.questions.length, targetLang.code);

    // 4. Quality Validation & Refinement
    const validatedQuestions = this.validateAndRefineQuestions(
      rawQuiz.questions,
      conceptMap,
      difficulty,
      targetLang.code
    );

    return {
      title: rawQuiz.title || `${title} — Exam Practice Quiz`,
      difficulty,
      language: targetLang.code,
      conceptMap,
      topicCoverageReport,
      questions: validatedQuestions.slice(0, count)
    };
  }

  /**
   * Step 1: Builds a comprehensive, language-neutral Concept Map from video content.
   */
  private static async buildConceptMapWithAI(
    client: GoogleGenAI,
    title: string,
    videoUrl: string | undefined,
    transcript: TranscriptSegment[],
    targetLangName: string
  ): Promise<ConceptMap | null> {
    const formattedTranscript = transcript
      .slice(0, 400)
      .map(t => `[${ChunkingService.formatTimestamp(t.start)}] ${t.text}`)
      .join('\n')
      .slice(0, 36000);

    const prompt = `You are a master educator, university professor, and senior curriculum designer analyzing a lesson video titled "${title}".
Your mission is to perform a deep, concept-level pedagogical breakdown of what was actually taught in this video.
Do NOT just quote transcript sentences. Act like an elite teacher who watched, understood, and abstracted the entire lesson.

EXPERT PEDAGOGICAL DECONSTRUCTION DIRECTIVES:
1. Deconstruct to First Principles: Uncover the foundational laws and axioms underlying the video (e.g., Conservation laws, Newton's Laws of Motion, Central Dogma, Le Chatelier's Principle, Fundamental Theorem of Calculus).
2. Establish Exact Causal Chains: Identify inputs -> intermediate state transformations -> final outcomes.
3. Formulate Invariants & Constraints: What assumptions are made (e.g. ideal gas, frictionless plane, vacuum, room temperature, scalar vs. vector context)?
4. Diagnostic Misconceptions: Identify at least 3 genuine student traps and cognitive errors that appear in standardized exams (e.g. AP, JEE, CBSE, GCSE, IB, GRE).

Analyze:
1. Main topic & educational subject category (physics, mathematics, chemistry, biology, computer_science, programming, history, geography, economics, general).
2. Key subtopics breaking down the lesson chronologically/structurally.
3. Specific concepts taught:
   - Name, simple explanation, detailed explanation
   - Related concepts and cause-and-effect relationships
   - Real-world examples or classroom analogies used by the teacher
   - Key terminology
   - Formulas/equations (if any are introduced, with variables and units)
   - Conditions, limitations, or edge cases
   - Common student misconceptions (critical for crafting realistic exam distractors)
   - Exam importance: "essential" (must-know), "important", or "supporting"
   - Approximate video timestamp (e.g. "04:15") when covered
4. Relationships between concepts (e.g. "A is directly proportional to B", "X requires Y as an input", "Step 1 yields Step 2").
5. Core definitions and step-by-step processes.

Output strictly valid JSON matching this schema:
{
  "mainTopic": "Comprehensive Subject / Topic",
  "subjectCategory": "physics",
  "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"],
  "concepts": [
    {
      "id": "c1",
      "name": "Concept Name",
      "simpleExplanation": "Clear, accessible 1-sentence explanation",
      "detailedExplanation": "Rigorous academic explanation of how this mechanism works",
      "relatedConcepts": ["Related concept A", "Related concept B"],
      "examples": ["Specific example or analogy from the video"],
      "terminology": ["Term 1", "Term 2"],
      "formula": "F = m * a (or omit if non-mathematical)",
      "conditionsOrLimitations": "Applies when mass is constant / in non-relativistic regimes",
      "commonMisconceptions": ["Students often confuse X with Y because..."],
      "examImportance": "essential",
      "approximateTimestamp": { "startSeconds": 120, "timestamp": "02:00" }
    }
  ],
  "relationships": [
    {
      "sourceConcept": "Force",
      "targetConcept": "Acceleration",
      "relationshipType": "proportional_to",
      "description": "Acceleration increases linearly with applied net force when mass is held constant."
    }
  ],
  "definitions": [
    {
      "term": "Key Term",
      "definition": "Formal textbook definition",
      "simpleExplanation": "Plain language intuition"
    }
  ],
  "formulas": [
    {
      "name": "Newton's Second Law",
      "formula": "F = m * a",
      "variables": [
        { "symbol": "F", "meaning": "Net Force", "unit": "Newtons (N)" },
        { "symbol": "m", "meaning": "Mass", "unit": "Kilograms (kg)" },
        { "symbol": "a", "meaning": "Acceleration", "unit": "m/s^2" }
      ],
      "applicability": "Inertial frames of reference"
    }
  ],
  "processes": [
    {
      "processName": "Process name (e.g. Light-Dependent Reactions / Compilation Pipeline)",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "outcome": "Final result"
    }
  ],
  "examples": [
    {
      "concept": "Concept illustrated",
      "example": "Teacher's example",
      "takeaway": "What this demonstrates"
    }
  ],
  "misconceptions": [
    {
      "misconception": "Common error students make",
      "correction": "Correct scientific/academic reasoning",
      "concept": "Related concept"
    }
  ],
  "examImportantPoints": [
    "High-yield point 1 likely tested in standard exams",
    "High-yield point 2"
  ]
}

Lesson Content with Timestamps:
"""
${formattedTranscript}
"""

Return ONLY valid JSON.`;

    const res = await this.generateContentWithTimeout(client, {
      model: this.getModelName(),
      contents: prompt
    });

    const text = res.text || '';
    const parsed = this.parseJsonSafely<ConceptMap>(text);
    if (parsed && parsed.mainTopic && Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
      return parsed;
    }
    return null;
  }

  /**
   * Step 2: Generates an exam-oriented quiz from the Concept Map with cognitive level distribution and multilingual adaptation.
   */
  private static async generateQuizFromConceptMapWithAI(
    client: GoogleGenAI,
    title: string,
    conceptMap: ConceptMap,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    targetLang: { code: 'en' | 'hi' | 'gu' | 'es'; name: string }
  ): Promise<QuizData | null> {
    const conceptSummary = JSON.stringify({
      mainTopic: conceptMap.mainTopic,
      subjectCategory: conceptMap.subjectCategory,
      concepts: conceptMap.concepts.map(c => ({
        id: c.id,
        name: c.name,
        explanation: c.simpleExplanation,
        formula: c.formula,
        misconceptions: c.commonMisconceptions,
        importance: c.examImportance,
        timestamp: c.approximateTimestamp?.timestamp,
        seconds: c.approximateTimestamp?.startSeconds
      })),
      relationships: conceptMap.relationships,
      formulas: conceptMap.formulas,
      processes: conceptMap.processes,
      misconceptions: conceptMap.misconceptions
    }, null, 2);

    const cognitiveDistributionPrompt =
      difficulty === 'easy'
        ? `Focus predominantly on: Level 1 (Recall of definitions & facts: ~40%), Level 2 (Conceptual understanding of 'why' & 'how': ~40%), Level 3 (Simple application: ~20%).`
        : difficulty === 'medium'
        ? `Balanced exam mix: Level 1 (Recall: ~20%), Level 2 (Understanding: ~35%), Level 3 (Scenario/Calculation Application: ~25%), Level 4 (Analysis & Comparative relationships: ~20%).`
        : `Advanced exam rigor: Level 2 (Deep understanding: ~25%), Level 3 (Application & Multi-step scenarios: ~30%), Level 4 (Analysis & Variable manipulation: ~25%), Level 5 (Exam-style reasoning & subtle misconception traps: ~20%).`;

    const subjectSpecificGuidelines =
      conceptMap.subjectCategory === 'physics' || conceptMap.subjectCategory === 'mathematics'
        ? `Include realistic numerical calculations or proportional-reasoning questions (e.g. "If force is doubled and mass halved, what happens to acceleration?") using formulas taught in the video.`
        : conceptMap.subjectCategory === 'biology' || conceptMap.subjectCategory === 'chemistry'
        ? `Focus on biological/chemical processes, limiting factors, structural roles (e.g. "Which change directly reduces the rate of photosynthesis?"), and cause-and-effect mechanisms.`
        : conceptMap.subjectCategory === 'computer_science' || conceptMap.subjectCategory === 'programming'
        ? `Focus on algorithmic logic, computational trade-offs, state tracking, and concrete code/problem scenarios.`
        : `Focus on cause/effect relationships, comparative analysis, core concepts, and analytical significance.`;

    const languageInstruction =
      targetLang.code === 'hi'
        ? `CRITICAL MULTILINGUAL RULE:
- ALL questions, options, hints, and explanations MUST be written in fluent, grammatically accurate Hindi (हिन्दी).
- PRESERVE technical terminology with English in parentheses where helpful (e.g. "प्रकाश संश्लेषण (Photosynthesis)", "जड़त्व (Inertia)", "त्वरण (Acceleration)").
- Keep formulas and mathematical symbols intact (e.g. F = m * a, 6CO2 + 6H2O, 20 N, 5 kg).
- Do NOT mix English and Hindi sentences arbitrarily.`
        : targetLang.code === 'gu'
        ? `CRITICAL MULTILINGUAL RULE:
- ALL questions, options, hints, and explanations MUST be written in fluent, grammatically accurate Gujarati (ગુજરાતી).
- PRESERVE technical terminology with English in parentheses where helpful (e.g. "પ્રકાશસંશ્લેષણ (Photosynthesis)", "પ્રવેગ (Acceleration)").
- Keep formulas and mathematical symbols intact (e.g. F = m * a, 6CO2 + 6H2O, 20 N, 5 kg).
- Do NOT mix English and Gujarati sentences arbitrarily.`
        : targetLang.code === 'es'
        ? `CRITICAL MULTILINGUAL RULE:
- ALL questions, options, hints, and explanations MUST be written in natural, academic Spanish (Español).
- Keep formulas and scientific units standard (F = m * a, 20 N, 5 kg).`
        : `Generate in natural, clear academic English.`;

    const prompt = `You are a university exam commissioner creating an exam-oriented quiz for the lesson "${title}".
Target Language: "${targetLang.name}" (${targetLang.code}).
Number of Questions: EXACTLY ${count}.
Difficulty Level: "${difficulty}".

${cognitiveDistributionPrompt}
${subjectSpecificGuidelines}

${languageInstruction}

QUESTION QUALITY & EXAM COMMISSIONER TRAINING DIRECTIVES:
1. BLOOM'S REVISED TAXONOMY & WEBB'S DEPTH OF KNOWLEDGE (DOK):
   - DOK 1 (Recall): Test foundational definitions, constants, and standard units.
   - DOK 2 (Conceptual Mechanism): Test "Why" and "How" systems operate based on first principles.
   - DOK 3 (Numerical & Proportional Application): Test quantitative calculation or multi-variable proportional reasoning (e.g., "If distance is doubled and mass quadrupled, what is the net gravitational force?").
   - DOK 4 (Analytical Traps): Test limiting factors, boundary conditions, and causal fallacies.
2. DISTRACTOR DESIGN DOCTRINE (ZERO-JOKE RULE):
   - EVERY distractor MUST be diagnostic: an incorrect choice should map directly to a recognized student cognitive error (e.g., forgetting to square a variable, reciprocal oversight, confusing rate with amount).
   - NEVER use silly, joke, or giveaway choices. All 4 options MUST appear as legitimate, credible scholarly statements.
3. PEDAGOGICAL EXPLANATIONS:
   - "explanation": Teach the governing mechanism and logical proof step-by-step.
   - "misconceptionExploration": Explicitly dissect why distractors are misleading and how students can recognize these traps in standardized exams.
4. Connect each question to its corresponding conceptName and approximate timestamp if available.

JSON Schema to return:
{
  "title": "${title} — Exam Practice Quiz",
  "difficulty": "${difficulty}",
  "language": "${targetLang.code}",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "cognitiveLevel": "level_2_understanding",
      "conceptName": "Specific Concept Tested",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "In-depth pedagogical explanation of why this answer is right...",
      "misconceptionExploration": "Why other options reflect student confusion...",
      "difficulty": "${difficulty}",
      "timestampSeconds": 120,
      "timestampFormatted": "02:00"
    }
  ]
}

Available Concept Map Knowledge Structure:
${conceptSummary}

Return ONLY valid JSON.`;

    const res = await this.generateContentWithTimeout(client, {
      model: this.getModelName(),
      contents: prompt
    });

    const text = res.text || '';
    const parsed = this.parseJsonSafely<QuizData>(text);
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed;
    }
    return null;
  }

  /**
   * Generates targeted practice questions specifically for weak concepts where the student made mistakes.
   */
  static async generateAdaptivePracticeQuestions(params: PracticeGenerationParams): Promise<QuizQuestion[]> {
    const {
      title,
      weakConcepts,
      difficulty = 'medium',
      language = 'en',
      apiKey
    } = params;

    const targetLang = this.normalizeLanguage(language);
    const client = this.getClient(apiKey);

    if (client && weakConcepts.length > 0) {
      try {
        const prompt = `You are an adaptive AI private tutor.
A student just completed an exam quiz on "${title}" and struggled with these specific concepts:
${weakConcepts.map(c => `- ${c}`).join('\n')}

Generate ${Math.min(5, Math.max(3, weakConcepts.length * 2))} NEW scenario-based practice questions.
CRITICAL RULES:
1. Do NOT repeat previous questions. Provide a fresh real-world scenario or calculation testing the same underlying concept.
2. Target cognitive levels Level 2 (Understanding) and Level 3 (Application).
3. If student had misconception, test them on a different situation to verify they now truly understand.
4. Output language: "${targetLang.name}" (${targetLang.code}).
5. Include thorough pedagogical explanations teaching the principle.

Return valid JSON:
[
  {
    "id": "practice_1",
    "type": "mcq",
    "cognitiveLevel": "level_3_application",
    "conceptName": "${weakConcepts[0] || 'Core Concept'}",
    "question": "Scenario-based question...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Detailed explanation of why this is correct...",
    "difficulty": "${difficulty}"
  }
]`;

        const res = await this.generateContentWithTimeout(client, {
          model: this.getModelName(),
          contents: prompt
        });

        const text = res.text || '';
        const parsed = this.parseJsonSafely<QuizQuestion[]>(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((q, idx) => ({
            ...q,
            id: q.id || `adaptive_${idx + 1}`,
            difficulty: q.difficulty || difficulty,
            cognitiveLevel: q.cognitiveLevel || 'level_3_application',
            conceptName: q.conceptName || weakConcepts[idx % weakConcepts.length] || 'Core Concept'
          }));
        }
      } catch (err) {
        console.warn('Adaptive practice generation notice:', err);
      }
    }

    // Local fallback for practice
    return weakConcepts.map((concept, idx) => ({
      id: `practice_local_${idx + 1}`,
      type: 'mcq',
      cognitiveLevel: 'level_3_application',
      conceptName: concept,
      question:
        targetLang.code === 'hi'
          ? `अवधारणा अभ्यास (${concept}): जब इस प्रणाली में परिस्थितियां बदलती हैं, तो इनमें से कौन सा परिणाम सबसे सटीक होगा?`
          : targetLang.code === 'gu'
          ? `સંકલ્પના મહાવરો (${concept}): જ્યારે આ પ્રણાલીમાં પરિસ્થિતિઓ બદલાય છે, ત્યારે કયું પરિણામ સૌથી સચોટ હશે?`
          : targetLang.code === 'es'
          ? `Práctica dirigida de ${concept}: En una situación práctica, ¿cuál de los siguientes resultados es más coherente con este principio?`
          : `Targeted Practice for ${concept}: In an applied scenario, which outcome is most consistent with this fundamental principle?`,
      options:
        targetLang.code === 'hi'
          ? [
              `प्रणाली मूलभूत नियमों का पालन करते हुए प्रत्यक्ष आनुपातिक रूप से प्रतिक्रिया करती है`,
              `यह बाहरी प्रभाव के बिना अनियमित रूप से व्यवहार करती है`,
              `यह विपरीत दिशा में बिना किसी ऊर्जा के स्थानांतरित होती है`,
              `यह किसी भी वैज्ञानिक नियम का पालन नहीं करती है`
            ]
          : targetLang.code === 'gu'
          ? [
              `પ્રણાલી મૂળભૂત નિયમોનું પાલન કરીને પ્રત્યક્ષ રીતે પ્રતિક્રિયા આપે છે`,
              `તે કોઈ પણ બાહ્ય પરિબળ વિના અવ્યવસ્થિત રીતે વર્તે છે`,
              `તે ઊર્જા સંરક્ષણના નિયમનું ઉલ્લંઘન કરે છે`,
              `તે કોઈપણ સિદ્ધાંતનું પાલન કરતી નથી`
            ]
          : targetLang.code === 'es'
          ? [
              `El sistema responde de manera directamente proporcional según el mecanismo central de ${concept}`,
              `El sistema ignora las leyes físicas y se detiene arbitrariamente`,
              `Las variables cambian sin relación de causa y efecto`,
              `La energía se disipa sin interacción alguna`
            ]
          : [
              `The system responds in direct accordance with the governing relationship of ${concept}`,
              `The system acts randomly without respect to initial conditions`,
              `The outcome violates conservation principles without any interaction`,
              `The response is completely independent of applied inputs`
            ],
      correctAnswer:
        targetLang.code === 'hi'
          ? `प्रणाली मूलभूत नियमों का पालन करते हुए प्रत्यक्ष आनुपातिक रूप से प्रतिक्रिया करती है`
          : targetLang.code === 'gu'
          ? `પ્રણાલી મૂળભૂત નિયમોનું પાલન કરીને પ્રત્યક્ષ રીતે પ્રતિક્રિયા આપે છે`
          : targetLang.code === 'es'
          ? `El sistema responde de manera directamente proporcional según el mecanismo central de ${concept}`
          : `The system responds in direct accordance with the governing relationship of ${concept}`,
      explanation:
        targetLang.code === 'hi'
          ? `यह प्रश्न पुष्टि करता है कि आप ${concept} के कारण और प्रभाव को समझते हैं। जब एक कारक बदलता है, तो तंत्र वैज्ञानिक नियमों के अनुसार प्रतिक्रिया करता है।`
          : targetLang.code === 'gu'
          ? `આ પ્રશ્ન ખાતરી કરે છે કે તમે ${concept} ના કાર્યકારણ સંબંધને સમજો છો. પરિસ્થિતિ બદલાતા પરિણામ સુસંગત રીતે બદલાય છે.`
          : targetLang.code === 'es'
          ? `Esta pregunta refuerza la comprensión de causa y efecto en ${concept}, demostrando que una alteración en las variables produce una respuesta predecible.`
          : `This validates true conceptual understanding of ${concept}: changes in the governing variables lead to predictable, structured responses rather than arbitrary shifts.`,
      difficulty
    }));
  }

  /**
   * Builds the Topic Coverage Report displayed to the student before taking the quiz.
   */
  private static buildTopicCoverageReport(
    conceptMap: ConceptMap,
    questionCount: number,
    langCode: 'en' | 'hi' | 'gu' | 'es'
  ): TopicCoverageReport {
    const coveredConcepts = conceptMap.concepts.map(c => ({
      name: c.name,
      importance: c.examImportance,
      timestamp: c.approximateTimestamp?.timestamp,
      timestampSeconds: c.approximateTimestamp?.startSeconds
    }));

    const totalConcepts = coveredConcepts.length;
    let summaryText = `${questionCount} questions covering ${totalConcepts} major concepts`;
    if (langCode === 'hi') {
      summaryText = `${totalConcepts} मुख्य अवधारणाओं पर आधारित ${questionCount} परीक्षा-उन्मुख प्रश्न`;
    } else if (langCode === 'gu') {
      summaryText = `${totalConcepts} મુખ્ય સંકલ્પનાઓ પર આધારિત ${questionCount} પરીક્ષાલક્ષી પ્રશ્નો`;
    } else if (langCode === 'es') {
      summaryText = `${questionCount} preguntas que cubren ${totalConcepts} conceptos fundamentales`;
    }

    return {
      mainTopic: conceptMap.mainTopic,
      subjectCategory: conceptMap.subjectCategory,
      coveredConcepts,
      summaryText
    };
  }

  /**
   * Automated Quality Check & Rectification before showing quiz to student.
   */
  private static validateAndRefineQuestions(
    questions: QuizQuestion[],
    conceptMap: ConceptMap,
    difficulty: 'easy' | 'medium' | 'hard',
    langCode: 'en' | 'hi' | 'gu' | 'es'
  ): QuizQuestion[] {
    const validated: QuizQuestion[] = [];
    const seenTexts = new Set<string>();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || q.question.trim().length < 10) continue;

      const normText = q.question.toLowerCase().trim();
      if (seenTexts.has(normText)) continue;
      seenTexts.add(normText);

      // Ensure at least 2 distinct options
      let options = Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : [];
      if (options.length < 2) {
        options = ['Option A', 'Option B', 'Option C', 'Option D'];
      }

      // Ensure correctAnswer matches an option exactly
      let correctAnswer = q.correctAnswer;
      if (!options.includes(correctAnswer)) {
        // Fallback: choose the closest or first option
        const match = options.find(o => o.toLowerCase().trim() === (correctAnswer || '').toLowerCase().trim());
        if (match) {
          correctAnswer = match;
        } else {
          options.unshift(correctAnswer || 'Correct Statement');
          correctAnswer = options[0];
        }
      }

      // Ensure explanation is educational
      let explanation = q.explanation;
      if (!explanation || explanation.trim().length < 15) {
        explanation =
          langCode === 'hi'
            ? `यह उत्तर वीडियो में समझाई गई अवधारणा पर आधारित है, जो सिद्धांत और व्यावहारिक अनुप्रयोग की पुष्टि करता है।`
            : langCode === 'gu'
            ? `આ જવાબ વિડિઓમાં સમજાવેલ સંકલ્પના પર આધારિત છે, જે સિદ્ધાંત અને વ્યવહારુ ઉપયોગની પુષ્ટિ કરે છે.`
            : langCode === 'es'
            ? `Esta respuesta está respaldada por los conceptos explicados en la lección, confirmando tanto la teoría como su aplicación práctica.`
            : `This answer is grounded in the core conceptual mechanisms presented in the lesson.`;
      }

      const assignedConcept = q.conceptName || conceptMap.concepts[i % conceptMap.concepts.length]?.name || conceptMap.mainTopic;
      const conceptObj = conceptMap.concepts.find(c => c.name.toLowerCase() === assignedConcept.toLowerCase());

      validated.push({
        id: q.id || `q_${i + 1}`,
        type: q.type || 'mcq',
        cognitiveLevel: q.cognitiveLevel || (i === 0 ? 'level_1_recall' : i % 2 === 0 ? 'level_2_understanding' : 'level_3_application'),
        conceptName: assignedConcept,
        conceptId: conceptObj?.id,
        question: q.question,
        options,
        correctAnswer,
        explanation,
        misconceptionExploration: q.misconceptionExploration,
        difficulty: q.difficulty || difficulty,
        timestampSeconds: q.timestampSeconds || conceptObj?.approximateTimestamp?.startSeconds,
        timestampFormatted: q.timestampFormatted || conceptObj?.approximateTimestamp?.timestamp
      });
    }

    return validated;
  }

  /**
   * Local Concept Map synthesizer for offline or demo fallback mode.
   */
  private static buildConceptMapLocally(
    title: string,
    transcript: TranscriptSegment[],
    videoId?: string
  ): ConceptMap {
    // Check specialized curriculum knowledge bank first
    const specialized = CurriculumKnowledgeBank.getSpecializedConceptMap(title, videoId);
    if (specialized) {
      return specialized;
    }

    // If it's the photosynthesis demo
    if (videoId === 'demo-photosynthesis' || title.toLowerCase().includes('photosynthesis')) {
      return {
        mainTopic: 'Photosynthesis & Cellular Energy Transfer',
        subjectCategory: 'biology',
        subtopics: [
          'Chloroplast Anatomy (Thylakoids & Stroma)',
          'Light-Dependent Reactions & Photolysis',
          'ATP & NADPH Energy Carriers',
          'The Calvin Cycle & Carbon Fixation',
          'Factors Influencing Photosynthetic Rate'
        ],
        concepts: [
          {
            id: 'bio_1',
            name: 'Chloroplast & Chlorophyll Function',
            simpleExplanation: 'Chloroplasts are plant cell organelles that capture sunlight using chlorophyll pigments to drive chemical reactions.',
            detailedExplanation: 'Chlorophyll molecules embedded within thylakoid membrane protein complexes absorb specific wavelengths of photon energy (mainly blue and red), exciting electrons to higher orbital states.',
            relatedConcepts: ['Thylakoids', 'Stroma', 'Photosystem II'],
            examples: ['Green leaf tissue exposed to sunlight in temperate climates'],
            terminology: ['Chloroplast', 'Thylakoid', 'Grana', 'Stroma'],
            commonMisconceptions: ['Thinking plants only perform photosynthesis and do not perform cellular respiration.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 50, timestamp: '00:50' }
          },
          {
            id: 'bio_2',
            name: 'Photolysis & Water Splitting',
            simpleExplanation: 'Sunlight energizes chlorophyll to split water molecules into oxygen, protons, and electrons.',
            detailedExplanation: 'In Photosystem II (P680), light energy oxidizes water: 2H2O -> 4H+ + 4e- + O2. This reaction supplies replacement electrons for the transport chain and releases atmospheric oxygen.',
            relatedConcepts: ['Photosystem II', 'Electron Transport Chain', 'Oxygen Generation'],
            examples: ['Aquatic plants releasing oxygen bubbles under underwater illumination'],
            terminology: ['Photolysis', 'Photosystem II', 'Proton Gradient'],
            formula: '2H2O -> 4H+ + 4e- + O2',
            commonMisconceptions: ['Thinking oxygen comes from carbon dioxide rather than from water.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 95, timestamp: '01:35' }
          },
          {
            id: 'bio_3',
            name: 'The Calvin Cycle & RuBisCO',
            simpleExplanation: 'The dark reaction uses ATP and NADPH to convert carbon dioxide gas from air into glucose sugar.',
            detailedExplanation: 'In the chloroplast stroma, RuBisCO catalyzes the fixation of CO2 into ribulose-1,5-bisphosphate, producing 3-PGA, which is reduced using chemical energy into glyceraldehyde-3-phosphate (G3P) and glucose.',
            relatedConcepts: ['Carbon Fixation', 'RuBisCO', 'Glucose Synthesis'],
            examples: ['Sugar storage in plant roots and fruit'],
            terminology: ['RuBisCO', 'Carbon Fixation', 'Stroma', '3-PGA'],
            commonMisconceptions: ['Thinking the Calvin Cycle only happens at night; it requires ATP and NADPH produced during daylight.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 149, timestamp: '02:29' }
          },
          {
            id: 'bio_4',
            name: 'Rate Factors & Environmental Limitations',
            simpleExplanation: 'Photosynthesis rate is limited by light intensity, CO2 concentration, and temperature.',
            detailedExplanation: 'According to Liebig’s law of the minimum, if light or CO2 is restricted, the rate plateaus. Extreme temperatures denature RuBisCO enzymes, halting carbon fixation.',
            relatedConcepts: ['Enzymatic Kinetics', 'Limiting Factors'],
            examples: ['Greenhouse CO2 enrichment boosting crop yield'],
            terminology: ['Rate-Limiting Factor', 'Enzyme Denaturation'],
            commonMisconceptions: ['Believing increasing sunlight infinitely increases the photosynthesis rate.'],
            examImportance: 'important',
            approximateTimestamp: { startSeconds: 180, timestamp: '03:00' }
          }
        ],
        relationships: [
          {
            sourceConcept: 'Photolysis & Water Splitting',
            targetConcept: 'The Calvin Cycle & RuBisCO',
            relationshipType: 'prerequisite_for',
            description: 'Photolysis generates ATP and NADPH which are strictly consumed by the Calvin Cycle.'
          }
        ],
        definitions: [
          {
            term: 'Photosynthesis',
            definition: 'An anabolic, endergonic biological process converting light energy into chemical energy stored in glucose.',
            simpleExplanation: 'Plants making food from sunlight, air, and water.'
          }
        ],
        formulas: [
          {
            name: 'Photosynthesis Chemical Equation',
            formula: '6CO2 + 6H2O + Light Energy -> C6H12O6 + 6O2',
            variables: [
              { symbol: 'CO2', meaning: 'Carbon Dioxide', unit: 'moles' },
              { symbol: 'H2O', meaning: 'Water', unit: 'moles' },
              { symbol: 'C6H12O6', meaning: 'Glucose', unit: 'moles' },
              { symbol: 'O2', meaning: 'Oxygen', unit: 'moles' }
            ],
            applicability: 'Oxygenic photosynthetic organisms'
          }
        ],
        processes: [
          {
            processName: 'Two-Stage Photosynthesis Pipeline',
            steps: [
              'Photons excite chlorophyll in Photosystem II',
              'Photolysis splits H2O, releasing O2 and generating proton gradient',
              'ATP Synthase produces ATP; NADP+ reductase yields NADPH',
              'Calvin Cycle fixes CO2 into G3P using ATP/NADPH in the stroma'
            ],
            outcome: 'Synthesis of Glucose (C6H12O6)'
          }
        ],
        examples: [
          {
            concept: 'Rate Factors',
            example: 'A plant placed under a sealed jar with zero CO2',
            takeaway: 'Photosynthesis halts even with abundant sunlight because carbon fixation cannot proceed.'
          }
        ],
        misconceptions: [
          {
            misconception: 'Oxygen released by plants originates from CO2.',
            correction: 'Oxygen released originates from the photolysis of H2O in Photosystem II.',
            concept: 'Photolysis & Water Splitting'
          }
        ],
        examImportantPoints: [
          'Know the exact source of released O2 (water photolysis, not carbon dioxide).',
          'Understand the role of RuBisCO in the stroma.',
          'Understand the interplay between the light reactions and Calvin cycle.'
        ]
      };
    }

    // If it's MIT CS
    if (videoId === 'demo-mit-cs' || title.toLowerCase().includes('computer science') || title.toLowerCase().includes('python')) {
      return {
        mainTopic: 'Computational Thinking, Data Types, and Algorithms',
        subjectCategory: 'computer_science',
        subtopics: [
          'Nature of Computation & Computer Capabilities',
          'Declarative vs. Imperative Knowledge',
          'Algorithm Definitions & Halting Conditions',
          'Data Objects, Types & Scalar Representations',
          'Control Flow & Branching'
        ],
        concepts: [
          {
            id: 'cs_1',
            name: 'Declarative vs. Imperative Knowledge',
            simpleExplanation: 'Declarative is statements of fact ("what is"), while imperative is step-by-step procedural recipes ("how to deduce").',
            detailedExplanation: 'Declarative knowledge states truths (e.g. square root definition), while imperative knowledge provides an executable sequence of mechanical steps to arrive at a value.',
            relatedConcepts: ['Algorithms', 'Computational Thinking'],
            examples: ['Recipe for baking bread vs. description of bread'],
            terminology: ['Declarative', 'Imperative', 'Algorithm'],
            commonMisconceptions: ['Thinking knowing a definition is sufficient for a computer to compute the answer.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 44, timestamp: '00:44' }
          },
          {
            id: 'cs_2',
            name: 'Algorithm Structure & Halting Conditions',
            simpleExplanation: 'An algorithm is a finite list of instructions that must always stop and produce a result.',
            detailedExplanation: 'Every computational algorithm must have a deterministic sequence of operations, a finite state progression, and a well-defined termination condition to avoid infinite recursion or loops.',
            relatedConcepts: ['Control Flow', 'Termination Criteria'],
            examples: ['Binary search terminating when high < low'],
            terminology: ['Halting Condition', 'Deterministic Execution'],
            commonMisconceptions: ['Believing any infinite process can be called an algorithm.'],
            examImportance: 'essential',
            approximateTimestamp: { startSeconds: 87, timestamp: '01:27' }
          },
          {
            id: 'cs_3',
            name: 'Types & Object Memory Binding',
            simpleExplanation: 'Every value in Python is an object with an immutable type, and variables are names bound to these objects.',
            detailedExplanation: 'Types define valid operations that can be performed on an entity. Scalar types (int, float, bool, NoneType) represent indivisible values. Assignment binds a variable name to an object reference in memory.',
            relatedConcepts: ['Scalar Types', 'Reference Semantics'],
            examples: ['x = 5 binds name x to integer object 5'],
            terminology: ['Scalar', 'Binding', 'Object Type'],
            commonMisconceptions: ['Thinking assignment behaves like a mathematical equality equation rather than a one-way binding.'],
            examImportance: 'important',
            approximateTimestamp: { startSeconds: 138, timestamp: '02:18' }
          }
        ],
        relationships: [
          {
            sourceConcept: 'Declarative vs. Imperative Knowledge',
            targetConcept: 'Algorithm Structure & Halting Conditions',
            relationshipType: 'prerequisite_for',
            description: 'Algorithms are the formal implementation of imperative knowledge.'
          }
        ],
        definitions: [
          {
            term: 'Algorithm',
            definition: 'A finite sequence of rigorous, unambiguous instructions that takes inputs, halts, and produces an output.',
            simpleExplanation: 'A precise computer recipe with a clear finish line.'
          }
        ],
        formulas: [],
        processes: [],
        examples: [],
        misconceptions: [
          {
            misconception: 'Assignment (a = b) asserts algebraic equivalence.',
            correction: 'Assignment evaluates expression on right and binds name on left to result in memory.',
            concept: 'Types & Object Memory Binding'
          }
        ],
        examImportantPoints: [
          'Be able to distinguish declarative from imperative knowledge with novel examples.',
          'Identify scalar vs compound types in Python.'
        ]
      };
    }

    // General Subject Synthesizer
    const cleanSubject = title.replace(/\|.*$/g, '').replace(/-.*$/g, '').trim();
    return {
      mainTopic: cleanSubject,
      subjectCategory: 'general',
      subtopics: [
        'Foundational Principles & Core Premise',
        'Mechanisms and Dynamic Relationships',
        'Real-World Applications & Edge Cases',
        'Summary of Exam-Critical Concepts'
      ],
      concepts: [
        {
          id: 'gen_1',
          name: `Core Mechanism of ${cleanSubject}`,
          simpleExplanation: `The foundational concept defining how ${cleanSubject} functions systematically.`,
          detailedExplanation: `Analyzes the fundamental laws, structural elements, and conceptual cause-and-effect governing ${cleanSubject}.`,
          relatedConcepts: ['Underlying Principles', 'System Architecture'],
          examples: ['Real-world application discussed in the lecture'],
          terminology: ['Primary Principle', 'Mechanism'],
          commonMisconceptions: ['Confusing superficial correlations with direct causal relationships.'],
          examImportance: 'essential',
          approximateTimestamp: { startSeconds: 60, timestamp: '01:00' }
        },
        {
          id: 'gen_2',
          name: 'Cause-and-Effect Relationships & Variables',
          simpleExplanation: 'How shifting one critical parameter alters outcomes throughout the system.',
          detailedExplanation: 'Detailed study of interdependent variables and how modifications influence system stability or efficiency.',
          relatedConcepts: ['Equilibrium', 'Dynamic Response'],
          examples: ['Changing input parameters under test conditions'],
          terminology: ['Independent Variable', 'Dependent Response'],
          commonMisconceptions: ['Assuming changing one variable has isolated effects without system-wide feedback.'],
          examImportance: 'important',
          approximateTimestamp: { startSeconds: 180, timestamp: '03:00' }
        },
        {
          id: 'gen_3',
          name: 'Practical Application & Boundary Limitations',
          simpleExplanation: 'Where this principle applies in practical problem-solving and when it ceases to hold.',
          detailedExplanation: 'Explores real-world case studies, edge conditions, and the limitations of theoretical models.',
          relatedConcepts: ['Boundary Conditions', 'Practical Verification'],
          examples: ['Practical engineering or scientific case study'],
          terminology: ['Boundary Condition', 'Validity Domain'],
          commonMisconceptions: ['Extrapolating model predictions beyond valid boundary conditions.'],
          examImportance: 'essential',
          approximateTimestamp: { startSeconds: 300, timestamp: '05:00' }
        }
      ],
      relationships: [
        {
          sourceConcept: `Core Mechanism of ${cleanSubject}`,
          targetConcept: 'Cause-and-Effect Relationships & Variables',
          relationshipType: 'causes',
          description: 'The core mechanism dictates how variables interact.'
        }
      ],
      definitions: [
        {
          term: cleanSubject,
          definition: `The primary subject investigated in "${title}".`,
          simpleExplanation: 'The central idea and mechanism taught in this lesson.'
        }
      ],
      formulas: [],
      processes: [],
      examples: [],
      misconceptions: [
        {
          misconception: 'Memorizing terminology is sufficient for mastery.',
          correction: 'True understanding requires analyzing relationships between variables and applying concepts to novel scenarios.',
          concept: `Core Mechanism of ${cleanSubject}`
        }
      ],
      examImportantPoints: [
        'Understand the governing mechanism rather than memorizing isolated terms.',
        'Know the boundary conditions where the principle applies.'
      ]
    };
  }

  /**
   * Local exam question synthesizer when running offline or without Gemini API.
   */
  private static synthesizeQuizLocally(
    title: string,
    conceptMap: ConceptMap,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    langCode: 'en' | 'hi' | 'gu' | 'es'
  ): QuizData {
    // Check specialized curriculum questions first
    const specializedQuestions = CurriculumKnowledgeBank.getSpecializedQuizQuestions({
      title,
      conceptMap,
      difficulty,
      langCode,
      count
    });
    if (specializedQuestions && specializedQuestions.length > 0) {
      return {
        title: `${title} — Exam Practice Quiz`,
        difficulty,
        language: langCode,
        conceptMap,
        questions: specializedQuestions.slice(0, count)
      };
    }

    const isPhotosynthesis = conceptMap.subjectCategory === 'biology' || conceptMap.mainTopic.toLowerCase().includes('photosynthesis');
    const isCS = conceptMap.subjectCategory === 'computer_science' || conceptMap.mainTopic.toLowerCase().includes('python');

    let questions: QuizQuestion[] = [];

    if (isPhotosynthesis) {
      if (langCode === 'hi') {
        questions = [
          {
            id: 'q_hi_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: 'क्लोरोप्लास्ट और प्रकाश संश्लेषण स्थल',
            question: 'पादप कोशिकाओं में प्रकाश संश्लेषण की प्रकाश-निर्भर अभिक्रियाएं (Light-dependent reactions) मुख्य रूप से कहाँ संपन्न होती हैं?',
            options: [
              'थाइलेकोइड झिल्ली (Thylakoid membrane)',
              'स्ट्रोमा द्रव (Stroma)',
              'माइटोकॉन्ड्रिया की आंतरिक झिल्ली',
              'कोशिका भित्ति (Cell wall)'
            ],
            correctAnswer: 'थाइलेकोइड झिल्ली (Thylakoid membrane)',
            explanation: 'प्रकाश-निर्भर अभिक्रियाएं थाइलेकोइड झिल्लियों में होती हैं जहाँ क्लोरोफिल वर्णक सूर्य के प्रकाश को अवशोषित करते हैं, जबकि केल्विन चक्र स्ट्रोमा में होता है।',
            misconceptionExploration: 'छात्र अक्सर स्ट्रोमा और थाइलेकोइड में भ्रमित हो जाते हैं। स्ट्रोमा में प्रकाश-स्वतंत्र केल्विन चक्र होता है।',
            difficulty: 'easy',
            timestampSeconds: 64,
            timestampFormatted: '01:04'
          },
          {
            id: 'q_hi_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: 'जल का प्रकाश अपघटन (Photolysis)',
            question: 'प्रकाश संश्लेषण के दौरान वायुमंडल में छोड़ी जाने वाली ऑक्सीजन (O2) गैस का प्रत्यक्ष स्रोत क्या है?',
            options: [
              'जल (H2O) के अणुओं का प्रकाश अपघटन',
              'कार्बन डाइऑक्साइड (CO2) का विखंडन',
              'ग्लूकोज (C6H12O6) का अपघटन',
              'स्ट्रोमा में मौजूद फॉस्फेट आयन'
            ],
            correctAnswer: 'जल (H2O) के अणुओं का प्रकाश अपघटन',
            explanation: 'फोटोसिस्टम II में प्रकाश ऊर्जा जल (H2O) के अणुओं को विभाजित करती है, जिससे प्रोटॉन, इलेक्ट्रॉन और मुक्त ऑक्सीजन (O2) गैस उत्पन्न होती है। यह CO2 से नहीं आती है।',
            misconceptionExploration: 'यह सबसे आम छात्र गलतफहमी है कि पौधे ऑक्सीजन कार्बन डाइऑक्साइड से निकालते हैं। वस्तुतः यह जल (H2O) से आती है।',
            difficulty: 'medium',
            timestampSeconds: 113,
            timestampFormatted: '01:53'
          },
          {
            id: 'q_hi_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'प्रकाश संश्लेषण दर और सीमित करने वाले कारक',
            question: 'एक पौधे को पर्याप्त धूप और जल दिया जाता है, लेकिन वातावरण से सारी कार्बन डाइऑक्साइड (CO2) हटा दी जाती है। पौधे में प्रकाश संश्लेषण की दर पर क्या प्रभाव पड़ेगा?',
            options: [
              'केल्विन चक्र में कार्बन स्थिरीकरण न होने के कारण प्रकाश संश्लेषण पूरी तरह रुक जाएगा',
              'प्रकाश संश्लेषण अप्रभावित रहेगा क्योंकि केवल सूर्य का प्रकाश ही आवश्यक है',
              'दर दोगुनी हो जाएगी क्योंकि ऑक्सीजन अधिक बनेगी',
              'केवल रात में प्रकाश संश्लेषण शुरू होगा'
            ],
            correctAnswer: 'केल्विन चक्र में कार्बन स्थिरीकरण न होने के कारण प्रकाश संश्लेषण पूरी तरह रुक जाएगा',
            explanation: 'CO2 के बिना, RuBisCO एंजाइम कार्बन स्थिरीकरण नहीं कर सकता, जिससे ग्लूकोज का निर्माण असंभव हो जाता है और चक्र रुक जाता है।',
            misconceptionExploration: 'धूप होने के बावजूद, यदि कच्चा माल (CO2) नहीं है, तो प्रक्रिया आगे नहीं बढ़ सकती।',
            difficulty: 'medium',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          },
          {
            id: 'q_hi_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: 'ऊर्जा वाहक संबंध (ATP और NADPH)',
            question: 'प्रकाश-निर्भर अभिक्रियाओं और केल्विन चक्र (प्रकाश-स्वतंत्र) के बीच कार्यात्मक संबंध क्या है?',
            options: [
              'प्रकाश अभिक्रियाएं ATP और NADPH बनाती हैं जिनका उपयोग केल्विन चक्र में CO2 से शर्करा बनाने के लिए होता है',
              'केल्विन चक्र सूर्य के प्रकाश को अवशोषित करता है और थाइलेकोइड को जल भेजता है',
              'दोनों स्वतंत्र रूप से बिना किसी सामग्री के आदान-प्रदान के कार्य करते हैं',
              'केल्विन चक्र ऑक्सीजन उत्पन्न करता है जिसे प्रकाश अभिक्रियाएं अवशोषित करती हैं'
            ],
            correctAnswer: 'प्रकाश अभिक्रियाएं ATP और NADPH बनाती हैं जिनका उपयोग केल्विन चक्र में CO2 से शर्करा बनाने के लिए होता है',
            explanation: 'थाइलेकोइड झिल्लियों में निर्मित ATP और NADPH रासायनिक ऊर्जा वाहक के रूप में स्ट्रोमा में जाते हैं, जहाँ वे CO2 को ग्लूकोज में परिवर्तित करने के लिए ऊर्जा प्रदान करते हैं।',
            difficulty: 'hard',
            timestampSeconds: 129,
            timestampFormatted: '02:09'
          },
          {
            id: 'q_hi_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: 'एंजाइम RuBisCO और तापमान प्रभाव',
            question: 'यदि तापमान 55°C से अधिक बढ़ा दिया जाए, तो पर्याप्त प्रकाश और CO2 होने के बावजूद प्रकाश संश्लेषण की दर तेजी से क्यों घट जाती है?',
            options: [
              'उच्च तापमान पर RuBisCO और अन्य आवश्यक एंजाइम विकृत (Denature) हो जाते हैं',
              'जल के अणु प्रकाश अपघटन में विस्फोटित हो जाते हैं',
              'क्लोरोफिल अत्यधिक ऑक्सीजन उत्पन्न करने लगता है',
              'पौधे को प्रकाश के स्थान पर रात की आवश्यकता होती है'
            ],
            correctAnswer: 'उच्च तापमान पर RuBisCO और अन्य आवश्यक एंजाइम विकृत (Denature) हो जाते हैं',
            explanation: 'रासायनिक प्रक्रियाएं एंजाइमों द्वारा उत्प्रेरित होती हैं। अत्यधिक गर्मी एंजाइमों की त्रि-आयामी प्रोटीन संरचना को विकृत (denature) कर देती है, जिससे उत्प्रेरक क्षमता समाप्त हो जाती है।',
            difficulty: 'hard',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          }
        ];
      } else if (langCode === 'gu') {
        questions = [
          {
            id: 'q_gu_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: 'હરિતકણ અને પ્રકાશસંશ્લેષણનું સ્થાન',
            question: 'વનસ્પતિ કોષોમાં પ્રકાશ-આધારિત પ્રક્રિયાઓ (Light-dependent reactions) મુખ્યત્વે ક્યાં થાય છે?',
            options: [
              'થાઇલેકોઇડ પટલ (Thylakoid membrane)',
              'સ્ટ્રોમા પ્રવાહી (Stroma)',
              'કોષરસ પટલ (Cell membrane)',
              'કણાભસૂત્ર (Mitochondria)'
            ],
            correctAnswer: 'થાઇલેકોઇડ પટલ (Thylakoid membrane)',
            explanation: 'પ્રકાશ-આધારિત પ્રક્રિયાઓ થાઇલેકોઇડ પટલમાં રહેલા હરિતદ્રવ્ય (Chlorophyll) દ્વારા સૂર્યપ્રકાશનું શોષણ કરીને થાય છે, જ્યારે કેલ્વિન ચક્ર સ્ટ્રોમામાં થાય છે.',
            difficulty: 'easy',
            timestampSeconds: 64,
            timestampFormatted: '01:04'
          },
          {
            id: 'q_gu_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: 'પાણીનું પ્રકાશ વિઘટન (Photolysis)',
            question: 'પ્રકાશસંશ્લેષણ દરમિયાન વાતાવરણમાં મુક્ત થતા ઓક્સિજન (O2) વાયુનો મુખ્ય સ્ત્રોત કયો છે?',
            options: [
              'પાણી (H2O) ના અણુઓનું પ્રકાશ વિઘટન',
              'કાર્બન ડાયોક્સાઇડ (CO2) નું વિભાજન',
              'ગ્લુકોઝ (C6H12O6) નું સંશ્લેષણ',
              'ખનિજ ક્ષારોનું રૂપાંતરણ'
            ],
            correctAnswer: 'પાણી (H2O) ના અણુઓનું પ્રકાશ વિઘટન',
            explanation: 'ફોટોસિસ્ટમ II માં પ્રકાશ ઊર્જા પાણી (H2O) નું વિઘટન કરે છે, જેનાથી પ્રોટોન, ઇલેક્ટ્રોન અને મુક્ત ઓક્સિજન વાયુ (O2) ઉત્પન્ન થાય છે. તે CO2 માંથી આવતો નથી.',
            difficulty: 'medium',
            timestampSeconds: 113,
            timestampFormatted: '01:53'
          },
          {
            id: 'q_gu_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'પ્રકાશસંશ્લેષણ દર અને સીમાકારી પરિબળો',
            question: 'જો છોડને પુષ્કળ સૂર્યપ્રકાશ મળે પરંતુ વાતાવરણમાંથી કાર્બન ડાયોક્સાઇડ (CO2) દૂર કરવામાં આવે, તો પ્રકાશસંશ્લેષણના દર પર શું અસર થશે?',
            options: [
              'કેલ્વિન ચક્રમાં કાર્બનનું સ્થાપન ન થવાથી પ્રકાશસંશ્લેષણ અટકી જશે',
              'પ્રકાશસંશ્લેષણ વધશે કારણ કે ઓક્સિજન વધે છે',
              'કોઈ અસર નહીં થાય કારણ કે સૂર્યપ્રકાશ ઉપલબ્ધ છે',
              'છોડ માત્ર રાત્રે જ ખોરાક બનાવશે'
            ],
            correctAnswer: 'કેલ્વિન ચક્રમાં કાર્બનનું સ્થાપન ન થવાથી પ્રકાશસંશ્લેષણ અટકી જશે',
            explanation: 'CO2 વિના RuBisCO ઉત્સેચક કાર્બન ફિક્સેશન કરી શકતો નથી, જેથી ગ્લુકોઝનું નિર્માણ બંધ થઈ જાય છે.',
            difficulty: 'medium',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          },
          {
            id: 'q_gu_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: 'ઊર્જા વાહકો (ATP અને NADPH) નો સંબંધ',
            question: 'પ્રકાશ પ્રક્રિયાઓ અને કેલ્વિન ચક્ર વચ્ચેનો સાચો કાર્યાત્મક સંબંધ કયો છે?',
            options: [
              'પ્રકાશ પ્રક્રિયાઓ ATP અને NADPH બનાવે છે જે કેલ્વિન ચક્રમાં ગ્લુકોઝ બનાવવા વપરાય છે',
              'કેલ્વિન ચક્ર પ્રકાશ ઉત્પન્ન કરે છે જે થાઇલેકોઇડ શોષે છે',
              'બંને પ્રક્રિયાઓ એકબીજા સાથે કોઈ સંબંધ ધરાવતી નથી',
              'કેલ્વિન ચક્ર ઓક્સિજન બનાવે છે જેને પ્રકાશ પ્રક્રિયા વાપરે છે'
            ],
            correctAnswer: 'પ્રકાશ પ્રક્રિયાઓ ATP અને NADPH બનાવે છે જે કેલ્વિન ચક્રમાં ગ્લુકોઝ બનાવવા વપરાય છે',
            explanation: 'થાઇલેકોઇડ પટલમાં ઉત્પન્ન થતી રાસાયણિક ઊર્જા (ATP અને NADPH) સ્ટ્રોમામાં જઈને CO2 ને ગ્લુકોઝમાં ફેરવવા માટે ઊર્જા પૂરી પાડે છે.',
            difficulty: 'hard',
            timestampSeconds: 129,
            timestampFormatted: '02:09'
          },
          {
            id: 'q_gu_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: 'તાપમાન અને ઉત્સેચકોની સક્રિયતા',
            question: 'અત્યંત ઊંચા તાપમાને (ઉદા. 55°C) પ્રકાશસંશ્લેષણનો દર કેમ એકાએક ઘટી જાય છે?',
            options: [
              'RuBisCO જેવા આવશ્યક ઉત્સેચકોનું વિકૃતિકરણ (Denaturation) થઈ જાય છે',
              'પાણીના અણુઓ વિસ્ફોટ પામે છે',
              'હરિતદ્રવ્ય અંધારામાં ફેરવાઈ જાય છે',
              'છોડની કોષદીવાલ ઓગળી જાય છે'
            ],
            correctAnswer: 'RuBisCO જેવા આવશ્યક ઉત્સેચકોનું વિકૃતિકરણ (Denaturation) થઈ જાય છે',
            explanation: 'અતિશય ગરમીને કારણે પ્રોટીન બંધારણ ધરાવતા ઉત્સેચકો વિકૃત થઈ જાય છે, જેથી રાસાયણિક પ્રક્રિયાઓ અટકી જાય છે.',
            difficulty: 'hard',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          }
        ];
      } else if (langCode === 'es') {
        questions = [
          {
            id: 'q_es_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: 'Anatomía del cloroplasto',
            question: '¿En qué estructura específica de las células vegetales ocurren las reacciones dependientes de la luz?',
            options: [
              'En la membrana tilacoidal (Thylakoid)',
              'En el estroma fluido (Stroma)',
              'En la pared celular',
              'En la matriz mitocondrial'
            ],
            correctAnswer: 'En la membrana tilacoidal (Thylakoid)',
            explanation: 'Las reacciones luminosas se localizan en los tilacoides donde los pigmentos de clorofila absorben fotones solares.',
            difficulty: 'easy',
            timestampSeconds: 64,
            timestampFormatted: '01:04'
          },
          {
            id: 'q_es_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: 'Fotólisis del agua',
            question: '¿Cuál es el origen directo del oxígeno (O2) liberado a la atmósfera durante la fotosíntesis?',
            options: [
              'La escisión fotoquímica de las moléculas de agua (H2O)',
              'La descomposición del dióxido de carbono (CO2)',
              'La ruptura enzimática de la glucosa',
              'La respiración celular de la planta'
            ],
            correctAnswer: 'La escisión fotoquímica de las moléculas de agua (H2O)',
            explanation: 'En el fotosistema II, la energía luminosa descompone el agua en protones, electrones y gas oxígeno libre.',
            difficulty: 'medium',
            timestampSeconds: 113,
            timestampFormatted: '01:53'
          },
          {
            id: 'q_es_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'Factores limitantes de la fotosíntesis',
            question: '¿Qué cambio reduciría más directamente la tasa de fotosíntesis en una planta, manteniendo todas las demás condiciones óptimas?',
            options: [
              'Eliminar completamente el dióxido de carbono del aire circundante',
              'Aumentar la humedad relativa del suelo',
              'Proporcionar luz solar continua de longitud de onda roja y azul',
              'Mantener una temperatura ambiente constante de 24°C'
            ],
            correctAnswer: 'Eliminar completamente el dióxido de carbono del aire circundante',
            explanation: 'Sin CO2 como sustrato para la enzima RuBisCO en el ciclo de Calvin, la síntesis de glucosa no puede tener lugar.',
            difficulty: 'medium',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          },
          {
            id: 'q_es_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: 'Interconexión energética (ATP y NADPH)',
            question: '¿Cómo se relacionan funcionalmente las reacciones luminosas con el ciclo de Calvin?',
            options: [
              'Las reacciones luminosas producen ATP y NADPH que impulsan la fijación de carbono en el ciclo de Calvin',
              'El ciclo de Calvin proporciona luz solar a los tilacoides',
              'Ambas fases operan sin intercambiar ninguna molécula intermediaria',
              'El ciclo de Calvin suministra agua para la fotólisis'
            ],
            correctAnswer: 'Las reacciones luminosas producen ATP y NADPH que impulsan la fijación de carbono en el ciclo de Calvin',
            explanation: 'El ATP y el NADPH sintetizados en los tilacoides actúan como portadores de energía química hacia el estroma.',
            difficulty: 'hard',
            timestampSeconds: 129,
            timestampFormatted: '02:09'
          },
          {
            id: 'q_es_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: 'Cinética enzimática de RuBisCO',
            question: '¿Por qué las temperaturas excesivamente altas (por encima de 55°C) causan una caída abrupta en la fotosíntesis?',
            options: [
              'Porque la enzima RuBisCO y las proteínas de la membrana se desnaturalizan térmicamente',
              'Porque los fotones solares se congelan en la superficie de la hoja',
              'Porque el agua se convierte instantáneamente en oxígeno sin electrones',
              'Porque la planta entra en latencia invernal'
            ],
            correctAnswer: 'Porque la enzima RuBisCO y las proteínas de la membrana se desnaturalizan térmicamente',
            explanation: 'Las enzimas son proteínas cuya conformación tridimensional se destruye con el calor extremo, perdiendo su actividad catalítica.',
            difficulty: 'hard',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          }
        ];
      } else {
        // English Photosynthesis Questions
        questions = [
          {
            id: 'q_en_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: 'Chloroplast Anatomy',
            question: 'In eukaryotic plant cells, where do the light-dependent reactions of photosynthesis specifically occur?',
            options: [
              'Thylakoid membranes (Grana)',
              'Chloroplast stroma fluid',
              'Outer cell wall',
              'Inner mitochondrial cristae'
            ],
            correctAnswer: 'Thylakoid membranes (Grana)',
            explanation: 'Light reactions occur within the thylakoid membranes where chlorophyll pigment complexes absorb solar photons.',
            misconceptionExploration: 'Students often confuse stroma and thylakoids; the Calvin cycle takes place in the fluid stroma.',
            difficulty: 'easy',
            timestampSeconds: 64,
            timestampFormatted: '01:04'
          },
          {
            id: 'q_en_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: 'Photolysis & Oxygen Generation',
            question: 'What is the precise chemical origin of the breathable oxygen (O2) gas released into the atmosphere by photosynthesis?',
            options: [
              'The photolytic splitting of water (H2O) molecules in Photosystem II',
              'The breakdown of atmospheric carbon dioxide (CO2)',
              'Enzymatic cleavage of synthesized glucose (C6H12O6)',
              'Phosphate group transfer from ATP'
            ],
            correctAnswer: 'The photolytic splitting of water (H2O) molecules in Photosystem II',
            explanation: 'Light energy excites electrons in Photosystem II, driving the photolysis of H2O into protons, electrons, and free molecular oxygen.',
            misconceptionExploration: 'A classic student misconception is assuming released oxygen comes from CO2. Isotopically verified experiments prove it originates from water.',
            difficulty: 'medium',
            timestampSeconds: 113,
            timestampFormatted: '01:53'
          },
          {
            id: 'q_en_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: 'Limiting Factors of Photosynthesis',
            question: 'Which environmental change would most directly reduce the rate of photosynthesis in a healthy plant, assuming all other conditions remain optimal?',
            options: [
              'Depleting carbon dioxide (CO2) from the surrounding chamber',
              'Providing continuous illumination in the blue and red absorption spectra',
              'Maintaining soil hydration at root capacity',
              'Supplying an ambient temperature of 22°C'
            ],
            correctAnswer: 'Depleting carbon dioxide (CO2) from the surrounding chamber',
            explanation: 'Without CO2, the Calvin cycle is starved of carbon substrate for the enzyme RuBisCO, stopping glucose production completely.',
            difficulty: 'medium',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          },
          {
            id: 'q_en_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: 'Energy Carrier Coupling (ATP & NADPH)',
            question: 'How are the light-dependent reactions biochemically coupled to the Calvin cycle (light-independent reactions)?',
            options: [
              'The light reactions synthesize ATP and NADPH, which supply energy and electrons for carbon fixation in the stroma',
              'The Calvin cycle generates solar photons that activate chlorophyll in the thylakoid membranes',
              'The two phases operate independently without exchanging chemical intermediates',
              'The Calvin cycle synthesizes water, which is transferred to Photosystem I'
            ],
            correctAnswer: 'The light reactions synthesize ATP and NADPH, which supply energy and electrons for carbon fixation in the stroma',
            explanation: 'ATP provides phosphate bond energy and NADPH provides reducing electrons to convert 3-PGA into high-energy G3P sugars.',
            difficulty: 'hard',
            timestampSeconds: 129,
            timestampFormatted: '02:09'
          },
          {
            id: 'q_en_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: 'Enzyme Kinetics & Temperature Denaturation',
            question: 'Why does elevating temperature past 55°C cause an immediate, catastrophic collapse in photosynthetic efficiency even under bright sunlight?',
            options: [
              'Key enzymes such as RuBisCO and membrane transport proteins undergo irreversible thermal denaturation',
              'Water molecules vaporize into explosive gaseous hydrogen inside the cell',
              'Sunlight photons lose their kinetic energy in warm leaf tissue',
              'Plant chloroplasts revert to animal mitochondria'
            ],
            correctAnswer: 'Key enzymes such as RuBisCO and membrane transport proteins undergo irreversible thermal denaturation',
            explanation: 'Photosynthesis relies on specialized enzymatic catalysts. Excessive heat disrupts hydrogen and disulfide bonds in the tertiary protein structure, destroying catalytic capability.',
            difficulty: 'hard',
            timestampSeconds: 149,
            timestampFormatted: '02:29'
          }
        ];
      }
    } else {
      // General concept questions tailored to difficulty and cognitive levels
      const concept1 = conceptMap.concepts[0]?.name || 'Core Principle';
      const concept2 = conceptMap.concepts[1]?.name || 'Mechanisms & Variables';
      const concept3 = conceptMap.concepts[2]?.name || 'Practical Applications';

      if (langCode === 'hi') {
        questions = [
          {
            id: 'q_loc_hi_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: concept1,
            question: `"${title}" में प्रस्तुत ${concept1} का मुख्य शैक्षणिक उद्देश्य क्या है?`,
            options: [
              `${concept1} के मूलभूत सिद्धांतों और तंत्रों को गहराई से समझना`,
              `बिना समझे केवल परिभाषाओं को रटना`,
              `स्थापित वैज्ञानिक सिद्धांतों को खारिज करना`,
              `केवल असंबंधित ऐतिहासिक तथ्यों का संग्रह करना`
            ],
            correctAnswer: `${concept1} के मूलभूत सिद्धांतों और तंत्रों को गहराई से समझना`,
            explanation: `यह पाठ ${concept1} के बुनियादी नियमों और उनकी कार्यप्रणाली को समझाने पर केंद्रित है।`,
            difficulty: 'easy',
            timestampSeconds: 60,
            timestampFormatted: '01:00'
          },
          {
            id: 'q_loc_hi_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: concept2,
            question: `पाठ के अनुसार, ${concept2} में एक कारक के बदलने पर प्रणाली पर क्या प्रभाव पड़ता है?`,
            options: [
              `प्रणाली मूलभूत नियमों के अनुसार पूर्वानुमानित और आनुपातिक रूप से प्रतिक्रिया करती है`,
              `प्रणाली अनियमित और बिना किसी नियम के व्यवहार करती है`,
              `प्रणाली पूरी तरह से अपरिवर्तित रहती है`,
              `सभी भौतिक और तार्किक नियम अप्रभावी हो जाते हैं`
            ],
            correctAnswer: `प्रणाली मूलभूत नियमों के अनुसार पूर्वानुमानित और आनुपातिक रूप से प्रतिक्रिया करती है`,
            explanation: `कारण और प्रभाव के नियम स्पष्ट करते हैं कि जब एक कारक बदलता है, तो तंत्र नियमबद्ध तरीके से प्रतिक्रिया करता है।`,
            difficulty: 'medium',
            timestampSeconds: 120,
            timestampFormatted: '02:00'
          },
          {
            id: 'q_loc_hi_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: concept3,
            question: `व्यावहारिक समस्या-समाधान में ${concept3} को लागू करते समय सबसे महत्वपूर्ण कदम क्या है?`,
            options: [
              `समस्या को संरचित चरणों में विभाजित करना और सीमांत शर्तों (Boundary Conditions) की जांच करना`,
              `बिना विश्लेषण किए प्रारंभिक अनुमान पर भरोसा करना`,
              `समस्या के महत्वपूर्ण चरों की उपेक्षा करना`,
              `सैद्धांतिक आधार को पूरी तरह छोड़ देना`
            ],
            correctAnswer: `समस्या को संरचित चरणों में विभाजित करना और सीमांत शर्तों (Boundary Conditions) की जांच करना`,
            explanation: `सफल अनुप्रयोग के लिए समस्या को तार्किक घटकों में तोड़ना और सीमांत परिस्थितियों की पुष्टि करना आवश्यक है।`,
            difficulty: 'medium',
            timestampSeconds: 180,
            timestampFormatted: '03:00'
          },
          {
            id: 'q_loc_hi_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: concept2,
            question: `कठिन अवधारणाओं का विश्लेषण करते समय, छात्र अक्सर किस भ्रांति (Misconception) का शिकार होते हैं?`,
            options: [
              `सहसंबंध (Correlation) को प्रत्यक्ष कारण (Causation) मान लेना`,
              `प्रायोगिक साक्ष्यों का परीक्षण करना`,
              `सिद्धांतों को वास्तविक उदाहरणों से जोड़ना`,
              `गणितीय सूत्रों की इकाइयों की जांच करना`
            ],
            correctAnswer: `सहसंबंध (Correlation) को प्रत्यक्ष कारण (Causation) मान लेना`,
            explanation: `एक आम छात्र गलती यह मान लेना है कि दो घटनाओं का साथ होना उनके बीच कारण-और-प्रभाव का संबंध सिद्ध करता है।`,
            difficulty: 'hard',
            timestampSeconds: 240,
            timestampFormatted: '04:00'
          },
          {
            id: 'q_loc_hi_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: concept1,
            question: `परीक्षा के दृष्टिकोण से, ${concept1} में महारत हासिल करने के लिए कौन सी अध्ययन रणनीति सबसे प्रभावी है?`,
            options: [
              `सक्रिय स्मरण (Active Recall), अवधारणा मानचित्रण और विविध परिदृश्यों में प्रश्नों का अभ्यास`,
              `केवल नोट्स को निष्क्रिय रूप से पढ़ना`,
              `कठिन प्रश्नों को छोड़ देना`,
              `केवल परिभाषाओं को याद करना`
            ],
            correctAnswer: `सक्रिय स्मरण (Active Recall), अवधारणा मानचित्रण और विविध परिदृश्यों में प्रश्नों का अभ्यास`,
            explanation: `शैक्षणिक शोध साबित करता है कि सक्रिय स्मरण और अवधारणाओं का अभ्यास दीर्घकालिक समझ का निर्माण करता है।`,
            difficulty: 'hard',
            timestampSeconds: 300,
            timestampFormatted: '05:00'
          }
        ];
      } else if (langCode === 'gu') {
        questions = [
          {
            id: 'q_loc_gu_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: concept1,
            question: `"${title}" માં રજૂ થયેલ ${concept1} નો મુખ્ય શૈક્ષણિક હેતુ શું છે?`,
            options: [
              `${concept1} ના મૂળભૂત સિદ્ધાંતો અને પદ્ધતિઓની ઊંડી સમજ મેળવવી`,
              `સમજ્યા વિના માત્ર વ્યાખ્યાઓ ગોખવી`,
              `સ્થાપિત વૈજ્ઞાનિક નિયમોને નકારવા`,
              `અસંબંધિત ઐતિહાસિક તથ્યો એકત્ર કરવા`
            ],
            correctAnswer: `${concept1} ના મૂળભૂત સિદ્ધાંતો અને પદ્ધતિઓની ઊંડી સમજ મેળવવી`,
            explanation: `આ પાઠ ${concept1} ના પાયાના નિયમો અને તેની કાર્યપ્રણાલીને સમજાવવા પર કેન્દ્રિત છે.`,
            difficulty: 'easy',
            timestampSeconds: 60,
            timestampFormatted: '01:00'
          },
          {
            id: 'q_loc_gu_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: concept2,
            question: `પાઠ મુજબ, ${concept2} માં કોઈ પરિબળ બદલાય ત્યારે સિસ્ટમ પર શું અસર થાય છે?`,
            options: [
              `સિસ્ટમ મૂળભૂત નિયમો મુજબ અનુમાનિત અને પ્રમાણસર પ્રતિસાદ આપે છે`,
              `સિસ્ટમ કોઈ પણ નિયમ વિના અવ્યવસ્થિત રીતે વર્તે છે`,
              `સિસ્ટમ સંપૂર્ણપણે અપરિવર્તિત રહે છે`,
              `બધા વૈજ્ઞાનિક સિદ્ધાંતો અપ્રસ્તુત બની જાય છે`
            ],
            correctAnswer: `સિસ્ટમ મૂળભૂત નિયમો મુજબ અનુમાનિત અને પ્રમાણસર પ્રતિસાદ આપે છે`,
            explanation: `કાર્યકારણ સંબંધો સ્પષ્ટ કરે છે કે પરિસ્થિતિ બદલાતા પરિણામ નિયમબદ્ધ રીતે બદલાય છે.`,
            difficulty: 'medium',
            timestampSeconds: 120,
            timestampFormatted: '02:00'
          },
          {
            id: 'q_loc_gu_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: concept3,
            question: `વ્યવહારુ સમસ્યા-નિવારણમાં ${concept3} નો ઉપયોગ કરતી વખતે સૌથી મહત્વપૂર્ણ પગલું કયું છે?`,
            options: [
              `સમસ્યાને તાર્કિક તબક્કાઓમાં વિભાજિત કરવી અને સીમા શરતોની ચકાસણી કરવી`,
              `વિશ્લેષણ વિના માત્ર અનુમાન પર આધાર રાખવો`,
              `મુખ્ય પરિબળોને અવગણવા`,
              `સૈદ્ધાંતિક પાયાને છોડી દેવો`
            ],
            correctAnswer: `સમસ્યાને તાર્કિક તબક્કાઓમાં વિભાજિત કરવી અને સીમા શરતોની ચકાસણી કરવી`,
            explanation: `સફળ ઉપયોગ માટે સમસ્યાને વ્યવસ્થિત ભાગોમાં વિભાજિત કરવી જરૂરી છે.`,
            difficulty: 'medium',
            timestampSeconds: 180,
            timestampFormatted: '03:00'
          },
          {
            id: 'q_loc_gu_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: concept2,
            question: `વિભાવનાઓનું વિશ્લેષણ કરતી વખતે, વિદ્યાર્થીઓ સામાન્ય રીતે કઈ ભૂલ કરે છે?`,
            options: [
              `સહસંબંધ (Correlation) ને પ્રત્યક્ષ કારણ (Causation) માની લેવું`,
              `પ્રાયોગિક પુરાવાઓની ચકાસણી કરવી`,
              `સિદ્ધાંતોને વાસ્તવિક ઉદાહરણો સાથે જોડવા`,
              `ગાણિતિક સૂત્રોના એકમો ચકાસવા`
            ],
            correctAnswer: `સહસંબંધ (Correlation) ને પ્રત્યક્ષ કારણ (Causation) માની લેવું`,
            explanation: `બે ઘટનાઓ સાથે બનવી એનો અર્થ એ નથી કે એક ઘટના બીજી ઘટનાનું પ્રત્યક્ષ કારણ છે.`,
            difficulty: 'hard',
            timestampSeconds: 240,
            timestampFormatted: '04:00'
          },
          {
            id: 'q_loc_gu_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: concept1,
            question: `પરીક્ષાની દ્રષ્ટિએ ${concept1} માં નિપુણતા મેળવવા માટે કઈ પદ્ધતિ સૌથી શ્રેષ્ઠ છે?`,
            options: [
              `સક્રિય સ્મરણ (Active Recall), વિભાવના મેપિંગ અને વિવિધ પરિસ્થિતિઓમાં પ્રશ્નોનો મહાવરો`,
              `માત્ર નોંધોનું નિષ્ક્રિય વાંચન`,
              `અઘરા પ્રશ્નો છોડી દેવા`,
              `માત્ર વ્યાખ્યાઓ યાદ રાખવી`
            ],
            correctAnswer: `સક્રિય સ્મરણ (Active Recall), વિભાવના મેપિંગ અને વિવિધ પરિસ્થિતિઓમાં પ્રશ્નોનો મહાવરો`,
            explanation: `સક્રિય રીતે પ્રશ્નો હલ કરવાથી વિષય પર લાંબા ગાળાનું પ્રભુત્વ આવે છે.`,
            difficulty: 'hard',
            timestampSeconds: 300,
            timestampFormatted: '05:00'
          }
        ];
      } else if (langCode === 'es') {
        questions = [
          {
            id: 'q_loc_es_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: concept1,
            question: `¿Cuál es el objetivo de aprendizaje central abordado en "${title}" respecto a ${concept1}?`,
            options: [
              `Dominar los principios fundamentales y los mecanismos analíticos de ${concept1}`,
              `Memorizar términos aislados sin comprender su funcionamiento`,
              `Refutar principios científicos empíricos sin evidencia`,
              `Limitarse a hechos históricos no aplicables`
            ],
            correctAnswer: `Dominar los principios fundamentales y los mecanismos analíticos de ${concept1}`,
            explanation: `La presentación enfatiza el entendimiento de los mecanismos causales de ${concept1}.`,
            difficulty: 'easy',
            timestampSeconds: 60,
            timestampFormatted: '01:00'
          },
          {
            id: 'q_loc_es_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: concept2,
            question: `Según la lección, ¿cómo responde el sistema cuando se modifica una variable clave en ${concept2}?`,
            options: [
              `Responde de manera proporcional y predecible siguiendo leyes fundamentales`,
              `Actúa de forma caótica sin relación causa-efecto`,
              `Permanece absolutamente inmutable`,
              `Viola los principios de conservación establecidos`
            ],
            correctAnswer: `Responde de manera proporcional y predecible siguiendo leyes fundamentales`,
            explanation: `Los principios gobernantes determinan una respuesta estructurada y predecible ante cambios en los parámetros.`,
            difficulty: 'medium',
            timestampSeconds: 120,
            timestampFormatted: '02:00'
          },
          {
            id: 'q_loc_es_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: concept3,
            question: `Al aplicar ${concept3} en la resolución de problemas reales, ¿qué práctica es indispensable?`,
            options: [
              `Descomponer el problema en etapas estructuradas y verificar condiciones de contorno`,
              `Confiar únicamente en intuiciones sin análisis riguroso`,
              `Ignorar variables dependientes e independientes`,
              `Descartar el marco teórico formal`
            ],
            correctAnswer: `Descomponer el problema en etapas estructuradas y verificar condiciones de contorno`,
            explanation: `La descomposición sistemática asegura una aplicación correcta de los conceptos.`,
            difficulty: 'medium',
            timestampSeconds: 180,
            timestampFormatted: '03:00'
          },
          {
            id: 'q_loc_es_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: concept2,
            question: `Al analizar problemas complejos, ¿qué error conceptual común deben evitar los estudiantes?`,
            options: [
              `Confundir correlación con causalidad directa`,
              `Verificar empíricamente las hipótesis`,
              `Comprobar las unidades de medida en fórmulas`,
              `Conectar la teoría con ejemplos prácticos`
            ],
            correctAnswer: `Confundir correlación con causalidad directa`,
            explanation: `La presencia simultánea de dos variables no implica que una sea la causa directa de la otra sin un mecanismo comprobado.`,
            difficulty: 'hard',
            timestampSeconds: 240,
            timestampFormatted: '04:00'
          },
          {
            id: 'q_loc_es_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: concept1,
            question: `Desde una perspectiva de preparación para exámenes, ¿qué estrategia garantiza retener ${concept1}?`,
            options: [
              `Recuperación activa (Active Recall), elaboración de mapas conceptuales y práctica con diversos escenarios`,
              `Lectura pasiva de apuntes sin autoevaluación`,
              `Evitar problemas desafiantes`,
              `Memorizar definiciones sin contextualizarlas`
            ],
            correctAnswer: `Recuperación activa (Active Recall), elaboración de mapas conceptuales y práctica con diversos escenarios`,
            explanation: `Poner a prueba la comprensión mediante preguntas activas refuerza las conexiones cognitivas a largo plazo.`,
            difficulty: 'hard',
            timestampSeconds: 300,
            timestampFormatted: '05:00'
          }
        ];
      } else {
        // English General Questions
        questions = [
          {
            id: 'q_loc_en_1',
            type: 'mcq',
            cognitiveLevel: 'level_1_recall',
            conceptName: concept1,
            question: `What is the core pedagogical foundation investigated in "${title}" regarding ${concept1}?`,
            options: [
              `Mastering the foundational mechanisms and structural relationships of ${concept1}`,
              `Rote memorization of jargon without understanding underlying causal laws`,
              `Arbitrary historical trivia disconnected from practical problem-solving`,
              `Disproving verified empirical principles without demonstration`
            ],
            correctAnswer: `Mastering the foundational mechanisms and structural relationships of ${concept1}`,
            explanation: `The lesson is built around establishing rigorous mental models and core mechanisms of ${concept1}.`,
            difficulty: 'easy',
            timestampSeconds: 60,
            timestampFormatted: '01:00'
          },
          {
            id: 'q_loc_en_2',
            type: 'mcq',
            cognitiveLevel: 'level_2_understanding',
            conceptName: concept2,
            question: `According to the lesson, how does the system respond when a governing parameter in ${concept2} is altered?`,
            options: [
              `The system responds predictably in direct accordance with fundamental cause-and-effect laws`,
              `The system acts randomly without correlation to the initial inputs`,
              `The outcome is completely unaffected by any variable shifts`,
              `All physical and analytical boundaries immediately collapse`
            ],
            correctAnswer: `The system responds predictably in direct accordance with fundamental cause-and-effect laws`,
            explanation: `Analytical mechanisms dictate that modifying an input parameter produces a proportional, predictable outcome.`,
            difficulty: 'medium',
            timestampSeconds: 120,
            timestampFormatted: '02:00'
          },
          {
            id: 'q_loc_en_3',
            type: 'mcq',
            cognitiveLevel: 'level_3_application',
            conceptName: concept3,
            question: `When applying ${concept3} to solve novel real-world problems, which analytical practice is essential?`,
            options: [
              `Decomposing the problem into structured steps and evaluating boundary conditions`,
              `Relying purely on initial intuition without validating governing equations`,
              `Ignoring independent variables to simplify the scenario arbitrarily`,
              `Discarding the theoretical framework entirely`
            ],
            correctAnswer: `Decomposing the problem into structured steps and evaluating boundary conditions`,
            explanation: `Problem decomposition and validating constraints are essential to applying theoretical principles reliably.`,
            difficulty: 'medium',
            timestampSeconds: 180,
            timestampFormatted: '03:00'
          },
          {
            id: 'q_loc_en_4',
            type: 'mcq',
            cognitiveLevel: 'level_4_analysis',
            conceptName: concept2,
            question: `When analyzing complex multi-variable scenarios, which common student pitfall must be guarded against?`,
            options: [
              `Confusing empirical correlation with true direct causation`,
              `Verifying empirical claims with test data`,
              `Checking unit dimensional consistency in formulas`,
              `Connecting abstract theory with concrete case studies`
            ],
            correctAnswer: `Confusing empirical correlation with true direct causation`,
            explanation: `Assuming that two simultaneous observations are causally linked without establishing the mediating mechanism is a frequent error.`,
            difficulty: 'hard',
            timestampSeconds: 240,
            timestampFormatted: '04:00'
          },
          {
            id: 'q_loc_en_5',
            type: 'mcq',
            cognitiveLevel: 'level_5_exam_reasoning',
            conceptName: concept1,
            question: `From an exam preparation standpoint, which active learning method most effectively secures mastery of ${concept1}?`,
            options: [
              `Active recall, concept mapping, and practicing questions across diverse scenarios`,
              `Passive reading of notes without self-assessment`,
              `Skipping difficult analytical problems`,
              `Memorizing isolated keywords without relational context`
            ],
            correctAnswer: `Active recall, concept mapping, and practicing questions across diverse scenarios`,
            explanation: `Active self-testing and solving novel variations ensures deep conceptual encoding rather than fragile superficial familiarity.`,
            difficulty: 'hard',
            timestampSeconds: 300,
            timestampFormatted: '05:00'
          }
        ];
      }
    }

    return {
      title: `${title} — Exam Practice Quiz`,
      difficulty,
      language: langCode,
      conceptMap,
      questions: questions.slice(0, count)
    };
  }

  private static parseJsonSafely<T>(str: string): T | null {
    if (!str || typeof str !== 'string') return null;
    let clean = str.trim();

    // Remove markdown code fences if any
    if (clean.startsWith('```json')) {
      clean = clean.slice(7);
    } else if (clean.startsWith('```')) {
      clean = clean.slice(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.slice(0, -3);
    }
    clean = clean.trim();

    try {
      return JSON.parse(clean) as T;
    } catch {
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(clean.slice(firstBrace, lastBrace + 1)) as T;
        } catch {
          // ignore
        }
      }

      const firstBracket = clean.indexOf('[');
      const lastBracket = clean.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(clean.slice(firstBracket, lastBracket + 1)) as T;
        } catch {
          // ignore
        }
      }
      return null;
    }
  }
}
