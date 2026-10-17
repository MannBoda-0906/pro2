/**
 * Shared error formatting utility for StudyTube AI.
 * Ensures all errors displayed to students are human-readable, actionable strings,
 * and never raw JavaScript objects (such as "[object Object]").
 */

export function getErrorMessage(err: unknown): string {
  if (!err) {
    return 'Something went wrong while generating the quiz. Please try again.';
  }

  // 1. If it's already a string
  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (!trimmed || trimmed === '[object Object]') {
      return 'Something went wrong while generating the quiz. Please try again.';
    }
    return formatStudentFriendlyMessage(trimmed);
  }

  // 2. If it's an Error instance
  if (err instanceof Error) {
    if (err.message && err.message !== '[object Object]') {
      return formatStudentFriendlyMessage(err.message);
    }
    if ((err as any).cause) {
      return getErrorMessage((err as any).cause);
    }
  }

  // 3. If it's an Axios/Fetch response or object with error/message/detail
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, any>;
    const data = obj.response?.data || obj.data || obj;

    // data.error as object: { code, message, stage }
    if (typeof data.error === 'object' && data.error !== null) {
      if (typeof data.error.message === 'string' && data.error.message !== '[object Object]') {
        return formatStudentFriendlyMessage(data.error.message);
      }
      if (typeof data.error.code === 'string') {
        return formatStudentFriendlyMessage(data.error.code);
      }
    }

    // data.error as string
    if (typeof data.error === 'string' && data.error !== '[object Object]') {
      return formatStudentFriendlyMessage(data.error);
    }

    // data.message as string
    if (typeof data.message === 'string' && data.message !== '[object Object]') {
      return formatStudentFriendlyMessage(data.message);
    }

    // data.detail as string
    if (typeof data.detail === 'string' && data.detail !== '[object Object]') {
      return formatStudentFriendlyMessage(data.detail);
    }

    // data.errors as array
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const messages = data.errors
        .map((e: any) => (typeof e === 'string' ? e : e?.message || ''))
        .filter(Boolean);
      if (messages.length > 0) {
        return formatStudentFriendlyMessage(messages.join('; '));
      }
    }
  }

  return 'Something went wrong while generating the quiz. Please try again.';
}

/**
 * Translates technical error codes and exception messages into clear, actionable advice for students.
 */
function formatStudentFriendlyMessage(raw: string): string {
  if (raw.includes('NO_CAPTIONS_AVAILABLE')) {
    return 'This video does not have any captions or subtitles available on YouTube. Please paste a transcript below to generate a quiz.';
  }

  if (raw.includes('CAPTIONS_BLOCKED') || raw.includes('CAPTIONS_BLOCKED_OR_FETCH_FAILED')) {
    return 'Could not retrieve captions from YouTube at this time (rate-limited or blocked). Please try again or paste a transcript below.';
  }

  if (raw.includes('UNSUPPORTED_LANGUAGE')) {
    return 'Captions are available, but in an unsupported language format. Please paste a transcript below.';
  }

  if (raw.includes('EXTRACTION_FAILED')) {
    return 'AI concept extraction failed or timed out. Please try generating again.';
  }

  if (raw.includes('INSUFFICIENT_EDUCATIONAL_CONTENT') || raw.includes('VIDEO_TOO_THIN')) {
    const cleanMsg = raw.replace(/^[A-Z_]+:\s*/, '');
    return cleanMsg.length > 15
      ? cleanMsg
      : 'The transcript contains too little instructional content to generate a quiz. Please choose a video with more detailed explanations or paste a transcript.';
  }

  if (raw.includes('NON_EDUCATIONAL_VIDEO')) {
    return 'This video does not appear to contain instructional educational material.';
  }

  if (raw.includes('BLUEPRINT_VALIDATION_FAILED')) {
    return 'Unable to create a balanced exam blueprint for this lesson. Please try a different difficulty or question count.';
  }

  if (
    raw.includes('ETIMEDOUT') ||
    raw.includes('timeout') ||
    raw.includes('timed out') ||
    raw.includes('AbortError')
  ) {
    return 'The quiz generator timed out while validating questions. Please try again.';
  }

  if (
    raw.includes('rate limit') ||
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('Quota exceeded')
  ) {
    return 'API rate limit reached. The system is falling back to verified academic curriculum blueprints.';
  }

  if (raw.includes('FAILED_TO_PRODUCE_VALID_QUIZ')) {
    return 'Could not generate validated questions for all slots after multiple attempts. Please try again.';
  }

  // Strip prefixes like "Error: " or "QUIZ_GENERATION_FAILED: "
  return raw.replace(/^Error:\s*/i, '').replace(/^[A-Z_]+:\s*/, '');
}
