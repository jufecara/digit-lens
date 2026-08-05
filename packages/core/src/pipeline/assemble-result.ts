import type { DigitLensDiagnostics } from '../types/api';
import type {
  AssembledScanResult,
  ExtractedCells,
  GridValidation,
  RecognizedBoard,
} from '../types/internal';
import { finalizeStatus } from '../diagnostics/summarize-diagnostics';
import { createEmptyMatrix } from '../validation/structural';

export function assembleResult(
  diagnostics: DigitLensDiagnostics,
  gridValidation: GridValidation,
  extractedCells: ExtractedCells,
  recognizedBoard: RecognizedBoard
): AssembledScanResult {
  const nextDiagnostics: DigitLensDiagnostics = {
    warnings: [...diagnostics.warnings],
    issues: [...diagnostics.issues],
    boardDetected: diagnostics.boardDetected,
    boardUsable: gridValidation.boardUsable,
    rotationDegrees: gridValidation.chosenRotation,
    estimatedCellCount: gridValidation.estimatedCellCount,
  };
  const matrix = createEmptyMatrix();

  nextDiagnostics.warnings.push(...gridValidation.warnings);
  nextDiagnostics.issues.push(...gridValidation.issues);

  if (extractedCells.flaggedCellCount > 0) {
    nextDiagnostics.warnings.push('low_confidence_cells');
  }

  const extractionBoardUsable =
    extractedCells.cells.length === 81 && extractedCells.flaggedCellCount <= 24;
  if (!extractionBoardUsable && gridValidation.boardUsable) {
    nextDiagnostics.issues.push('low_confidence_cells');
  }

  for (const cell of recognizedBoard.cells) {
    matrix[cell.row][cell.col] = cell.digit;
  }

  if (recognizedBoard.ambiguousCellCount > 0) {
    nextDiagnostics.warnings.push('digit_ambiguity');
  }

  if (recognizedBoard.ambiguousCellCount > 12) {
    nextDiagnostics.issues.push('digit_ambiguity');
  }

  nextDiagnostics.warnings = Array.from(new Set(nextDiagnostics.warnings));
  nextDiagnostics.issues = Array.from(new Set(nextDiagnostics.issues));
  nextDiagnostics.boardUsable = gridValidation.boardUsable && extractionBoardUsable;

  return {
    status: finalizeStatus(nextDiagnostics, 'partial'),
    matrix,
    diagnostics: nextDiagnostics,
  };
}
