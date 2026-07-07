import type { DigitLensDiagnostics, DigitLensStatus } from '../types/api';

export function createEmptyDiagnostics(): DigitLensDiagnostics {
  return {
    warnings: [],
    issues: [],
    boardDetected: false,
    boardUsable: false,
    rotationDegrees: null,
    estimatedCellCount: null,
  };
}

export function finalizeStatus(
  diagnostics: DigitLensDiagnostics,
  fallbackStatus: Extract<
    DigitLensStatus,
    'ok' | 'partial' | 'processing-error' | 'unsupported-board'
  >
): DigitLensStatus {
  if (!diagnostics.boardDetected) {
    return 'board-not-found';
  }

  if (!diagnostics.boardUsable) {
    return 'unsupported-board';
  }

  if (diagnostics.issues.length > 0) {
    return 'partial';
  }

  return fallbackStatus;
}
