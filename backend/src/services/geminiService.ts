import { GoogleGenAI } from '@google/genai';
import {
  Chapter,
  Flashcard,
  ImportantDefinition,
  QuizData,
  QuizQuestion,
  SummaryData,
  TranscriptSegment
} from '../types/index.js';
import { ChunkingService } from './chunkingService.js';
import { DEMO_VIDEOS } from './demoData.js';
import { ConceptAnalysisEngine } from './conceptAnalysisEngine.js';
import { CurriculumKnowledgeBank } from './curriculumKnowledgeBank.js';

export class GeminiService {
  private static getClient(userApiKey?: string): GoogleGenAI | null {
    const key = userApiKey || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '' || key.startsWith('your_') || key === 'PLACEHOLDER') {
      return null;
    }
    return new GoogleGenAI({ apiKey: key.trim() });
  }

  private static getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  /**
   * Generates a comprehensive summary with all 7 requested sections.
   */
  static async generateSummary(params: {
    videoId: string;
    videoUrl?: string;
    title: string;
    transcript: TranscriptSegment[];
    language?: string;
    apiKey?: string;
  }): Promise<SummaryData> {
    const { videoId, videoUrl, title, transcript, language = 'en', apiKey } = params;

    // Check if it's a known demo video
    if (DEMO_VIDEOS[videoId] && (!apiKey && !process.env.GEMINI_API_KEY)) {
      return DEMO_VIDEOS[videoId].summary;
    }

    const client = this.getClient(apiKey);
    const fullText = transcript.map(t => t.text).join(' ');
    const effectiveVideoUrl = videoUrl || (videoId && !videoId.startsWith('demo-') ? `https://www.youtube.com/watch?v=${videoId}` : undefined);

    if (client) {
      try {
        const prompt = `You are an elite educational AI assistant.
Analyze this video: "${title}" (URL: ${effectiveVideoUrl || 'N/A'}).
Output Language: "${language}" (e.g. English, Hindi, Gujarati, Spanish, French, etc.). Translate all generated content to this target language if not English.

Generate a JSON object strictly following this structure:
{
  "shortSummary": "A concise 2-3 paragraph overview highlighting the core essence of the video.",
  "detailedSummary": "A comprehensive multi-paragraph explanation covering all major arguments, findings, and concepts.",
  "keyPoints": ["Array of 5-8 crucial bullet points highlighting the most important facts"],
  "studyNotes": "Extensive, beautifully formatted Markdown notes with H1, H2, H3 headers, bullet points, math/formulas if any, and clear callouts.",
  "importantDefinitions": [
    {
      "term": "Technical term or difficult concept",
      "definition": "Formal educational definition",
      "simpleExplanation": "Layman / intuitive explanation suitable for a middle-school student"
    }
  ],
  "keyTakeaways": ["Array of 3-5 core philosophical or practical lessons learned"],
  "chapters": [
    {
      "title": "Topic name",
      "timestamp": "mm:ss",
      "seconds": 120,
      "summary": "Brief 1-line description of what is discussed in this segment"
    }
  ],
  "language": "${language}"
}

Transcript & Content Information:
"""
${fullText.slice(0, 45000)}
"""

Ensure the output is ONLY valid JSON without markdown fences.`;

        let outputText = '';
        try {
          const res = await client.models.generateContent({
            model: this.getModelName(),
            contents: prompt
          });
          outputText = res.text || '';
        } catch (modelsErr) {
          try {
            const res = await client.interactions.create({
              model: this.getModelName(),
              input: prompt
            });
            outputText = res.output_text || '';
          } catch (interactionsErr) {
            console.warn('Gemini generateContent & interactions failed:', modelsErr);
          }
        }

        if (outputText) {
          const parsed = this.parseJsonSafely<SummaryData>(outputText);
          if (parsed && parsed.shortSummary && parsed.studyNotes) {
            return {
              ...parsed,
              language
            };
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed or timed out, falling back to local synthesizer:', err);
      }
    }

    // Heuristic & Local Synthesizer Fallback
    return this.synthesizeSummaryLocally(title, transcript, language);
  }

  /**
   * Generates an exam-oriented quiz based on deep concept analysis and cognitive levels.
   */
  static async generateQuiz(params: {
    videoId: string;
    videoUrl?: string;
    title: string;
    transcript: TranscriptSegment[];
    difficulty?: 'easy' | 'medium' | 'hard';
    count?: number;
    language?: string;
    apiKey?: string;
  }): Promise<QuizData> {
    return ConceptAnalysisEngine.generateConceptQuiz(params);
  }

  /**
   * Generates targeted adaptive practice questions for concepts where student had difficulties.
   */
  static async generatePracticeQuestions(params: {
    videoId?: string;
    title: string;
    weakConcepts: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    language?: string;
    apiKey?: string;
  }): Promise<QuizQuestion[]> {
    return ConceptAnalysisEngine.generateAdaptivePracticeQuestions(params);
  }

  /**
   * Generates interactive flashcards with concepts and explanations.
   */
  static async generateFlashcards(params: {
    videoId: string;
    title: string;
    transcript: TranscriptSegment[];
    count?: number;
    apiKey?: string;
  }): Promise<Flashcard[]> {
    const { videoId, title, transcript, count = 6, apiKey } = params;

    if (DEMO_VIDEOS[videoId] && (!apiKey && !process.env.GEMINI_API_KEY)) {
      return DEMO_VIDEOS[videoId].flashcards;
    }

    const client = this.getClient(apiKey);
    const fullText = transcript.map(t => t.text).join(' ');

    if (client) {
      try {
        const prompt = `Based on the video transcript for "${title}", generate ${count} high-yield study flashcards.
Schema:
[
  {
    "id": "fc1",
    "front": "Key concept, formula, or probing question",
    "back": "Clear, memorable answer or explanation",
    "category": "Topic tag (e.g. Core Concept, Definition, Application)"
  }
]

Transcript:
"""
${fullText.slice(0, 35000)}
"""

Return ONLY JSON array.`;

        const response = await client.interactions.create({
          model: this.getModelName(),
          input: prompt
        });

        const parsed = this.parseJsonSafely<Flashcard[]>(response.output_text || '');
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((fc, i) => ({
            id: fc.id || `fc_${i + 1}`,
            front: fc.front,
            back: fc.back,
            category: fc.category || 'Study Concept'
          }));
        }
      } catch (err) {
        console.warn('Gemini Flashcards generation failed, using fallback:', err);
      }
    }

    return this.synthesizeFlashcardsLocally(title, transcript, count);
  }

  /**
   * Interactive Assistant grounded in the transcript.
   */
  static async answerQuestion(params: {
    title: string;
    transcript: TranscriptSegment[];
    question: string;
    chatHistory?: { role: 'user' | 'assistant'; content: string }[];
    apiKey?: string;
  }): Promise<{ answer: string; groundedInVideo: boolean }> {
    const { title, transcript, question, chatHistory = [], apiKey } = params;
    const client = this.getClient(apiKey);
    const fullText = transcript.map(t => t.text).join(' ');

    if (client) {
      try {
        const historyContext = chatHistory
          .slice(-6)
          .map(m => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n');

        const prompt = `You are the StudyTube AI Senior Academic Tutor for the video "${title}".
Your mission is to guide students through deep concept comprehension, pedagogical first-principles explanations, and misconception remediation based on the VIDEO TRANSCRIPT.

${CurriculumKnowledgeBank.getPedagogicalTrainingPrompt()}

PEDAGOGICAL TUTORING INSTRUCTIONS:
1. Always ground your explanation in the core concepts, mechanisms, and formulas taught in the transcript.
2. If mathematical or scientific principles are involved, explain the underlying mechanism step-by-step with clear variables and units.
3. If the user expresses a misconception, gently deconstruct why that misconception occurs and clarify the accurate scientific/mathematical truth.
4. If the question asks about something NOT in the video transcript, explicitly state:
"This topic was not covered in the video, but as general educational context: [clear explanation]".
5. Keep explanations warm, structured, and pedagogical (use bullet points or bold headers when clarifying complex steps).

Recent Conversation:
${historyContext}

User Question: "${question}"

Transcript Reference:
"""
${fullText.slice(0, 40000)}
"""`;

        const response = await client.interactions.create({
          model: this.getModelName(),
          input: prompt
        });

        const answer = response.output_text || "I couldn't process an answer at this moment.";
        const isGrounded = !answer.includes('This topic was not covered in the video');

        return {
          answer,
          groundedInVideo: isGrounded
        };
      } catch (err) {
        console.warn('Gemini Assistant Q&A failed, falling back:', err);
      }
    }

    // Heuristic assistant response
    return this.synthesizeAssistantLocally(title, fullText, question);
  }

  // ===================== FALLBACK LOCAL SYNTHESIZERS =====================

  private static extractSubjectFromTitle(title: string): string {
    let clean = title
      .replace(/\|.*$/g, '')
      .replace(/-.*$/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    clean = clean
      .replace(/^(learn|intro to|introduction to|how to|what is|understanding|mastering|the history of)\s+/i, '')
      .replace(/\s+(full course|tutorial|for beginners|crash course|explained|lecture|guide|walkthrough)$/i, '')
      .trim();

    return clean.length > 2 ? clean : title;
  }

  private static synthesizeSummaryLocally(
    title: string,
    transcript: TranscriptSegment[],
    language: string
  ): SummaryData {
    const subject = this.extractSubjectFromTitle(title);
    const fullText = transcript.map(t => t.text).join(' ');
    const sentences = fullText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);

    const firstSentences = sentences.slice(0, 3).join('. ') + '.';
    const midSentences = sentences.slice(3, 7).join('. ') + '.';
    const shortSummary = `This video, "${title}", provides an informative overview of ${subject}. ${firstSentences} ${midSentences}`;

    const detailedSummary = `"${title}" covers foundational principles and step-by-step insights regarding ${subject}.\n\n` +
      `In the opening section, the presenter sets the stage: ${sentences.slice(0, 4).join('. ')}.\n\n` +
      `Moving into the central discussion: ${sentences.slice(4, 9).join('. ')}.\n\n` +
      `Concluding remarks emphasize practical takeaways: ${sentences.slice(9, 14).join('. ')}.`;

    const keyPoints = sentences.slice(0, 6).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    if (keyPoints.length === 0) {
      keyPoints.push(`Core exploration of ${subject} presented in "${title}"`);
    }

    // Chapters from segments
    const chapters: Chapter[] = [];
    const step = Math.max(1, Math.floor(transcript.length / 4));
    for (let i = 0; i < transcript.length && chapters.length < 5; i += step) {
      const seg = transcript[i];
      chapters.push({
        title: `Chapter ${chapters.length + 1}: ${seg.text.slice(0, 40)}...`,
        timestamp: ChunkingService.formatTimestamp(seg.start),
        seconds: seg.start,
        summary: seg.text.slice(0, 85) + '...'
      });
    }

    const studyNotes = `# Study Notes: ${title}

## 1. Overview & Context
* **Subject**: Educational breakdown of ${subject}
* **Main Premise**: ${firstSentences}

## 2. Key Conceptual Framework
${sentences.slice(2, 6).map(s => `* **Insight**: ${s}`).join('\n')}

## 3. Deep Dive & Mechanisms
* The presenter breaks down critical mechanisms of ${subject}:
  * ${sentences[6] || 'Foundational principles are introduced.'}
  * ${sentences[7] || 'Step-by-step applications.'}
  * ${sentences[8] || 'Important considerations and common misconceptions.'}

## 4. Practical Takeaways
* Focus on understanding underlying mechanisms of ${subject} rather than rote memorization.
* Review key definitions and practice applying concepts to real scenarios.
`;

    const importantDefinitions: ImportantDefinition[] = [
      {
        term: subject,
        definition: `The primary subject investigated in "${title}".`,
        simpleExplanation: 'The main big idea you should remember after watching this video.'
      },
      {
        term: 'Key Mechanism',
        definition: 'The structured sequence of operations or logical arguments highlighted.',
        simpleExplanation: 'How the concepts work together to produce the final outcome.'
      }
    ];

    const keyTakeaways = [
      `Mastering ${subject} in "${title}" requires grasping foundational vocabulary and cause-and-effect relationships.`,
      `Break down complex procedures into distinct algorithmic or conceptual phases.`,
      `Active recall and quiz testing reinforce long-term understanding.`
    ];

    return {
      shortSummary,
      detailedSummary,
      keyPoints,
      studyNotes,
      importantDefinitions,
      keyTakeaways,
      chapters,
      language
    };
  }

  private static synthesizeQuizLocally(
    title: string,
    transcript: TranscriptSegment[],
    difficulty: 'easy' | 'medium' | 'hard',
    count: number
  ): QuizData {
    const subject = this.extractSubjectFromTitle(title);
    const sentences = transcript
      .map(t => t.text.trim())
      .filter(t => t.length > 25);

    const questions: QuizQuestion[] = [];

    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      const s = sentences[i];
      const words = s.split(' ');
      const keyPhrase = words.slice(0, 5).join(' ');

      if (i % 2 === 0) {
        questions.push({
          id: `local_q_${i + 1}`,
          type: 'mcq',
          question: `According to the video "${title}", what is discussed regarding "${keyPhrase}..."?`,
          options: [
            s,
            `It contradicts the core premise of ${subject}`,
            `It is an irrelevant historical anomaly`,
            `It occurs only under simulated artificial conditions`
          ],
          correctAnswer: s,
          explanation: `In the video, the speaker explicitly notes: "${s}".`,
          difficulty
        });
      } else {
        questions.push({
          id: `local_q_${i + 1}`,
          type: 'true_false',
          question: `True or False: According to "${title}", the presenter explains: "${s}"?`,
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: `This is directly supported by the video content for "${title}".`,
          difficulty
        });
      }
    }

    // Supplementary customized templates strictly referencing the video subject
    const subjectTemplates = [
      {
        question: `What is the central learning objective explored in "${title}"?`,
        type: 'mcq' as const,
        options: [
          `Mastering the foundational principles and practical mechanisms of ${subject}`,
          `Historical trivia unrelated to practical applications of ${subject}`,
          `Disproving established empirical formulas`,
          `Memorizing random terms without understanding how ${subject} works`
        ],
        correctAnswer: `Mastering the foundational principles and practical mechanisms of ${subject}`,
        explanation: `The presentation focuses on developing rigorous conceptual understanding and core mechanisms of ${subject}.`
      },
      {
        question: `True or False: According to "${title}", breaking down complex problems in ${subject} into structured steps is critical for deep understanding.`,
        type: 'true_false' as const,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: `Systematic problem decomposition is a core teaching strategy highlighted in the lecture.`
      },
      {
        question: `Which methodology is emphasized for retaining the concepts of ${subject} presented in "${title}"?`,
        type: 'mcq' as const,
        options: [
          `Active recall, review of key definitions, and practice questions on ${subject}`,
          `Passive scanning without testing comprehension`,
          `Skipping theoretical foundations of ${subject} entirely`,
          `Ignoring real-world examples and edge cases`
        ],
        correctAnswer: `Active recall, review of key definitions, and practice questions on ${subject}`,
        explanation: `Educational mastery requires testing yourself and reinforcing key definitions.`
      },
      {
        question: `How does "${title}" recommend evaluating difficult concepts in ${subject}?`,
        type: 'mcq' as const,
        options: [
          `By connecting abstract theories directly to concrete examples and mechanisms`,
          `By assuming all initial models are completely infallible`,
          `By memorizing formulas without understanding their variables`,
          `By discarding empirical observations`
        ],
        correctAnswer: `By connecting abstract theories directly to concrete examples and mechanisms`,
        explanation: `Bridging theory with practical examples solidifies long-term comprehension.`
      },
      {
        question: `True or False: The principles of ${subject} discussed in "${title}" can be applied to solve real-world problems.`,
        type: 'true_false' as const,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: `The lecture explicitly highlights practical applicability and real-world relevance of ${subject}.`
      }
    ];

    let templateIdx = 0;
    while (questions.length < count && templateIdx < subjectTemplates.length) {
      const tmpl = subjectTemplates[templateIdx];
      questions.push({
        id: `local_q_${questions.length + 1}`,
        type: tmpl.type,
        question: tmpl.question,
        options: tmpl.options,
        correctAnswer: tmpl.correctAnswer,
        explanation: tmpl.explanation,
        difficulty
      });
      templateIdx++;
    }

    if (questions.length === 0) {
      questions.push({
        id: 'q_default',
        type: 'true_false',
        question: `True or False: The presentation provides structured explanations for ${title}?`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: `The video provides comprehensive study content for ${subject}.`,
        difficulty: 'easy'
      });
    }

    return {
      title: `${title} Quiz`,
      difficulty,
      questions: questions.slice(0, count)
    };
  }

  private static synthesizeFlashcardsLocally(
    title: string,
    transcript: TranscriptSegment[],
    count: number
  ): Flashcard[] {
    const flashcards: Flashcard[] = [];
    const step = Math.max(1, Math.floor(transcript.length / count));

    for (let i = 0; i < transcript.length && flashcards.length < count; i += step) {
      const seg = transcript[i];
      flashcards.push({
        id: `fc_local_${flashcards.length + 1}`,
        front: `What key concept is introduced at ${ChunkingService.formatTimestamp(seg.start)}?`,
        back: seg.text,
        category: 'Video Concept'
      });
    }

    return flashcards;
  }

  private static synthesizeAssistantLocally(
    title: string,
    fullText: string,
    question: string
  ): { answer: string; groundedInVideo: boolean } {
    const lowerQuestion = question.toLowerCase();
    const queryTokens = lowerQuestion.split(/\s+/).filter(w => w.length > 3);

    // Search for matches in transcript

    // 2. Search for matches in transcript
    const sentences = fullText.split(/[.!?]+/).map(s => s.trim());
    const matched = sentences.filter(s => {
      const lower = s.toLowerCase();
      return queryTokens.some(tok => lower.includes(tok));
    });

    if (matched.length > 0) {
      return {
        answer: `Based on the video "${title}", here is what is discussed regarding your question:\n\n` +
          `• "${matched.slice(0, 3).join('. ')}."\n\n` +
          `To summarize in simple terms: the video explains how this concept operates and relates directly to the overall lecture objectives.`,
        groundedInVideo: true
      };
    }

    return {
      answer: `This specific aspect was not explicitly detailed in the video transcript for "${title}". However, based on the broader context of the topic: it relates to the fundamentals discussed in the lecture. Feel free to ask about specific concepts or definitions mentioned in the video!`,
      groundedInVideo: false
    };
  }

  private static parseJsonSafely<T>(str: string): T | null {
    if (!str) return null;
    try {
      // Remove possible markdown code block fences ```json ... ```
      const cleaned = str
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      // Try to extract JSON object or array with regex
      const match = str.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[1]) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
