/**
 * Shared error formatting utility for StudyTube AI.
 * Ensures all errors displayed to students are human-readable, actionable strings,
 * with specific user-safe error messages, and never raw JavaScript objects.
 * In development mode, displays Stage, Code, and Reference ID for transparent debugging.
 */

export interface ParsedError {
  code: string;
  message: string;
  stage?: string;
  retryable?: boolean;
  refId?: string;
  rawError?: unknown;
}

export function parseErrorDetails(err: unknown): ParsedError {
  if (!err) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unable to analyze this video. Please try again.',
      retryable: true
    };
  }

  // 1. If it's a string
  if (typeof err === 'string') {
    const raw = err.trim();
    if (!raw || raw === '[object Object]') {
      return {
        code: 'UNKNOWN_ERROR',
        message: 'Unable to analyze this video. Please try again.',
        retryable: true
      };
    }
    return formatCodeToError(raw);
  }

  // 2. If it's an object (Axios, Fetch, or Error instance)
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, any>;
    const data = obj.response?.data || obj.data || obj;
    const errField = data.error;

    let code = (typeof errField === 'object' && errField?.code) || data.code || obj.code || '';
    let message = (typeof errField === 'object' && errField?.message) || data.message || obj.message || '';
    let stage = (typeof errField === 'object' && errField?.stage) || data.stage || obj.stage || '';
    let retryable = (typeof errField === 'object' && typeof errField?.retryable === 'boolean')
      ? errField.retryable
      : (typeof data.retryable === 'boolean' ? data.retryable : undefined);
    let refId = (typeof errField === 'object' && (errField?.refId || errField?.referenceId)) ||
      data.refId || data.referenceId || obj.refId || obj.referenceId;

    if (typeof errField === 'string' && !message) {
      message = errField;
    }

    if (code || message || stage) {
      const parsed = formatCodeToError(code || message, message, refId, stage);
      return {
        code: parsed.code,
        message: parsed.message,
        stage: stage || parsed.stage,
        retryable: retryable !== undefined ? retryable : parsed.retryable,
        refId: refId || parsed.refId,
        rawError: err
      };
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Unable to analyze this video. Please try again.',
    retryable: true
  };
}

export function getErrorMessage(err: unknown): string {
  const parsed = parseErrorDetails(err);
  return parsed.message;
}

