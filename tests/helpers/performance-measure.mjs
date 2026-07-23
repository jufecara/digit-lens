/**
 * Performance measurement utilities for test execution
 */

/**
 * Measure execution time of an async function
 */
export async function measureTime(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
  return {
    result,
    durationMs: duration,
    durationSec: duration / 1000
  };
}

/**
 * Measure memory usage before and after execution
 */
export async function measureMemory(fn) {
  const before = process.memoryUsage();
  const result = await fn();
  const after = process.memoryUsage();
  
  return {
    result,
    memoryDelta: {
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
      external: after.external - before.external
    },
    memoryAfter: {
      heapUsed: after.heapUsed,
      heapTotal: after.heapTotal,
      external: after.external
    }
  };
}

/**
 * Measure both time and memory
 */
export async function measurePerformance(fn) {
  const timeResult = await measureTime(async () => {
    const memResult = await measureMemory(fn);
    return memResult;
  });
  
  return {
    result: timeResult.result.result,
    durationMs: timeResult.durationMs,
    durationSec: timeResult.durationSec,
    memoryDelta: timeResult.result.memoryDelta,
    memoryAfter: timeResult.result.memoryAfter
  };
}

/**
 * Format memory size for human-readable output
 */
export function formatMemorySize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Check if performance meets thresholds
 */
export function checkPerformanceThresholds(measurement, thresholds) {
  const violations = [];
  
  if (thresholds.maxDurationMs && measurement.durationMs > thresholds.maxDurationMs) {
    violations.push(`Duration ${measurement.durationMs.toFixed(2)}ms exceeds threshold ${thresholds.maxDurationMs}ms`);
  }
  
  if (thresholds.maxMemoryBytes && measurement.memoryDelta.heapUsed > thresholds.maxMemoryBytes) {
    violations.push(`Memory delta ${formatMemorySize(measurement.memoryDelta.heapUsed)} exceeds threshold ${formatMemorySize(thresholds.maxMemoryBytes)}`);
  }
  
  return {
    passed: violations.length === 0,
    violations
  };
}
