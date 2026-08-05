export type {
  DigitLensDiagnostics,
  DigitLensInput,
  DigitLensIssueCode,
  DigitLensOptions,
  DigitLensResult,
  DigitLensStatus,
  DigitLensValidation,
  DigitLensValidationCode,
} from './types/api';
export { validateStructuralSudoku } from './validation/structural';
export { validateSudokuSolvability } from './validation/solvability';

import type { DigitLensInput, DigitLensOptions, DigitLensResult } from './types/api';
import { createEmptyDiagnostics } from './diagnostics/summarize-diagnostics';
import { decodeInput } from './pipeline/decode-input';
import { normalizeImage } from './pipeline/normalize-image';
import { detectBoard } from './pipeline/detect-board';
import { rectifyBoard } from './pipeline/rectify-board';
import { validateGrid } from './pipeline/validate-grid';
import { extractCells } from './pipeline/extract-cells';
import { recognizeDigits } from './pipeline/recognize-digits';
import { assembleResult } from './pipeline/assemble-result';
import { createEmptyMatrix, validateStructuralSudoku } from './validation/structural';
import { solvabilityNotRun, validateSudokuSolvability } from './validation/solvability';

export async function scanSudoku(
  input: DigitLensInput,
  options: DigitLensOptions = {}
): Promise<DigitLensResult> {
  const diagnostics = createEmptyDiagnostics();
  const matrix = createEmptyMatrix();

  try {
    const decoded = await decodeInput(input, options);
    const normalized = await normalizeImage(decoded, options);
    const boardCandidate = await detectBoard(normalized, options);

    if (!boardCandidate.found) {
      diagnostics.boardDetected = false;
      diagnostics.boardUsable = false;
      diagnostics.issues.push(...boardCandidate.issues);
      return {
        status: 'board-not-found',
        matrix,
        diagnostics,
        validation: {
          isStructurallyValid: false,
          isSolvable: solvabilityNotRun(),
          messages: ['invalid_shape'],
        },
      };
    }

    diagnostics.boardDetected = true;
    diagnostics.warnings.push(...boardCandidate.issues);

    const rectified = await rectifyBoard(normalized, boardCandidate, options);
    const gridValidation = await validateGrid(rectified, options);
    const extractedCells = await extractCells(rectified, gridValidation, options);
    const recognizedBoard = await recognizeDigits(extractedCells, options);
    const assembled = assembleResult(diagnostics, gridValidation, extractedCells, recognizedBoard);
    const structuralValidation = validateStructuralSudoku(assembled.matrix);
    const solvabilityValidation =
      assembled.diagnostics.boardUsable && structuralValidation.isStructurallyValid
        ? validateSudokuSolvability(assembled.matrix)
        : { isSolvable: solvabilityNotRun(), messages: [] as Array<'unsolvable'> };

    return {
      status: assembled.status,
      matrix: assembled.matrix,
      diagnostics: assembled.diagnostics,
      validation: {
        isStructurallyValid:
          assembled.diagnostics.boardUsable && structuralValidation.isStructurallyValid,
        isSolvable: solvabilityValidation.isSolvable,
        messages: assembled.diagnostics.boardUsable
          ? [...structuralValidation.messages, ...solvabilityValidation.messages]
          : ['invalid_shape'],
      },
    };
  } catch (error) {
    diagnostics.boardDetected = false;
    diagnostics.boardUsable = false;

    if (error instanceof Error && error.message === 'DIGIT_LENS_INVALID_INPUT') {
      return {
        status: 'invalid-input',
        matrix,
        diagnostics,
        validation: {
          isStructurallyValid: false,
          isSolvable: solvabilityNotRun(),
          messages: ['invalid_shape'],
        },
      };
    }

    diagnostics.issues.push('weak_grid');
    return {
      status: 'processing-error',
      matrix,
      diagnostics,
      validation: {
        isStructurallyValid: false,
        isSolvable: solvabilityNotRun(),
        messages: ['invalid_shape'],
      },
    };
  }
}
