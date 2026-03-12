/**
 * Utility for measuring execution duration in tool handlers.
 *
 * Usage:
 *   const elapsed = startTimer();
 *   // ... do work ...
 *   const durationMs = elapsed(); // returns milliseconds
 */
export function startTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
