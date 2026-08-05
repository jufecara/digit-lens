import type { DigitLensOptions } from '../types/api';
import type { CellImage, ExtractedCells, GridValidation, RectifiedBoard } from '../types/internal';

const GRID_SIZE = 9;
const NORMALIZED_CELL_SIZE = 32;

export async function extractCells(
  rectified: RectifiedBoard,
  gridValidation: GridValidation,
  _options: DigitLensOptions = {}
): Promise<ExtractedCells> {
  if (!rectified.found || !gridValidation.boardUsable || rectified.boardBinary.length === 0) {
    return {
      cells: [],
      usableCellCount: 0,
      flaggedCellCount: 0,
      blankCellCount: 0,
    };
  }

  const cells: CellImage[] = [];
  let usableCellCount = 0;
  let flaggedCellCount = 0;
  let blankCellCount = 0;
  const rowGridPositions = resolveGridPositions(
    gridValidation.horizontalGridPositions,
    rectified.size
  );
  const columnGridPositions = resolveGridPositions(
    gridValidation.verticalGridPositions,
    rectified.size
  );

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cellBounds = buildCellBounds(rowGridPositions, columnGridPositions, row, col);
      const borderStrip = Math.max(
        1,
        Math.round(Math.min(cellBounds.width, cellBounds.height) * 0.05)
      );

      const gray = cropSquare(
        rectified.boardGray,
        rectified.size,
        cellBounds.left,
        cellBounds.top,
        cellBounds.right,
        cellBounds.bottom
      );
      const binary = cropSquare(
        rectified.boardBinary,
        rectified.size,
        cellBounds.left,
        cellBounds.top,
        cellBounds.right,
        cellBounds.bottom
      );
      const cleanedBinary = suppressGridResiduals(binary, borderStrip);
      const normalizedGray = resizeSquare(gray, NORMALIZED_CELL_SIZE);
      const normalizedBinary = resizeSquare(cleanedBinary, NORMALIZED_CELL_SIZE);
      const darkPixelRatio = measureDarkPixelRatio(normalizedBinary);
      const issues = inferCellIssues(normalizedBinary, darkPixelRatio);

      if (darkPixelRatio < 0.015) {
        blankCellCount += 1;
      } else if (issues.length === 0) {
        usableCellCount += 1;
      } else {
        flaggedCellCount += 1;
      }

      cells.push({
        row,
        col,
        gray: normalizedGray,
        binary: normalizedBinary,
        size: NORMALIZED_CELL_SIZE,
        darkPixelRatio,
        issues,
      });
    }
  }

  return {
    cells,
    usableCellCount,
    flaggedCellCount,
    blankCellCount,
  };
}

function resolveGridPositions(positions: number[] | null, boardSize: number): number[] {
  if (positions && positions.length >= GRID_SIZE + 1) {
    return positions.slice(0, GRID_SIZE + 1);
  }

  const fallback: number[] = [];
  const cellSpan = boardSize / GRID_SIZE;

  for (let index = 0; index <= GRID_SIZE; index += 1) {
    fallback.push(Math.round(index * cellSpan));
  }

  return fallback;
}

function buildCellBounds(
  rowGridPositions: number[],
  columnGridPositions: number[],
  row: number,
  col: number
): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
  const rawLeft = columnGridPositions[col] ?? 0;
  const rawRight = columnGridPositions[col + 1] ?? rawLeft + 1;
  const rawTop = rowGridPositions[row] ?? 0;
  const rawBottom = rowGridPositions[row + 1] ?? rawTop + 1;
  const width = Math.max(1, rawRight - rawLeft);
  const height = Math.max(1, rawBottom - rawTop);
  const marginX = Math.max(2, Math.round(width * 0.14));
  const marginY = Math.max(2, Math.round(height * 0.14));

  return {
    left: rawLeft + marginX,
    top: rawTop + marginY,
    right: rawRight - marginX,
    bottom: rawBottom - marginY,
    width,
    height,
  };
}

