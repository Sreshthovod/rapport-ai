/**
 * AIPipelineInspector
 *
 * A lightweight, zero-dependency debug utility for tracing data as it flows
 * through each stage of the Rapport AI pipeline.
 *
 * Enabled only when NODE_ENV === "development" — compiled away at production build time.
 *
 * Usage:
 *   import { AIPipelineInspector } from '@rapport/shared';
 *   const inspector = AIPipelineInspector.getInstance();
 *
 *   inspector.trace('ContextEngine', context);
 *   inspector.trace('PromptComposer', { systemPrompt, userPrompt }, 4);
 *   inspector.dump(); // print full trace to console
 *   inspector.clear();
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStage =
  | 'WhatsAppAdapter'
  | 'ContextEngine'
  | 'ConversationIntelligence'
  | 'RelationshipContext'
  | 'MemoryExtractor'
  | 'MemoryRetriever'
  | 'MemoryPromptBudget'
  | 'PromptComposer'
  | 'ProviderManager'
  | 'Provider'
  | 'ResponseEvaluator'
  | 'Overlay'
  | (string & Record<never, never>); // allow arbitrary stage names without losing autocomplete

export interface PipelineTraceEvent {
  /** ISO-8601 timestamp of when the trace was recorded. */
  iso: string;
  /** Monotonic milliseconds since the inspector was created (for relative diffing). */
  elapsedMs: number;
  /** Optional duration measurement (e.g. how long the stage took). */
  durationMs?: number;
  /** The pipeline stage that produced this event. */
  stage: PipelineStage;
  /** Arbitrary snapshot of data at this stage. */
  payload: unknown;
}

export interface PipelineStageTiming {
  stage: string;
  durationMs: number;
  status: 'ok' | 'timeout' | 'error';
}

export interface PipelineDiagnosticsSummary {
  currentStage: string;
  totalDurationMs: number;
  success: boolean;
  provider: string;
  model: string;
  promptLength: number;
  completionTokens?: number;
  finishReason?: string;
  lastError?: string;
  stageTimings: PipelineStageTiming[];
}

export class AIPipelineInspector {
  private static _instance: AIPipelineInspector | null = null;
  private readonly _maxEvents: number;
  private readonly _events: PipelineTraceEvent[] = [];
  private readonly _origin: number;
  private readonly _activeTimers: Map<string, number> = new Map();
  private readonly _stageTimings: PipelineStageTiming[] = [];
  private _latestDiagnostics: Partial<PipelineDiagnosticsSummary> = {};

  public enabled: boolean;

  private constructor(maxEvents = 200) {
    this._maxEvents = maxEvents;
    this._origin = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.enabled = _isDevEnvironment();
  }

  public static getInstance(): AIPipelineInspector {
    if (!AIPipelineInspector._instance) {
      AIPipelineInspector._instance = new AIPipelineInspector();
    }
    return AIPipelineInspector._instance;
  }

  public static resetInstance(): void {
    AIPipelineInspector._instance = null;
  }

  public startStage(stageName: string): void {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._activeTimers.set(stageName, t0);
    this._latestDiagnostics.currentStage = stageName;
    console.log(`[Pipeline] ${stageName}: started...`);
  }

  public endStage(stageName: string, payload?: unknown, isError = false): number {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const t0 = this._activeTimers.get(stageName) || now;
    const durationMs = Math.round(now - t0);
    this._activeTimers.delete(stageName);

    const status: 'ok' | 'timeout' | 'error' = isError
      ? 'error'
      : durationMs > 10000
      ? 'timeout'
      : 'ok';

    if (durationMs > 10000) {
      console.error(`[Pipeline:CRITICAL] Stage "${stageName}" EXCEEDED 10 SECONDS TIMEOUT LIMIT! Took ${durationMs}ms`);
    } else {
      console.log(`[Pipeline] ${stageName}: finished (${durationMs}ms)`);
    }

    const timing: PipelineStageTiming = { stage: stageName, durationMs, status };
    this._stageTimings.push(timing);

    this.trace(stageName as PipelineStage, payload, durationMs);
    return durationMs;
  }

  public updateDiagnostics(diagnostics: Partial<PipelineDiagnosticsSummary>): void {
    this._latestDiagnostics = {
      ...this._latestDiagnostics,
      ...diagnostics,
    };
  }

