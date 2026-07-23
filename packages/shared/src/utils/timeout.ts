/**
 * Utility to enforce a strict maximum timeout limit on any promise.
 * Prevents unresolved promise deadlocks in async storage or network pipelines.
 *
 * @param promise   - The promise to execute.
 * @param timeoutMs - Maximum time in ms before aborting with a timeout error (default: 5000ms).
 * @param stageName - Descriptive name of the stage for error context.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 5000,
  stageName = 'Async Operation'
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`[TimeoutError] Stage "${stageName}" exceeded ${timeoutMs}ms execution limit.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}
