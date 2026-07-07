export type DigitLensInput =
  File | Blob | ArrayBuffer | Uint8Array | { base64: string; mimeType?: string };

export type DigitLensStatus =
  'ok' | 'partial' | 'invalid-input' | 'board-not-found' | 'unsupported-board' | 'processing-error';

export type DigitLensIssueCode =
  | 'low_contrast'
  | 'blur'
  | 'shadows'
  | 'glare'
  | 'perspective_distortion'
  | 'rotation_ambiguity'
  | 'weak_grid'
  | 'cropped_board'
  | 'color_interference'
  | 'digit_ambiguity'
  | 'low_confidence_cells';

export type DigitLensValidationCode =
  'invalid_shape' | 'duplicate_in_row' | 'duplicate_in_column' | 'duplicate_in_box' | 'unsolvable';

export type DigitLensDiagnostics = {
  warnings: DigitLensIssueCode[];
  issues: DigitLensIssueCode[];
  boardDetected: boolean;
  boardUsable: boolean;
  rotationDegrees: 0 | 90 | 180 | 270 | null;
  estimatedCellCount: number | null;
};

export type DigitLensValidation = {
  isStructurallyValid: boolean;
  isSolvable: boolean | null;
  messages: DigitLensValidationCode[];
};

export type DigitLensResult = {
  status: DigitLensStatus;
  matrix: number[][];
  diagnostics: DigitLensDiagnostics;
  validation: DigitLensValidation;
};

export type DigitLensOptions = {
  boardSize?: number;
  strictGridValidation?: boolean;
};
