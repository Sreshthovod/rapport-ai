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

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------

export class AIPipelineInspector {
  /** Singleton instance. */
  private static _instance: AIPipelineInspector | null = null;

  /** Maximum number of events kept in the ring-buffer before oldest are evicted. */
  private readonly _maxEvents: number;

  /** Ring-buffer of captured events. */
  private readonly _events: PipelineTraceEvent[] = [];

  /** Monotonic origin time (performance.now() at construction). */
  private readonly _origin: number;

  /**
   * Whether the inspector is currently active.
   * Defaults to `true` in development, `false` otherwise.
   * Can be toggled at runtime via `inspector.enabled = false`.
   */
  public enabled: boolean;

  private constructor(maxEvents = 200) {
    this._maxEvents = maxEvents;
    this._origin = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Detect development environment without relying on Node.js `process`
    this.enabled = _isDevEnvironment();
  }

  // -------------------------------------------------------------------------
  // Singleton access
  // -------------------------------------------------------------------------

  public static getInstance(): AIPipelineInspector {
    if (!AIPipelineInspector._instance) {
      AIPipelineInspector._instance = new AIPipelineInspector();
    }
    return AIPipelineInspector._instance;
  }

  /** Reset the singleton (useful in tests). */
  public static resetInstance(): void {
    AIPipelineInspector._instance = null;
  }

  // -------------------------------------------------------------------------
  // Core API
  // -------------------------------------------------------------------------

  /**
   * Record a trace event for the given pipeline stage.
   *
   * @param stage     - Name of the pipeline stage.
   * @param payload   - Snapshot of data to capture (will be shallow-cloned).
   * @param durationMs - Optional time measurement for the stage.
   */
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

    // Evict oldest when ring-buffer is full
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
