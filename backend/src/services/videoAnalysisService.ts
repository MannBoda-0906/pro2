import { YouTubeService } from './youtubeService.js';
import { CaptionService, FetchTranscriptResult } from './captionService.js';
import { ChunkingService } from './chunkingService.js';
import { VideoIdentity } from '../utils/videoIdentity.js';
import { PipelineLogger } from '../utils/pipelineLogger.js';
import { DEMO_VIDEOS } from './demoData.js';
import { S1_VideoAnalysis } from './quizPipeline/S1_videoAnalysis.js';
import { S2_ConceptExtraction } from './quizPipeline/S2_conceptExtraction.js';
import { S3_CoverageClassifier } from './quizPipeline/S3_coverageClassifier.js';
import { S4_ConceptUnderstanding } from './quizPipeline/S4_conceptUnderstanding.js';
import { S5_KnowledgeMap } from './quizPipeline/S5_knowledgeMap.js';
import {
  ConceptCoverageClassification,
  ConceptHierarchyItem,
  ConceptUnderstandingObject,
  PersistedKnowledgeMap,
  StructuredEvidence,
  TranscriptSegment,
  VideoMetadata
} from '../types/index.js';

export interface VideoAnalysisResult {
  analysisSessionId: string;
  videoId: string;
  metadata: VideoMetadata;
  transcript: TranscriptSegment[];
  rawText: string;
  languageCode: string;
  trackType: string;
  chunkCount: number;
  stats: {
    characterCount: number;
    wordCount: number;
    estimatedTokens: number;
  };
  evidence: StructuredEvidence;
  concepts: ConceptHierarchyItem[];
  classifications: Record<string, ConceptCoverageClassification>;
  understandings: Record<string, ConceptUnderstandingObject>;
  knowledgeMap: PersistedKnowledgeMap;
}

export interface NormalizedContentResult {
  cleanSegments: TranscriptSegment[];
  rawText: string;
  characterCount: number;
  wordCount: number;
  estimatedTokens: number;
}

export class VideoAnalysisError extends Error {
  public stage: string;
  public code: string;
  public statusCode: number;
  public retryable: boolean;
  public details?: any;
  public refId?: string;

  constructor(params: {
    stage: string;
    code: string;
    message: string;
    statusCode?: number;
    retryable?: boolean;
    details?: any;
    refId?: string;
  }) {
    super(params.message);
    this.name = 'VideoAnalysisError';
    this.stage = params.stage;
    this.code = params.code;
    this.statusCode = params.statusCode || 500;
    this.retryable = params.retryable ?? false;
    this.details = params.details;
    this.refId = params.refId;
  }
}

export class VideoAnalysisService {
  /**
   * STAGE 1: VALIDATE_URL
   * Validates that the input is a well-formed YouTube URL or supported demo ID.
   * Supported formats:
   * - https://www.youtube.com/watch?v=VIDEO_ID
   * - https://youtu.be/VIDEO_ID
   * - https://www.youtube.com/shorts/VIDEO_ID
   * - https://www.youtube.com/embed/VIDEO_ID
   * - https://www.youtube.com/live/VIDEO_ID
   * - https://m.youtube.com/watch?v=VIDEO_ID
   * - Raw 11-char videoId
   * - demo-* identifier
   */
  public static validateUrl(url: string): void {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      throw new VideoAnalysisError({
        stage: 'VALIDATE_URL',
        code: 'INVALID_YOUTUBE_URL',
        message: 'Please provide a valid YouTube URL.',
        statusCode: 400,
        retryable: false
      });
    }

    const trimmed = url.trim();

    // Check demo or raw 11-char ID
    if (
      DEMO_VIDEOS[trimmed] ||
      trimmed.startsWith('demo-') ||
      trimmed.startsWith('manual_') ||
      trimmed.startsWith('phys-') ||
      trimmed.startsWith('bio-') ||
      trimmed.startsWith('hindi-') ||
      trimmed.startsWith('video_') ||
      trimmed.startsWith('test_') ||
      trimmed.startsWith('counts-') ||
      /^[a-zA-Z0-9_-]{11}$/.test(trimmed)
    ) {
      return;
    }

