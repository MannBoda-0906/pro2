import crypto from 'crypto';

export interface StageLogEntry {
  sessionId: string;
  videoId: string;
  stage: string;
  status: 'started' | 'success' | 'failed' | 'skipped';
  startTime: number;
  endTime?: number;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
    status?: number;
    responseBody?: any;
  };
  refId?: string;
}

export class PipelineLogger {
  private static stageEntries = new Map<string, StageLogEntry>();

  public static generateRefId(): string {
    return crypto.randomBytes(3).toString('hex'); // e.g. "a1b2c3"
  }

  public static startStage(
    sessionId: string,
    videoId: string,
    stage: string,
    metadata?: Record<string, any>
  ): void {
    const key = `${sessionId}:${videoId}:${stage}`;
    const entry: StageLogEntry = {
      sessionId,
      videoId,
      stage,
      status: 'started',
      startTime: Date.now(),
      metadata
    };
    this.stageEntries.set(key, entry);

    const metaStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
    console.log(`[PipelineLogger][${sessionId.slice(0, 8)}][${videoId}] ⏩ START [${stage}]${metaStr}`);
  }

  public static endStage(
    sessionId: string,
    videoId: string,
    stage: string,
    outputSummary?: Record<string, any>
  ): number {
    const key = `${sessionId}:${videoId}:${stage}`;
    const entry = this.stageEntries.get(key);
    const endTime = Date.now();
    const durationMs = entry ? endTime - entry.startTime : 0;

    if (entry) {
      entry.status = 'success';
      entry.endTime = endTime;
      entry.durationMs = durationMs;
      if (outputSummary) {
        entry.metadata = { ...(entry.metadata || {}), ...outputSummary };
      }
    }

    const summaryStr = outputSummary ? ` | ${JSON.stringify(outputSummary)}` : '';
    console.log(`[PipelineLogger][${sessionId.slice(0, 8)}][${videoId}] ✅ SUCCESS [${stage}] (${durationMs}ms)${summaryStr}`);
    return durationMs;
  }

  public static failStage(
    sessionId: string,
    videoId: string,
    stage: string,
    err: any,
    metadata?: Record<string, any>
  ): string {
    const key = `${sessionId}:${videoId}:${stage}`;
    const entry = this.stageEntries.get(key);
    const endTime = Date.now();
    const durationMs = entry ? endTime - entry.startTime : 0;
    const refId = this.generateRefId();

    const rawError = {
      message: err?.message || String(err),
      code: err?.code || (err?.status ? `HTTP_${err.status}` : undefined),
      stack: err?.stack,
      status: err?.status || err?.statusCode || (err?.response?.status),
      responseBody: err?.response?.data || err?.body
    };

    if (entry) {
      entry.status = 'failed';
      entry.endTime = endTime;
      entry.durationMs = durationMs;
      entry.error = rawError;
      entry.refId = refId;
    }

    console.error(`[PipelineLogger][${sessionId.slice(0, 8)}][${videoId}] ❌ FAILED [${stage}] (${durationMs}ms) [Ref: ${refId}]`);
    console.error(`   Message: ${rawError.message}`);
    if (rawError.code) console.error(`   Code: ${rawError.code}`);
    if (rawError.status) console.error(`   HTTP Status: ${rawError.status}`);
    if (rawError.stack) console.error(`   Stack: ${rawError.stack.split('\n').slice(0, 3).join('\n')}`);
    if (rawError.responseBody) console.error(`   Response Body: ${JSON.stringify(rawError.responseBody)}`);
    if (metadata) console.error(`   Metadata: ${JSON.stringify(metadata)}`);

    return refId;
  }

  public static getLastErrorRef(sessionId: string): string | undefined {
    let lastRef: string | undefined = undefined;
    for (const [key, entry] of this.stageEntries.entries()) {
      if (entry.sessionId === sessionId && entry.refId) {
        lastRef = entry.refId;
      }
    }
    return lastRef;
  }
}