function cropSquare(
  source: Uint8Array,
  sourceSize: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): Uint8Array {
  const clampedLeft = clamp(left, 0, sourceSize - 1);
  const clampedTop = clamp(top, 0, sourceSize - 1);
  const clampedRight = clamp(right, clampedLeft + 1, sourceSize);
  const clampedBottom = clamp(bottom, clampedTop + 1, sourceSize);
  const width = Math.max(1, clampedRight - clampedLeft);
  const height = Math.max(1, clampedBottom - clampedTop);
  const output = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      output[y * width + x] = source[(clampedTop + y) * sourceSize + clampedLeft + x] ?? 0;
    }
  }

  return output;
}

function suppressGridResiduals(binary: Uint8Array, borderStrip: number): Uint8Array {
  const size = Math.max(1, Math.round(Math.sqrt(binary.length)));
  const output = Uint8Array.from(binary);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (
        x < borderStrip ||
        y < borderStrip ||
        x >= size - borderStrip ||
        y >= size - borderStrip
      ) {
        output[y * size + x] = 0;
      }
    }
  }

  return output;
}

function resizeSquare(source: Uint8Array, targetSize: number): Uint8Array {
  const sourceSize = Math.max(1, Math.round(Math.sqrt(source.length)));
  const output = new Uint8Array(targetSize * targetSize);

  for (let y = 0; y < targetSize; y += 1) {
    const sourceY = Math.min(
      sourceSize - 1,
      Math.round((y / Math.max(1, targetSize - 1)) * (sourceSize - 1))
    );

    for (let x = 0; x < targetSize; x += 1) {
      const sourceX = Math.min(
        sourceSize - 1,
        Math.round((x / Math.max(1, targetSize - 1)) * (sourceSize - 1))
      );
      output[y * targetSize + x] = source[sourceY * sourceSize + sourceX] ?? 0;
    }
  }

  return output;
}

function measureDarkPixelRatio(binary: Uint8Array): number {
  if (binary.length === 0) {
    return 0;
  }

  let darkPixels = 0;
  for (const value of binary) {
    darkPixels += value;
  }

  return darkPixels / binary.length;
}

function inferCellIssues(binary: Uint8Array, darkPixelRatio: number): CellImage['issues'] {
  if (darkPixelRatio < 0.015) {
    return [];
  }

  const issues: CellImage['issues'] = [];
  const edgeInkRatio = measureEdgeInkRatio(binary);
  const centerInkRatio = measureCenterInkRatio(binary);

  if (edgeInkRatio > 0.12) {
    issues.push('low_confidence_cells');
  }

  if (darkPixelRatio > 0.5 || centerInkRatio > 0.6) {
    issues.push('digit_ambiguity');
  }

  return Array.from(new Set(issues));
}

function measureEdgeInkRatio(binary: Uint8Array): number {
  const size = Math.max(1, Math.round(Math.sqrt(binary.length)));
  const edgeBand = Math.max(2, Math.round(size * 0.12));
  let edgePixels = 0;
  let edgeInk = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x < edgeBand || y < edgeBand || x >= size - edgeBand || y >= size - edgeBand) {
        edgePixels += 1;
        edgeInk += binary[y * size + x] ?? 0;
      }
    }
  }

  return edgePixels > 0 ? edgeInk / edgePixels : 0;
}

function measureCenterInkRatio(binary: Uint8Array): number {
  const size = Math.max(1, Math.round(Math.sqrt(binary.length)));
  const margin = Math.max(4, Math.round(size * 0.22));
  let centerPixels = 0;
  let centerInk = 0;

  for (let y = margin; y < size - margin; y += 1) {
    for (let x = margin; x < size - margin; x += 1) {
      centerPixels += 1;
      centerInk += binary[y * size + x] ?? 0;
    }
  }

  return centerPixels > 0 ? centerInk / centerPixels : 0;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
