import type {
  DigitLensDiagnostics,
  DigitLensIssueCode,
  DigitLensOptions,
  DigitLensStatus,
} from './api';

export type InternalOptions = Required<DigitLensOptions>;

export type ImageQualityStats = {
  meanLuma: number;
  contrast: number;
  darkPixelRatio: number;
  brightPixelRatio: number;
  colorCast: number;
  edgeStrength: number;
  dynamicRange: number;
};

export type DecodedImage = {
  width: number;
  height: number;
  mimeType: string | null;
  sourceKind: 'file' | 'blob' | 'array-buffer' | 'uint8-array' | 'base64';
  rawBytes: Uint8Array;
  rgba: Uint8Array;
};

export type NormalizedImage = {
  width: number;
  height: number;
  mimeType: string | null;
  rawBytes: Uint8Array;
  rgba: Uint8Array;
  gray: Uint8Array;
  threshold: number;
  normalizationFlags: DigitLensIssueCode[];
  stats: ImageQualityStats;
};

export type BoardCandidate = {
  found: boolean;
  quad: [number, number][];
  confidence: number;
  quadDiagnostics: {
    attempted: boolean;
    confidence: number;
    eligible: boolean;
    topSamples: number;
    bottomSamples: number;
    leftSamples: number;
    rightSamples: number;
    topResidual: number | null;
    bottomResidual: number | null;
    leftResidual: number | null;
    rightResidual: number | null;
    edgeRatio: number | null;
    areaRatio: number | null;
  } | null;
  issues: DigitLensIssueCode[];
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null;
};

export type RectifiedBoard = {
  found: boolean;
  size: number;
  rotationCandidates: Array<0 | 90 | 180 | 270>;
  boardBytes: Uint8Array;
  boardGray: Uint8Array;
  boardBinary: Uint8Array;
  sourceBounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null;
};

export type GridValidation = {
  boardUsable: boolean;
  chosenRotation: 0 | 90 | 180 | 270 | null;
  horizontalLineCount: number | null;
  verticalLineCount: number | null;
  estimatedCellCount: number | null;
  spacingScore: number | null;
  horizontalGridPositions: number[] | null;
  verticalGridPositions: number[] | null;
  warnings: DigitLensIssueCode[];
  issues: DigitLensIssueCode[];
};

export type CellImage = {
  row: number;
  col: number;
  gray: Uint8Array;
  binary: Uint8Array;
  size: number;
  darkPixelRatio: number;
  issues: DigitLensIssueCode[];
};

export type ExtractedCells = {
  cells: CellImage[];
  usableCellCount: number;
  flaggedCellCount: number;
  blankCellCount: number;
};

export type RecognizedCell = {
  row: number;
  col: number;
  digit: number;
  confidence: number | null;
  issues: DigitLensIssueCode[];
};

export type RecognizedBoard = {
  cells: RecognizedCell[];
  recognizedDigitCount: number;
  blankCellCount: number;
  ambiguousCellCount: number;
};

export type AssembledScanResult = {
  status: DigitLensStatus;
  matrix: number[][];
  diagnostics: DigitLensDiagnostics;
};
