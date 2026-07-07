import type { DigitLensOptions } from '../types/api';
import type { BoardCandidate, NormalizedImage, RectifiedBoard } from '../types/internal';
import { validateGrid } from './validate-grid';

export async function rectifyBoard(
  normalized: NormalizedImage,
  candidate: BoardCandidate,
  options: DigitLensOptions = {}
): Promise<RectifiedBoard> {
  if (!candidate.found || !candidate.bounds) {
    return {
      found: false,
      size: options.boardSize ?? 900,
      rotationCandidates: [0, 90, 180, 270],
      boardBytes: new Uint8Array(),
      boardGray: new Uint8Array(),
      boardBinary: new Uint8Array(),
      sourceBounds: null,
    };
  }

  const size = options.boardSize ?? 900;
  const rectangularGray = sampleBoundsToSquare(
    normalized.gray,
    normalized.width,
    normalized.height,
    candidate.bounds,
    size
  );
  const rectangularBinary = createBoardBinary(rectangularGray, size, normalized);
  let boardGray = rectangularGray;
  let boardBinary = rectangularBinary;

  if (candidate.quad.length === 4 && candidate.quadDiagnostics?.eligible) {
    const quadGray = sampleQuadToSquare(
      normalized.gray,
      normalized.width,
      normalized.height,
      candidate.quad,
      size
    );
    const quadBinary = createBoardBinary(quadGray, size, normalized);
    const rectangularScore = await scoreRectifiedBoard(
      {
        found: true,
        size,
        rotationCandidates: [0, 90, 180, 270],
        boardBytes: rectangularGray,
        boardGray: rectangularGray,
        boardBinary: rectangularBinary,
        sourceBounds: candidate.bounds,
      },
      options
    );
    const quadScore = await scoreRectifiedBoard(
      {
        found: true,
        size,
        rotationCandidates: [0, 90, 180, 270],
        boardBytes: quadGray,
        boardGray: quadGray,
        boardBinary: quadBinary,
        sourceBounds: candidate.bounds,
      },
      options
    );

    if (quadScore > rectangularScore + 0.35) {
      boardGray = quadGray;
      boardBinary = quadBinary;
    }
  }

  return {
    found: true,
    size,
    rotationCandidates: [0, 90, 180, 270],
    boardBytes: boardGray,
    boardGray,
    boardBinary,
    sourceBounds: candidate.bounds,
  };
}

async function scoreRectifiedBoard(
  rectified: RectifiedBoard,
  options: DigitLensOptions
): Promise<number> {
  const validation = await validateGrid(rectified, options);
  const horizontalLines = validation.horizontalLineCount ?? 0;
  const verticalLines = validation.verticalLineCount ?? 0;
  const spacingScore = validation.spacingScore ?? 0;
  const estimatedCellCount = validation.estimatedCellCount ?? 0;
  const usableBoost = validation.boardUsable ? 20 : 0;
  const cellScore = estimatedCellCount / 81;

  return usableBoost + horizontalLines + verticalLines + spacingScore * 6 + cellScore;
}

function createBoardBinary(
  gray: Uint8Array,
  size: number,
  normalized: NormalizedImage
): Uint8Array {
  const globalThreshold = computeOtsuThreshold(gray);
  if (shouldUseGlobalThresholdOnly(normalized)) {
    const binary = new Uint8Array(gray.length);

    for (let index = 0; index < gray.length; index += 1) {
      binary[index] = (gray[index] ?? 255) <= globalThreshold ? 1 : 0;
    }

    return binary;
  }

  const integral = buildIntegralImage(gray, size);
  const binary = new Uint8Array(gray.length);
  const windowRadius = Math.max(12, Math.round(size / 18));
  const localBias = 10;
  const globalBias = 6;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const value = gray[index] ?? 255;
      const localMean = sampleLocalMean(integral, size, x, y, windowRadius);
      const adaptiveThreshold = Math.min(globalThreshold + globalBias, localMean - localBias);
      binary[index] = value <= adaptiveThreshold ? 1 : 0;
    }
  }

  return binary;
}

function shouldUseGlobalThresholdOnly(normalized: NormalizedImage): boolean {
  return normalized.stats.brightPixelRatio >= 0.75 && normalized.stats.darkPixelRatio <= 0.16;
}

function sampleBoundsToSquare(
  source: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  bounds: NonNullable<RectifiedBoard['sourceBounds']>,
  size: number
): Uint8Array {
  const square = new Uint8Array(size * size);
  const sourceLeft = clamp(bounds.left, 0, sourceWidth - 1);
  const sourceTop = clamp(bounds.top, 0, sourceHeight - 1);
  const sourceRight = clamp(bounds.right, sourceLeft + 1, sourceWidth - 1);
  const sourceBottom = clamp(bounds.bottom, sourceTop + 1, sourceHeight - 1);
  const spanX = Math.max(1, sourceRight - sourceLeft);
  const spanY = Math.max(1, sourceBottom - sourceTop);

  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(
      sourceHeight - 1,
      sourceTop + Math.round((y / Math.max(1, size - 1)) * spanY)
    );

    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(
        sourceWidth - 1,
        sourceLeft + Math.round((x / Math.max(1, size - 1)) * spanX)
      );
      square[y * size + x] = source[sourceY * sourceWidth + sourceX] ?? 255;
    }
  }

  return square;
}