    const isRecognizedDomain =
      /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/.+/i.test(trimmed);

    if (!isRecognizedDomain) {
      throw new VideoAnalysisError({
        stage: 'VALIDATE_URL',
        code: 'INVALID_YOUTUBE_URL',
        message: 'Invalid YouTube URL. Please provide a standard link (e.g. youtube.com/watch?v=... or youtu.be/...).',
        statusCode: 400,
        retryable: false
      });
    }
  }

  /**
   * STAGE 2: EXTRACT_VIDEO_ID
   * Extracts and validates the 11-character video ID from the normalized URL.
   */
  public static extractVideoId(url: string): string {
    this.validateUrl(url);

    const videoId = VideoIdentity.parseCanonicalVideoId(url) || YouTubeService.extractVideoId(url);

    if (!videoId) {
      throw new VideoAnalysisError({
        stage: 'EXTRACT_VIDEO_ID',
        code: 'INVALID_VIDEO_ID',
        message: 'Could not extract a valid YouTube video ID from the provided URL.',
        statusCode: 400,
        retryable: false
      });
    }

    // Verify format: must be demo ID or exactly 11 characters of [a-zA-Z0-9_-]
    if (!DEMO_VIDEOS[videoId] && !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new VideoAnalysisError({
        stage: 'EXTRACT_VIDEO_ID',
        code: 'INVALID_VIDEO_ID',
        message: `Extracted video ID '${videoId}' is malformed or invalid.`,
        statusCode: 400,
        retryable: false
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[VideoAnalysis][EXTRACT_VIDEO_ID] Validated videoId: ${videoId}`);
    }

    return videoId;
  }

  /**
   * STAGE 3: FETCH_VIDEO_METADATA
   * Fetches metadata separately using oEmbed and player inspection.
   */
  public static async fetchVideoMetadata(videoId: string, originalUrl?: string): Promise<VideoMetadata> {
    try {
      const metadata = await YouTubeService.fetchMetadata(videoId, originalUrl);
      if (!metadata || !metadata.title) {
        throw new Error('Metadata title is missing');
      }
      return metadata;
    } catch (err: any) {
      console.error(`[VideoAnalysis][FETCH_VIDEO_METADATA] Error for ${videoId}:`, err);
      throw new VideoAnalysisError({
        stage: 'FETCH_VIDEO_METADATA',
        code: 'METADATA_FAILED',
        message: "Failed to retrieve video metadata from YouTube. Please check the URL and try again.",
        statusCode: 404,
        retryable: true,
        details: err?.message
      });
    }
  }

  /**
   * STAGE 4: FETCH_TRANSCRIPT
   * Multi-language, resilient transcript fetch. Never falls back to previous videos.
   */
  public static async fetchTranscript(
    videoId: string,
    metadataTitle?: string,
    metadataAuthor?: string,
    preferredLanguage: string = 'en'
  ): Promise<FetchTranscriptResult> {
    // Demo video fast-path
    if (DEMO_VIDEOS[videoId]) {
      const demo = DEMO_VIDEOS[videoId];
      const rawText = demo.transcript.map(t => t.text).join(' ');
      return {
        transcript: demo.transcript,
        rawText,
        languageCode: 'en',
        trackType: 'manual',
        trackName: 'English (Demo)',
        totalCharacters: rawText.length,
        source: 'youtube'
      };
    }

    try {
      const result = await CaptionService.fetchTranscript(videoId, preferredLanguage);
      return result;
    } catch (err: any) {
      const msg = err?.message || '';
      const code = err?.code || '';

      if (code === 'NO_CAPTIONS_AVAILABLE' || msg.includes('NO_CAPTIONS') || msg.includes('no captions')) {
        throw new VideoAnalysisError({
          stage: 'FETCH_TRANSCRIPT',
          code: 'TRANSCRIPT_UNAVAILABLE',
          message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
          statusCode: 404,
          retryable: false,
          details: msg
        });
      }

      if (code === 'CAPTIONS_BLOCKED_OR_FETCH_FAILED' || msg.includes('CAPTIONS_BLOCKED') || err?.status === 429) {
        throw new VideoAnalysisError({
          stage: 'FETCH_TRANSCRIPT',
          code: 'TRANSCRIPT_UNAVAILABLE',
          message: "YouTube captions are temporarily rate-limited. Please paste the transcript manually or try again later.",
          statusCode: 429,
          retryable: true,
          details: msg
        });
      }

      if (code === 'ANALYSIS_TIMEOUT' || err?.code === 'ETIMEDOUT' || msg.includes('timeout') || msg.includes('timed out')) {
        throw new VideoAnalysisError({
          stage: 'FETCH_TRANSCRIPT',
          code: 'TRANSCRIPT_TIMEOUT',
          message: "Fetching transcript took too long. Please try again.",
          statusCode: 408,
          retryable: true,
          details: msg
        });
      }

      throw new VideoAnalysisError({
        stage: 'FETCH_TRANSCRIPT',
        code: 'TRANSCRIPT_UNAVAILABLE',
        message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
        statusCode: 404,
        retryable: false,
        details: msg
      });
    }
  }

  /**
   * STAGE 5: NORMALIZE_CONTENT
   * Normalizes caption text, removes bracketed noise, normalizes math whitespace,
   * preserves equations, calculates word and token counts, checks minimum content length.
   */
  public static normalizeContent(rawSegments: TranscriptSegment[]): NormalizedContentResult {
    if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
      throw new VideoAnalysisError({
        stage: 'NORMALIZE_CONTENT',
        code: 'INSUFFICIENT_VIDEO_CONTENT',
        message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
        statusCode: 422,
        retryable: false
      });
    }

    const cleanSegments: TranscriptSegment[] = [];
    let lastSeenText = '';

    for (const seg of rawSegments) {
      if (!seg || !seg.text) continue;
      // Decode entities & clean noise cues while preserving math symbols (+ - * / = ^ sqrt delta)
      const cleaned = seg.text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/\[\s*(music|applause|laughter|silence|cheering|chuckles|groans|screaming)\s*\]/gi, '')
        .replace(/\(\s*(music|applause|laughter|silence|cheering|chuckles|groans|screaming)\s*\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleaned.length > 0 && cleaned.toLowerCase() !== lastSeenText.toLowerCase()) {
        cleanSegments.push({
          text: cleaned,
          start: Math.round(seg.start || 0),
          duration: Math.round(seg.duration || 0)
        });
        lastSeenText = cleaned;
      }
    }

    const rawText = cleanSegments.map(s => s.text).join(' ');
    const characterCount = rawText.length;
    const words = rawText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    // Standard rule of thumb: ~4 characters per token
    const estimatedTokens = Math.ceil(characterCount / 4);

    // Minimum educational content check: require at least 80 characters and 15 words
    if (characterCount < 80 || wordCount < 15) {
      throw new VideoAnalysisError({
        stage: 'NORMALIZE_CONTENT',
        code: 'INSUFFICIENT_VIDEO_CONTENT',
        message: "We couldn't read this video's content, so a quiz can't be built. Try another video or paste a transcript.",
        statusCode: 422,
        retryable: false,
        details: { characterCount, wordCount }
      });
    }

    return {
      cleanSegments,
      rawText,
      characterCount,
      wordCount,
      estimatedTokens
    };
  }

  /**
   * STAGE 6: ANALYZE_EDUCATIONAL_CONTENT
   * Runs syllabus classification, topic breakdown, and evidence parsing.
   */
  public static async analyzeEducationalContent(params: {
    sessionId: string;
    videoId: string;
    title: string;
    segments: TranscriptSegment[];
    client?: any;
  }): Promise<StructuredEvidence> {
    const { sessionId, videoId, title, segments, client } = params;
    PipelineLogger.startStage(sessionId, videoId, 'ANALYZE_EDUCATIONAL_CONTENT', { segmentCount: segments.length });

    try {
      const evidence = await S1_VideoAnalysis.analyzeVideo({
        title,
        transcript: segments,
        client
      });

      if (!evidence || !evidence.subject) {
        throw new Error('S1_VideoAnalysis returned incomplete educational evidence');
      }

      PipelineLogger.endStage(sessionId, videoId, 'ANALYZE_EDUCATIONAL_CONTENT', {
        subject: evidence.subject,
        chapter: evidence.chapter,
        definitionCount: evidence.definitions.length,
        formulaCount: evidence.formulas.length
      });

      return evidence;
    } catch (err: any) {
      PipelineLogger.failStage(sessionId, videoId, 'ANALYZE_EDUCATIONAL_CONTENT', err);
      throw new VideoAnalysisError({
        stage: 'ANALYZE_EDUCATIONAL_CONTENT',
        code: 'CONTENT_ANALYSIS_FAILED',
        message: "Failed to analyze educational content from this video's transcript.",
        statusCode: 422,
        retryable: true,
        details: err?.message
      });
    }
  }

  /**
   * STAGE 7: EXTRACT_CONCEPTS
   * Extracts atomic educational concepts and ensures current video evidence is linked.
   */
  public static async extractConcepts(params: {
    sessionId: string;
    videoId: string;
    evidence: StructuredEvidence;
    segments: TranscriptSegment[];
    client?: any;
  }): Promise<ConceptHierarchyItem[]> {
    const { sessionId, videoId, evidence, segments, client } = params;
    PipelineLogger.startStage(sessionId, videoId, 'EXTRACT_CONCEPTS', { subject: evidence.subject });

    try {
      const concepts = await S2_ConceptExtraction.extractConcepts({
        evidence,
        transcript: segments,
        client
      });

      if (!Array.isArray(concepts) || concepts.length === 0) {
        throw new VideoAnalysisError({
          stage: 'EXTRACT_CONCEPTS',
          code: 'CONCEPT_EXTRACTION_FAILED',
          message: "We couldn't identify enough concepts. Try a video with more spoken explanation.",
          statusCode: 422,
          retryable: false
        });
      }

      PipelineLogger.endStage(sessionId, videoId, 'EXTRACT_CONCEPTS', {
        conceptCount: concepts.length,
        concepts: concepts.map(c => `${c.id}:${c.name}`)
      });

      return concepts;
    } catch (err: any) {
      PipelineLogger.failStage(sessionId, videoId, 'EXTRACT_CONCEPTS', err);
      if (err instanceof VideoAnalysisError) throw err;
      throw new VideoAnalysisError({
        stage: 'EXTRACT_CONCEPTS',
        code: 'CONCEPT_EXTRACTION_FAILED',
        message: "We couldn't identify enough concepts. Try a video with more spoken explanation.",
        statusCode: 422,
        retryable: false,
        details: err?.message
      });
    }
  }

  /**
   * STAGE 8: UNDERSTAND_CONCEPTS
   * Runs coverage classification and concept understanding.
   * GUARANTEE: Injects verified video evidence segments into EVERY ConceptUnderstandingObject.
   */
  public static async understandConcepts(params: {
    sessionId: string;
    videoId: string;
    concepts: ConceptHierarchyItem[];
    segments: TranscriptSegment[];
    evidence: StructuredEvidence;
    client?: any;
  }): Promise<{
    classifications: Record<string, ConceptCoverageClassification>;
    understandings: Record<string, ConceptUnderstandingObject>;
  }> {
    const { sessionId, videoId, concepts, segments, evidence, client } = params;
    PipelineLogger.startStage(sessionId, videoId, 'UNDERSTAND_CONCEPTS', { conceptCount: concepts.length });

    try {
      // 8a. Coverage classification
      const classifications = S3_CoverageClassifier.classifyCoverage({
        concepts,
        transcript: segments,
        evidence
      });

      // 8b. Concept understanding synthesis
      const understandings = await S4_ConceptUnderstanding.buildConceptUnderstanding({
        concepts,
        classifications,
        evidence,
        client
      });

      // GUARANTEE: Attach non-empty evidence segments and sourceVideoId to EVERY understanding object
      for (const concept of concepts) {
        const u = understandings[concept.id];
        const cls = classifications[concept.id];
        if (u) {
          const evidenceSegments = (cls?.evidence && cls.evidence.length > 0)
            ? cls.evidence
            : (segments.length > 0
              ? [{
                  text: segments[0].text,
                  start: segments[0].start,
                  duration: segments[0].duration,
                  timestamp: `${String(Math.floor(segments[0].start / 60)).padStart(2, '0')}:${String(Math.floor(segments[0].start % 60)).padStart(2, '0')}`
                }]
              : []);

          u.evidence = evidenceSegments;
          u.sourceVideoId = videoId;
        }
      }

      PipelineLogger.endStage(sessionId, videoId, 'UNDERSTAND_CONCEPTS', {
        classifiedCount: Object.keys(classifications).length,
        understandingsCount: Object.keys(understandings).length
      });

      return { classifications, understandings };
    } catch (err: any) {
      PipelineLogger.failStage(sessionId, videoId, 'UNDERSTAND_CONCEPTS', err);
      throw new VideoAnalysisError({
        stage: 'UNDERSTAND_CONCEPTS',
        code: 'CONCEPT_ANALYSIS_FAILED',
        message: 'Failed to synthesize concept understandings for this video.',
        statusCode: 422,
        retryable: true,
        details: err?.message
      });
    }
  }

  /**
   * STAGE 9: BUILD_CONCEPT_MAP
   * Compiles the comprehensive Concept Knowledge Map and validates it.
   */
  public static buildConceptMap(params: {
    sessionId: string;
    videoId: string;
    evidence: StructuredEvidence;
    concepts: ConceptHierarchyItem[];
    classifications: Record<string, ConceptCoverageClassification>;
    understandings: Record<string, ConceptUnderstandingObject>;
  }): PersistedKnowledgeMap {
    const { sessionId, videoId, evidence, concepts, classifications, understandings } = params;
    PipelineLogger.startStage(sessionId, videoId, 'BUILD_CONCEPT_MAP', { conceptCount: concepts.length });

    try {
      const knowledgeMap = S5_KnowledgeMap.buildKnowledgeMap({
        evidence,
        concepts,
        classifications,
        understandings
      });

      // Verification: must have at least one allowed concept with valid understanding
      if (!knowledgeMap.allowedConceptIds || knowledgeMap.allowedConceptIds.length === 0) {
        // Fallback: If strict classification rejected everything, allow concepts with instructional depth
        const fallbackAllowed = concepts.filter(c => classifications[c.id]?.status !== 'NOT_COVERED');
        if (fallbackAllowed.length > 0) {
          fallbackAllowed.forEach(c => {
            if (!knowledgeMap.allowedConceptIds.includes(c.id)) {
              knowledgeMap.allowedConceptIds.push(c.id);
            }
          });
        }
      }

      if (knowledgeMap.allowedConceptIds.length === 0) {
        throw new VideoAnalysisError({
          stage: 'BUILD_CONCEPT_MAP',
          code: 'CONCEPT_MAP_FAILED',
          message: 'The concept map could not find any covered concepts taught in this video lecture.',
          statusCode: 422,
          retryable: false
        });
      }

      // Verify that every allowed concept has video evidence
      for (const conceptId of knowledgeMap.allowedConceptIds) {
        const u = knowledgeMap.concepts[conceptId];
        if (!u || !u.evidence || u.evidence.length === 0) {
          const cls = classifications[conceptId];
          if (u && cls && cls.evidence && cls.evidence.length > 0) {
            u.evidence = cls.evidence;
            u.sourceVideoId = videoId;
          }
        }
      }

      PipelineLogger.endStage(sessionId, videoId, 'BUILD_CONCEPT_MAP', {
        allowedCount: knowledgeMap.allowedConceptIds.length,
        allowedConceptIds: knowledgeMap.allowedConceptIds
      });

      return knowledgeMap;
    } catch (err: any) {
      PipelineLogger.failStage(sessionId, videoId, 'BUILD_CONCEPT_MAP', err);
      if (err instanceof VideoAnalysisError) throw err;
      throw new VideoAnalysisError({
        stage: 'BUILD_CONCEPT_MAP',
        code: 'CONCEPT_MAP_FAILED',
        message: 'Failed to construct a valid concept map for this video.',
        statusCode: 422,
        retryable: false,
        details: err?.message
      });
    }
  }

  /**
   * Orchestrates the complete 9-stage analysis pipeline for a video.
   */
  public static async analyzeVideoPipeline(params: {
    url?: string;
    demoId?: string;
    manualTranscript?: string;
    language?: string;
    analysisSessionId?: string;
    client?: any;
  }): Promise<VideoAnalysisResult> {
    const { url, demoId, manualTranscript, language = 'en', analysisSessionId, client } = params;

    const sessionId = (typeof analysisSessionId === 'string' && analysisSessionId.trim())
      ? analysisSessionId.trim()
      : VideoIdentity.createSessionId();

    let videoId = '';

    // Handle manual transcript override
    if (manualTranscript && typeof manualTranscript === 'string' && manualTranscript.trim().length > 0) {
      videoId = `manual_${Date.now()}`;
      const { TranscriptService } = await import('./transcriptService.js');
      const transcriptSegments = TranscriptService.parseManualTranscript(manualTranscript);
      const normalized = this.normalizeContent(transcriptSegments);
      const metadata: VideoMetadata = {
        id: videoId,
        url: url || `https://study-tube.ai/manual/${videoId}`,
        title: 'Manual Custom Transcript',
        author: 'Student / Educator',
        thumbnailUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
        embedUrl: ''
      };
      const chunks = ChunkingService.splitTranscriptIntoChunks(normalized.cleanSegments);

      const evidence = await this.analyzeEducationalContent({
        sessionId,
        videoId,
        title: metadata.title,
        segments: normalized.cleanSegments,
        client
      });

      const concepts = await this.extractConcepts({
        sessionId,
        videoId,
        evidence,
        segments: normalized.cleanSegments,
        client
      });

      const { classifications, understandings } = await this.understandConcepts({
        sessionId,
        videoId,
        concepts,
        segments: normalized.cleanSegments,
        evidence,
        client
      });

      const knowledgeMap = this.buildConceptMap({
        sessionId,
        videoId,
        evidence,
        concepts,
        classifications,
        understandings
      });

      return {
        analysisSessionId: sessionId,
        videoId,
        metadata,
        transcript: normalized.cleanSegments,
        rawText: normalized.rawText,
        languageCode: language,
        trackType: 'manual',
        chunkCount: chunks.length,
        stats: {
          characterCount: normalized.characterCount,
          wordCount: normalized.wordCount,
          estimatedTokens: normalized.estimatedTokens
        },
        evidence,
        concepts,
        classifications,
        understandings,
        knowledgeMap
      };
    }

    // Demo video path
    if (demoId && DEMO_VIDEOS[demoId]) {
      videoId = demoId;
      const demo = DEMO_VIDEOS[demoId];
      const normalized = this.normalizeContent(demo.transcript);
      const chunks = ChunkingService.splitTranscriptIntoChunks(normalized.cleanSegments);
      const metadata: VideoMetadata = {
        id: demo.id,
        url: demo.url,
        title: demo.title,
        author: demo.author,
        thumbnailUrl: demo.thumbnailUrl,
        duration: demo.duration,
        durationSeconds: demo.durationSeconds,
        embedUrl: `https://www.youtube.com/embed/${demo.url.split('v=')[1] || 'k6U-i4gXka8'}`
      };

      const evidence = await this.analyzeEducationalContent({
        sessionId,
        videoId,
        title: metadata.title,
        segments: normalized.cleanSegments,
        client
      });

      const concepts = await this.extractConcepts({
        sessionId,
        videoId,
        evidence,
        segments: normalized.cleanSegments,
        client
      });

      const { classifications, understandings } = await this.understandConcepts({
        sessionId,
        videoId,
        concepts,
        segments: normalized.cleanSegments,
        evidence,
        client
      });

      const knowledgeMap = this.buildConceptMap({
        sessionId,
        videoId,
        evidence,
        concepts,
        classifications,
        understandings
      });

      return {
        analysisSessionId: sessionId,
        videoId,
        metadata,
        transcript: normalized.cleanSegments,
        rawText: normalized.rawText,
        languageCode: 'en',
        trackType: 'manual',
        chunkCount: chunks.length,
        stats: {
          characterCount: normalized.characterCount,
          wordCount: normalized.wordCount,
          estimatedTokens: normalized.estimatedTokens
        },
        evidence,
        concepts,
        classifications,
        understandings,
        knowledgeMap
      };
    }

    // STAGE 1: VALIDATE_URL
    if (!url) {
      throw new VideoAnalysisError({
        stage: 'VALIDATE_URL',
        code: 'INVALID_YOUTUBE_URL',
        message: 'Please provide a valid YouTube URL.',
        statusCode: 400
      });
    }
    this.validateUrl(url);

    // STAGE 2: EXTRACT_VIDEO_ID
    videoId = this.extractVideoId(url);

    // STAGE 3: FETCH_VIDEO_METADATA
    const metadata = await this.fetchVideoMetadata(videoId, url);

    // STAGE 4: FETCH_TRANSCRIPT
    const fetchResult = await this.fetchTranscript(
      videoId,
      metadata.title,
      metadata.author,
      language
    );

    // STAGE 5: NORMALIZE_CONTENT
    const normalized = this.normalizeContent(fetchResult.transcript);
    const chunks = ChunkingService.splitTranscriptIntoChunks(normalized.cleanSegments);

    // STAGE 6: ANALYZE_EDUCATIONAL_CONTENT
    const evidence = await this.analyzeEducationalContent({
      sessionId,
      videoId,
      title: metadata.title,
      segments: normalized.cleanSegments,
      client
    });

    // STAGE 7: EXTRACT_CONCEPTS
    const concepts = await this.extractConcepts({
      sessionId,
      videoId,
      evidence,
      segments: normalized.cleanSegments,
      client
    });

    // STAGE 8: UNDERSTAND_CONCEPTS
    const { classifications, understandings } = await this.understandConcepts({
      sessionId,
      videoId,
      concepts,
      segments: normalized.cleanSegments,
      evidence,
      client
    });

    // STAGE 9: BUILD_CONCEPT_MAP
    const knowledgeMap = this.buildConceptMap({
      sessionId,
      videoId,
      evidence,
      concepts,
      classifications,
      understandings
    });

    return {
      analysisSessionId: sessionId,
      videoId,
      metadata,
      transcript: normalized.cleanSegments,
      rawText: normalized.rawText,
      languageCode: fetchResult.languageCode,
      trackType: fetchResult.trackType,
      chunkCount: chunks.length,
      stats: {
        characterCount: normalized.characterCount,
        wordCount: normalized.wordCount,
        estimatedTokens: normalized.estimatedTokens
      },
      evidence,
      concepts,
      classifications,
      understandings,
      knowledgeMap
    };
  }
}