  public getDiagnosticsSummary(): PipelineDiagnosticsSummary {
    return {
      currentStage: this._latestDiagnostics.currentStage || 'Completed',
      totalDurationMs: this._latestDiagnostics.totalDurationMs || 0,
      success: this._latestDiagnostics.success !== false,
      provider: this._latestDiagnostics.provider || 'Offline',
      model: this._latestDiagnostics.model || 'Default Model',
      promptLength: this._latestDiagnostics.promptLength || 0,
      completionTokens: this._latestDiagnostics.completionTokens,
      finishReason: this._latestDiagnostics.finishReason || (this._latestDiagnostics.success === false ? 'error' : 'stop'),
      lastError: this._latestDiagnostics.lastError,
      stageTimings: [...this._stageTimings],
    };
  }

  public trace(stage: PipelineStage, payload: unknown, durationMs?: number): void {
    if (!this.enabled) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const event: PipelineTraceEvent = {
      iso: new Date().toISOString(),
      elapsedMs: Math.round(now - this._origin),
      durationMs,
      stage,
      payload: _safeClone(payload),
    };

    if (this._events.length >= this._maxEvents) {
      this._events.shift();
    }
    this._events.push(event);

    _printEvent(event);
  }

  /**
   * Record entry and exit of an async stage automatically.
   * Wraps a `Promise`-returning factory, measuring real elapsed time.
   *
   * @example
   * const result = await inspector.traceAsync('MemoryRetriever', () => retriever.retrieve(query));
   */
  public async traceAsync<T>(stage: PipelineStage, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const result = await fn();
    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    this.trace(stage, result, durationMs);
    return result;
  }

  /**
   * Record entry and exit of a sync stage automatically.
   */
  public traceSync<T>(stage: PipelineStage, fn: () => T): T {
    if (!this.enabled) return fn();

    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const result = fn();
    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    this.trace(stage, result, durationMs);
    return result;
  }

  // -------------------------------------------------------------------------
  // Query & display
  // -------------------------------------------------------------------------

  /** Return a copy of all recorded trace events. */
  public getEvents(): PipelineTraceEvent[] {
    return [...this._events];
  }

  /** Return only events for the specified stage. */
  public getEventsForStage(stage: PipelineStage): PipelineTraceEvent[] {
    return this._events.filter((e) => e.stage === stage);
  }

  /** Print a structured summary of all captured events to the console. */
  public dump(): void {
    if (this._events.length === 0) {
      console.info('[AIPipelineInspector] No events recorded.');
      return;
    }
    console.group('[AIPipelineInspector] Full Pipeline Trace');
    for (const event of this._events) {
      _printEvent(event);
    }
    console.groupEnd();
  }

  /** Clear all recorded events. */
  public clear(): void {
    this._events.length = 0;
  }

  /** Total number of events currently buffered. */
  public get size(): number {
    return this._events.length;
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Detect development mode without importing Node.js `process`. */
function _isDevEnvironment(): boolean {
  // Injected by bundlers (Vite, esbuild, webpack) as a string literal at build time
  if (typeof __DEV__ !== 'undefined') return (__DEV__ as boolean);
  // Chrome extension background / content scripts have `globalThis`
  const g = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : {};
  if (typeof g['NODE_ENV'] === 'string') return g['NODE_ENV'] === 'development';
  // Final fallback: assume development if not bundled for production
  return true;
}

/** Safely shallow-clone a payload for storage (avoids mutated-reference bugs). */
function _safeClone(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

/** Print a single trace event with consistent console formatting. */
function _printEvent(event: PipelineTraceEvent): void {
  const label = event.durationMs !== undefined
    ? `[AIPipelineInspector] +${event.elapsedMs}ms | ${event.stage} (${event.durationMs}ms)`
    : `[AIPipelineInspector] +${event.elapsedMs}ms | ${event.stage}`;

  console.groupCollapsed(label);
  console.log('Timestamp :', event.iso);
  console.log('Payload   :', event.payload);
  console.groupEnd();
}

// ---------------------------------------------------------------------------
// Ambient declaration to satisfy TypeScript when __DEV__ is injected
// ---------------------------------------------------------------------------
declare const __DEV__: boolean | undefined;

if (typeof globalThis !== 'undefined') {
  (globalThis as any).AIPipelineInspector = AIPipelineInspector;
}