function sampleQuadToSquare(
  source: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  quad: [number, number][],
  size: number
): Uint8Array {
  const homography = computeHomography(
    [
      [0, 0],
      [size - 1, 0],
      [size - 1, size - 1],
      [0, size - 1],
    ],
    quad
  );

  if (!homography) {
    return sampleBoundsToSquare(
      source,
      sourceWidth,
      sourceHeight,
      {
        left: Math.round(Math.min(...quad.map(point => point[0]))),
        top: Math.round(Math.min(...quad.map(point => point[1]))),
        right: Math.round(Math.max(...quad.map(point => point[0]))),
        bottom: Math.round(Math.max(...quad.map(point => point[1]))),
      },
      size
    );
  }

  const square = new Uint8Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourcePoint = applyHomography(homography, x, y);
      const sourceX = clamp(Math.round(sourcePoint.x), 0, sourceWidth - 1);
      const sourceY = clamp(Math.round(sourcePoint.y), 0, sourceHeight - 1);
      square[y * size + x] = source[sourceY * sourceWidth + sourceX] ?? 255;
    }
  }

  return square;
}

function computeOtsuThreshold(gray: Uint8Array): number {
  const histogram = new Uint32Array(256);

  for (const value of gray) {
    histogram[value] += 1;
  }

  const total = gray.length;
  let sum = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    sum += index * (histogram[index] ?? 0);
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let bestThreshold = 127;
  let bestVariance = -1;

  for (let index = 0; index < histogram.length; index += 1) {
    weightBackground += histogram[index] ?? 0;
    if (weightBackground === 0) {
      continue;
    }

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) {
      break;
    }

    sumBackground += index * (histogram[index] ?? 0);
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) *
      (meanBackground - meanForeground);

    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = index;
    }
  }

  return bestThreshold;
}

function buildIntegralImage(gray: Uint8Array, size: number): Float64Array {
  const integral = new Float64Array((size + 1) * (size + 1));

  for (let y = 1; y <= size; y += 1) {
    let rowSum = 0;

    for (let x = 1; x <= size; x += 1) {
      rowSum += gray[(y - 1) * size + (x - 1)] ?? 0;
      integral[y * (size + 1) + x] = integral[(y - 1) * (size + 1) + x] + rowSum;
    }
  }

  return integral;
}

function sampleLocalMean(
  integral: Float64Array,
  size: number,
  x: number,
  y: number,
  radius: number
): number {
  const left = clamp(x - radius, 0, size - 1);
  const top = clamp(y - radius, 0, size - 1);
  const right = clamp(x + radius, 0, size - 1);
  const bottom = clamp(y + radius, 0, size - 1);
  const stride = size + 1;
  const sum =
    integral[(bottom + 1) * stride + (right + 1)] -
    integral[top * stride + (right + 1)] -
    integral[(bottom + 1) * stride + left] +
    integral[top * stride + left];
  const area = Math.max(1, (right - left + 1) * (bottom - top + 1));

  return sum / area;
}

function computeHomography(
  source: [number, number][],
  destination: [number, number][]
): [number, number, number, number, number, number, number, number] | null {
  const matrix: number[][] = [];
  const vector: number[] = [];

  for (let index = 0; index < 4; index += 1) {
    const [sx, sy] = source[index];
    const [dx, dy] = destination[index];

    matrix.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    vector.push(dx);
    matrix.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    vector.push(dy);
  }

  const solution = solveLinearSystem(matrix, vector);
  if (!solution) {
    return null;
  }

  return [
    solution[0],
    solution[1],
    solution[2],
    solution[3],
    solution[4],
    solution[5],
    solution[6],
    solution[7],
  ];
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;

    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[pivotRow][pivot])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][pivot]) < 1e-8) {
      return null;
    }

    if (pivotRow !== pivot) {
      const temporary = augmented[pivot];
      augmented[pivot] = augmented[pivotRow];
      augmented[pivotRow] = temporary;
    }

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];
      if (factor === 0) {
        continue;
      }

      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map(row => row[size]);
}

function applyHomography(
  homography: [number, number, number, number, number, number, number, number],
  x: number,
  y: number
): { x: number; y: number } {
  const [h11, h12, h13, h21, h22, h23, h31, h32] = homography;
  const denominator = h31 * x + h32 * y + 1;

  if (Math.abs(denominator) < 1e-8) {
    return { x, y };
  }

  return {
    x: (h11 * x + h12 * y + h13) / denominator,
    y: (h21 * x + h22 * y + h23) / denominator,
  };
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