function formatCodeToError(
  raw: string,
  originalMessage?: string,
  refId?: string,
  stage?: string
): ParsedError {
  const upper = (raw || '').toUpperCase();
  const msgUpper = (originalMessage || '').toUpperCase();
  const combined = `${upper} ${msgUpper}`;

  // 1. SESSION_SUPERSEDED (silent, no error toast)
  if (combined.includes('SESSION_SUPERSEDED')) {
    return {
      code: 'SESSION_SUPERSEDED',
      message: '',
      stage: 'SESSION',
      retryable: false
    };
  }

  // 2. INVALID_YOUTUBE_URL
  if (combined.includes('INVALID_YOUTUBE_URL') || combined.includes('INVALID_URL')) {
    const baseMsg = 'Invalid YouTube URL. Please provide a standard link (e.g. youtube.com/watch?v=... or youtu.be/...).';
    return buildResult({
      code: 'INVALID_YOUTUBE_URL',
      baseMessage: baseMsg,
      stage: stage || 'VALIDATE_URL',
      retryable: false,
      refId
    });
  }

  // 3. INVALID_VIDEO_ID
  if (combined.includes('INVALID_VIDEO_ID')) {
    const baseMsg = 'The provided YouTube link has an invalid or malformed video ID.';
    return buildResult({
      code: 'INVALID_VIDEO_ID',
      baseMessage: baseMsg,
      stage: stage || 'EXTRACT_VIDEO_ID',
      retryable: false,
      refId
    });
  }

  // 4. METADATA_FAILED / VIDEO_NOT_FOUND
  if (combined.includes('METADATA_FAILED') || combined.includes('VIDEO_NOT_FOUND')) {
    const baseMsg = 'Unable to load video details from YouTube. Please verify the link.';
    return buildResult({
      code: 'METADATA_FAILED',
      baseMessage: baseMsg,
      stage: stage || 'FETCH_VIDEO_METADATA',
      retryable: true,
      refId
    });
  }

  // 5. TRANSCRIPT_UNAVAILABLE / NO_CAPTIONS_AVAILABLE
  if (
    combined.includes('TRANSCRIPT_UNAVAILABLE') ||
    combined.includes('NO_CAPTIONS_AVAILABLE') ||
    combined.includes('CAPTIONS_BLOCKED') ||
    combined.includes('NO_CAPTIONS')
  ) {
    const baseMsg = "We couldn't retrieve study content from this video. Please try another video or a video with captions.";
    return buildResult({
      code: 'TRANSCRIPT_UNAVAILABLE',
      baseMessage: baseMsg,
      stage: stage || 'FETCH_TRANSCRIPT',
      retryable: false,
      refId
    });
  }

  // 6. TRANSCRIPT_TIMEOUT / TIMEOUT
  if (
    combined.includes('TRANSCRIPT_TIMEOUT') ||
    combined.includes('ANALYSIS_TIMEOUT') ||
    combined.includes('GENERATION_TIMEOUT') ||
    combined.includes('ETIMEDOUT') ||
    combined.includes('TIMEOUT')
  ) {
    const baseMsg = 'Video processing took too long. Please try again.';
    return buildResult({
      code: 'TRANSCRIPT_TIMEOUT',
      baseMessage: baseMsg,
      stage: stage || 'FETCH_TRANSCRIPT',
      retryable: true,
      refId
    });
  }

  // 7. INSUFFICIENT_VIDEO_CONTENT
  if (
    combined.includes('INSUFFICIENT_VIDEO_CONTENT') ||
    combined.includes('CONTENT_TOO_SHORT')
  ) {
    const baseMsg = 'This video does not contain enough spoken educational explanation to build an exam quiz. Try a lecture with more spoken instruction.';
    return buildResult({
      code: 'INSUFFICIENT_VIDEO_CONTENT',
      baseMessage: baseMsg,
      stage: stage || 'NORMALIZE_CONTENT',
      retryable: false,
      refId
    });
  }

  // 8. AI_NOT_CONFIGURED (Section 36)
  if (
    combined.includes('AI_NOT_CONFIGURED') ||
    combined.includes('AI_KEY_MISSING') ||
    combined.includes('GEMINI_API_KEY')
  ) {
    const baseMsg = 'AI service is not configured.';
    return buildResult({
      code: 'AI_NOT_CONFIGURED',
      baseMessage: baseMsg,
      stage: stage || 'AI_CONFIGURATION',
      retryable: false,
      refId
    });
  }

  // 9. RATE_LIMITED / AI_SERVICE_ERROR
  if (
    combined.includes('RATE_LIMITED') ||
    combined.includes('AI_SERVICE_ERROR') ||
    combined.includes('RATE_LIMIT_EXCEEDED') ||
    combined.includes('RESOURCE_EXHAUSTED') ||
    combined.includes('429') ||
    combined.includes('503')
  ) {
    const baseMsg = 'The AI service is temporarily busy or rate-limited. Please try again in a few moments.';
    return buildResult({
      code: 'RATE_LIMITED',
      baseMessage: baseMsg,
      stage: stage || 'AI_RATE_LIMIT',
      retryable: true,
      refId
    });
  }

  // 10. EXTRACTION_FAILED / INSUFFICIENT_CONCEPT_EVIDENCE
  if (
    combined.includes('EXTRACTION_FAILED') ||
    combined.includes('INSUFFICIENT_CONCEPT_EVIDENCE') ||
    combined.includes('INSUFFICIENT_EDUCATIONAL_CONTENT') ||
    combined.includes('CONCEPT_EXTRACTION_FAILED') ||
    combined.includes('IDENTIFY ENOUGH CONCEPTS')
  ) {
    const baseMsg = "We couldn't identify enough concepts. Try a video with more spoken explanation.";
    return buildResult({
      code: 'CONCEPT_EXTRACTION_FAILED',
      baseMessage: baseMsg,
      stage: stage || 'EXTRACT_CONCEPTS',
      retryable: false,
      refId
    });
  }

  // 11. QUIZ_VALIDATION_FAILED / QUESTION_VALIDATION_EXHAUSTED
  if (
    combined.includes('QUIZ_VALIDATION_FAILED') ||
    combined.includes('QUESTION_VALIDATION_EXHAUSTED') ||
    combined.includes('BLUEPRINT_VALIDATION_FAILED') ||
    combined.includes('QUESTION_BLUEPRINT_INVALID') ||
    combined.includes('QUALITY_GATE_FAILED') ||
    combined.includes('HIGH-QUALITY QUIZ')
  ) {
    const baseMsg = "We couldn't build a high-quality quiz this time. Please try again.";
    return buildResult({
      code: 'QUIZ_VALIDATION_FAILED',
      baseMessage: baseMsg,
      stage: stage || 'QUESTION_GENERATION',
      retryable: true,
      refId
    });
  }

  // 12. Reference ID extraction from message
  const foundRefMatch = (originalMessage || raw).match(/reference[:\s]+([a-f0-9]{6,8})/i);
  const foundRefId = refId || (foundRefMatch ? foundRefMatch[1] : undefined);

  // Generic fallback
  const baseMsg = 'Unable to analyze this video. Please try again.';
  return buildResult({
    code: 'UNKNOWN_ERROR',
    baseMessage: baseMsg,
    stage: stage || 'VIDEO_ANALYSIS',
    retryable: true,
    refId: foundRefId
  });
}

function buildResult(params: {
  code: string;
  baseMessage: string;
  stage: string;
  retryable: boolean;
  refId?: string;
}): ParsedError {
  const { code, baseMessage, stage, retryable, refId } = params;

  // In development mode: display Stage, Code, and Reference ID prominently (Section 34)
  if (import.meta.env.DEV) {
    const devLines = [
      `Stage: ${stage}`,
      `Code: ${code}`,
      refId ? `Reference: ${refId}` : null,
      '',
      baseMessage
    ].filter(Boolean);

    return {
      code,
      message: devLines.join('\n'),
      stage,
      retryable,
      refId
    };
  }

  // Production mode: friendly message with reference identifier if present
  const prodMessage = refId
    ? `${baseMessage} (Ref: ${refId})`
    : baseMessage;

  return {
    code,
    message: prodMessage,
    stage,
    retryable,
    refId
  };
}
