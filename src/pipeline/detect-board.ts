import type { DigitLensOptions } from '../types/api';
import type { BoardCandidate, NormalizedImage } from '../types/internal';
import { rectifyBoard } from './rectify-board';
import { validateGrid } from './validate-grid';

export async function detectBoard(
  normalized: NormalizedImage,
  _options: DigitLensOptions = {}
): Promise<BoardCandidate> {
  if (normalized.width < 180 || normalized.height < 180) {
    return {
      found: false,
      quad: [],
      confidence: 0,
      quadDiagnostics: null,
      issues: ['weak_grid'],
      bounds: null,
    };
  }

  const darkThreshold = Math.max(24, normalized.threshold - 12);
  const rowDensity = buildRowDensity(normalized.gray, normalized.width, darkThreshold);
  const columnDensity = buildColumnDensity(
    normalized.gray,
    normalized.width,
    normalized.height,
    darkThreshold
  );
  const rowBounds = findDenseBand(rowDensity);
  const columnBounds = findDenseBand(columnDensity);
  const componentBounds = findLargestDarkComponentBounds(
    normalized.gray,
    normalized.width,
    normalized.height,
    darkThreshold
  );

  const denseBounds =
    rowBounds && columnBounds
      ? {
          left: columnBounds.start,
          right: columnBounds.end,
          top: rowBounds.start,
          bottom: rowBounds.end,
        }
      : null;
  const selectedBounds = selectBoardBounds(
    denseBounds,
    componentBounds,
    normalized.width,
    normalized.height
  );
  const refinedBounds = selectedBounds
    ? await refineBoardBounds(
        normalized,
        normalized.gray,
        normalized.width,
        normalized.height,
        darkThreshold,
        selectedBounds
      )
    : null;

  if (!refinedBounds) {
    return {
      found: false,
      quad: [],
      confidence: 0,
      quadDiagnostics: null,
      issues: uniqueIssues([...normalized.normalizationFlags, 'weak_grid']),
      bounds: null,
    };
  }

  const quadAnalysis = analyzeQuadConfidence(
    normalized.gray,
    normalized.width,
    normalized.height,
    darkThreshold,
    refinedBounds
  );
  const { left, right, top, bottom } = refinedBounds;
  const candidateWidth = right - left + 1;
  const candidateHeight = bottom - top + 1;
  const widthCoverage = candidateWidth / normalized.width;
  const heightCoverage = candidateHeight / normalized.height;
  const aspectDelta =
    Math.abs(candidateWidth - candidateHeight) / Math.max(candidateWidth, candidateHeight);
  const confidence = computeConfidence(
    widthCoverage,
    heightCoverage,
    aspectDelta,
    normalized.stats.contrast
  );

  if (confidence < 0.35) {
    return {
      found: false,
      quad: [],
      confidence,
      quadDiagnostics: quadAnalysis.diagnostics,
      issues: uniqueIssues([...normalized.normalizationFlags, 'weak_grid']),
      bounds: null,
    };
  }

  const issues: BoardCandidate['issues'] = [...normalized.normalizationFlags];
  const edgeMarginX = normalized.width * 0.03;
  const edgeMarginY = normalized.height * 0.03;

  if (
    left <= edgeMarginX ||
    right >= normalized.width - 1 - edgeMarginX ||
    top <= edgeMarginY ||
    bottom >= normalized.height - 1 - edgeMarginY
  ) {
    issues.push('cropped_board');
  }

  if (aspectDelta > 0.16) {
    issues.push('perspective_distortion');
  }

  return {
    found: true,
    quad: quadAnalysis.quad ?? [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ],
    confidence,
    quadDiagnostics: quadAnalysis.diagnostics,
    issues: uniqueIssues(issues),
    bounds: { left, top, right, bottom },
  };
}

type QuadAnalysis = {
  quad: [number, number][] | null;
  diagnostics: NonNullable<BoardCandidate['quadDiagnostics']>;
};

type Point = { x: number; y: number };
type LineFit = { a: number; b: number; residual: number };

function analyzeQuadConfidence(
  gray: Uint8Array,
  width: number,
  height: number,
  darkThreshold: number,
  bounds: NonNullable<BoardCandidate['bounds']>
): QuadAnalysis {
  const topPoints = traceHorizontalEdge(gray, width, bounds, darkThreshold, 'top');
  const bottomPoints = traceHorizontalEdge(gray, width, bounds, darkThreshold, 'bottom');
  const leftPoints = traceVerticalEdge(gray, width, height, bounds, darkThreshold, 'left');
  const rightPoints = traceVerticalEdge(gray, width, height, bounds, darkThreshold, 'right');
  const topLine = fitYFromX(topPoints);
  const bottomLine = fitYFromX(bottomPoints);
  const leftLine = fitXFromY(leftPoints);
  const rightLine = fitXFromY(rightPoints);
  const diagnostics: NonNullable<BoardCandidate['quadDiagnostics']> = {
    attempted: true,
    confidence: 0,
    eligible: false,
    topSamples: topPoints.length,
    bottomSamples: bottomPoints.length,
    leftSamples: leftPoints.length,
    rightSamples: rightPoints.length,
    topResidual: topLine?.residual ?? null,
    bottomResidual: bottomLine?.residual ?? null,
    leftResidual: leftLine?.residual ?? null,
    rightResidual: rightLine?.residual ?? null,
    edgeRatio: null,
    areaRatio: null,
  };

  if (!topLine || !bottomLine || !leftLine || !rightLine) {
    return { quad: null, diagnostics };
  }

  const topLeft = intersectLines(topLine, leftLine);
  const topRight = intersectLines(topLine, rightLine);
  const bottomRight = intersectLines(bottomLine, rightLine);
  const bottomLeft = intersectLines(bottomLine, leftLine);

  if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
    return { quad: null, diagnostics };
  }

  const quad = [topLeft, topRight, bottomRight, bottomLeft];
  const topWidth = distance(topLeft, topRight);
  const bottomWidth = distance(bottomLeft, bottomRight);
  const leftHeight = distance(topLeft, bottomLeft);
  const rightHeight = distance(topRight, bottomRight);
  const minEdge = Math.min(topWidth, bottomWidth, leftHeight, rightHeight);
  const maxEdge = Math.max(topWidth, bottomWidth, leftHeight, rightHeight);
  const edgeRatio = minEdge > 0 ? maxEdge / minEdge : null;
  const quadArea = polygonArea(quad);
  const boundsArea = (bounds.right - bounds.left + 1) * (bounds.bottom - bounds.top + 1);
  const areaRatio = boundsArea > 0 ? quadArea / boundsArea : null;
  const sampleCoverage =
    (topPoints.length + bottomPoints.length + leftPoints.length + rightPoints.length) / (14 * 4);
  const residualValues = [
    topLine.residual,
    bottomLine.residual,
    leftLine.residual,
    rightLine.residual,
  ];
  const residualScore =
    residualValues.length > 0
      ? 1 -
        Math.min(
          1,
          residualValues.reduce((sum, value) => sum + value, 0) / residualValues.length / 18
        )
      : 0;
  const geometryScore =
    edgeRatio === null || areaRatio === null
      ? 0
      : Math.max(0, 1 - Math.max(0, edgeRatio - 1) * 0.85) * clamp(areaRatio, 0.55, 1);
  const confidence = clamp(
    sampleCoverage * 0.45 + residualScore * 0.25 + geometryScore * 0.3,
    0,
    1
  );
  const eligible =
    topPoints.length >= 8 &&
    bottomPoints.length >= 8 &&
    leftPoints.length >= 8 &&
    rightPoints.length >= 8 &&
    residualValues.every(value => value <= 10) &&
    edgeRatio !== null &&
    edgeRatio <= 1.25 &&
    areaRatio !== null &&
    areaRatio >= 0.68 &&
    quad.every(
      point =>
        point.x >= bounds.left - 24 &&
        point.x <= bounds.right + 24 &&
        point.y >= bounds.top - 24 &&
        point.y <= bounds.bottom + 24
    );

  diagnostics.confidence = confidence;
  diagnostics.eligible = eligible;
  diagnostics.edgeRatio = edgeRatio;
  diagnostics.areaRatio = areaRatio;

  return {
    quad: quad.map(point => [point.x, point.y]),
    diagnostics,
  };
}

async function refineBoardBounds(
  normalized: NormalizedImage,
  gray: Uint8Array,
  width: number,
  height: number,
  darkThreshold: number,
  bounds: NonNullable<BoardCandidate['bounds']>
): Promise<NonNullable<BoardCandidate['bounds']>> {
  const rowDensity = buildBoundsRowDensity(gray, width, bounds, darkThreshold);
  const columnDensity = buildBoundsColumnDensity(gray, width, height, bounds, darkThreshold);
  const topEdge = findEdgePeak(rowDensity, 'start');
  const bottomEdge = findEdgePeak(rowDensity, 'end');
  const leftEdge = findEdgePeak(columnDensity, 'start');
  const rightEdge = findEdgePeak(columnDensity, 'end');
  const candidates = [bounds];
  const priorityCandidates: Array<NonNullable<BoardCandidate['bounds']>> = [];
  const top = topEdge !== null ? bounds.top + topEdge : bounds.top;
  const bottom = bottomEdge !== null ? bounds.top + bottomEdge : bounds.bottom;
  const refinedHeight = bottom - top + 1;

  if (refinedHeight > 0) {
    if (leftEdge !== null) {
      const left = bounds.left + leftEdge;
      const right = left + refinedHeight - 1;

      if (right < width) {
        candidates.push({ left, top, right, bottom });
      }
    }

    if (rightEdge !== null) {
      const right = bounds.left + rightEdge;
      const left = right - refinedHeight + 1;

      if (left >= 0) {
        candidates.push({ left, top, right, bottom });
      }
    }
  }

  if (topEdge !== null && bottomEdge !== null) {
    const baseTop = bounds.top + topEdge;
    const baseBottom = bounds.top + bottomEdge;

    // Optimization: Reduce candidate generation by limiting offsets
    for (let topOffset = -1; topOffset <= 1; topOffset += 1) {
      for (let bottomOffset = -1; bottomOffset <= 1; bottomOffset += 1) {
        const adjustedTop = clamp(baseTop + topOffset, 0, height - 1);
        const adjustedBottom = clamp(baseBottom + bottomOffset, adjustedTop + 1, height - 1);
        const size = adjustedBottom - adjustedTop + 1;

        // Optimization: Reduce left offset range and step size
        for (let leftOffset = -20; leftOffset <= 20; leftOffset += 10) {
          const left = clamp(bounds.left + leftOffset, 0, Math.max(0, width - size));
          const right = left + size - 1;

          if (right >= width) {
            continue;
          }

          candidates.push({
            left,
            top: adjustedTop,
            right,
            bottom: adjustedBottom,
          });
        }
      }
    }
  }

  const boundsWidth = bounds.right - bounds.left + 1;
  const boundsHeight = bounds.bottom - bounds.top + 1;
  const inscribedSize = Math.min(boundsWidth, boundsHeight);
  const boundsSkew = Math.abs(boundsWidth - boundsHeight) / Math.max(boundsWidth, boundsHeight);

  if (inscribedSize >= 180 && boundsSkew >= 0.04) {
    const maxLeft = bounds.right - inscribedSize + 1;
    const maxTop = bounds.bottom - inscribedSize + 1;
    const inscribedCandidates = [
      { left: bounds.left, top: bounds.top },
      { left: maxLeft, top: bounds.top },
      { left: bounds.left, top: maxTop },
      { left: maxLeft, top: maxTop },
      {
        left: bounds.left + Math.round((maxLeft - bounds.left) / 2),
        top: bounds.top + Math.round((maxTop - bounds.top) / 2),
      },
    ];

    for (const candidate of inscribedCandidates) {
      const nextCandidate = {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + inscribedSize - 1,
        bottom: candidate.top + inscribedSize - 1,
      };
      candidates.push(nextCandidate);
      priorityCandidates.push(nextCandidate);
    }
  }

  // Optimization: Reduce shortlist size from 12 to 8 to reduce expensive runtime scoring
  const heuristicShortlist = candidates
    .sort(
      (leftCandidate, rightCandidate) =>
        scoreRefinedBounds(rightCandidate, bounds, width, height, gray) -
        scoreRefinedBounds(leftCandidate, bounds, width, height, gray)
    )
    .slice(0, 8);
  const shortlisted = dedupeBounds([...heuristicShortlist, ...priorityCandidates]);

  let best = bounds;
  let bestScore = await scoreRefinedBoundsRuntime(normalized, bounds);

  for (const candidate of shortlisted) {
    const candidateScore = await scoreRefinedBoundsRuntime(normalized, candidate);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best;
}

function findLargestDarkComponentBounds(
  gray: Uint8Array,
  width: number,
  height: number,
  darkThreshold: number
): BoardCandidate['bounds'] {
  const visited = new Uint8Array(gray.length);
  let best: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    score: number;
  } | null = null;

  for (let index = 0; index < gray.length; index += 1) {
    if (visited[index] || (gray[index] ?? 255) > darkThreshold) {
      continue;
    }

    const component = floodFillComponent(gray, visited, width, height, index, darkThreshold);
    if (!component) {
      continue;
    }

    const componentWidth = component.right - component.left + 1;
    const componentHeight = component.bottom - component.top + 1;
    const areaRatio = (componentWidth * componentHeight) / Math.max(1, width * height);
    const aspectDelta =
      Math.abs(componentWidth - componentHeight) / Math.max(componentWidth, componentHeight);
    const edgeTouches = countEdgeTouches(component, width, height);

    if (areaRatio < 0.08 || aspectDelta > 0.45) {
      continue;
    }

    // Ignore page-wide dark components when they simply describe the whole capture surface.
    if (areaRatio > 0.94 && edgeTouches >= 3) {
      continue;
    }

    const score = component.area * Math.max(0.2, 1 - aspectDelta * 1.4);
    if (!best || score > best.score) {
      best = {
        left: component.left,
        right: component.right,
        top: component.top,
        bottom: component.bottom,
        score,
      };
    }
  }

  if (!best) {
    return null;
  }

  return {
    left: best.left,
    right: best.right,
    top: best.top,
    bottom: best.bottom,
  };
}

function floodFillComponent(
  gray: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
  startIndex: number,
  darkThreshold: number
): { left: number; right: number; top: number; bottom: number; area: number } | null {
  const queue = [startIndex];
  visited[startIndex] = 1;
  let area = 0;
  let left = width - 1;
  let right = 0;
  let top = height - 1;
  let bottom = 0;

  while (queue.length > 0) {
    const index = queue.pop();
    if (index === undefined) {
      continue;
    }

    const y = Math.floor(index / width);
    const x = index - y * width;
    area += 1;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);

    const neighbors = [
      x > 0 ? index - 1 : -1,
      x + 1 < width ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y + 1 < height ? index + width : -1,
    ];

    for (const neighbor of neighbors) {
      if (neighbor < 0 || visited[neighbor] || (gray[neighbor] ?? 255) > darkThreshold) {
        continue;
      }

      visited[neighbor] = 1;
      queue.push(neighbor);
    }
  }

  if (area === 0) {
    return null;
  }

  return { left, right, top, bottom, area };
}

function countEdgeTouches(
  component: { left: number; right: number; top: number; bottom: number },
  width: number,
  height: number
): number {
  const touchesLeft = component.left <= 0;
  const touchesTop = component.top <= 0;
  const touchesRight = component.right >= width - 1;
  const touchesBottom = component.bottom >= height - 1;

  return [touchesLeft, touchesTop, touchesRight, touchesBottom].filter(Boolean).length;
}

function selectBoardBounds(
  denseBounds: BoardCandidate['bounds'],
  componentBounds: BoardCandidate['bounds'],
  width: number,
  height: number
): BoardCandidate['bounds'] {
  if (!denseBounds) {
    return componentBounds;
  }

  if (!componentBounds) {
    return denseBounds;
  }

  const denseMetrics = measureBounds(denseBounds, width, height);
  const componentMetrics = measureBounds(componentBounds, width, height);

  if (
    denseMetrics.touchesMultipleEdges &&
    !componentMetrics.touchesAnyEdge &&
    componentMetrics.areaRatio >= 0.18 &&
    componentMetrics.aspectDelta <= denseMetrics.aspectDelta + 0.1
  ) {
    return componentBounds;
  }

  if (
    componentMetrics.areaRatio >= 0.15 &&
    componentMetrics.aspectDelta + 0.08 < denseMetrics.aspectDelta
  ) {
    return componentBounds;
  }

  return denseBounds;
}

function measureBounds(
  bounds: NonNullable<BoardCandidate['bounds']>,
  width: number,
  height: number
): {
  areaRatio: number;
  aspectDelta: number;
  touchesAnyEdge: boolean;
  touchesMultipleEdges: boolean;
} {
  const candidateWidth = bounds.right - bounds.left + 1;
  const candidateHeight = bounds.bottom - bounds.top + 1;
  const areaRatio = (candidateWidth * candidateHeight) / Math.max(1, width * height);
  const aspectDelta =
    Math.abs(candidateWidth - candidateHeight) / Math.max(candidateWidth, candidateHeight);
  const touchesLeft = bounds.left <= 0;
  const touchesTop = bounds.top <= 0;
  const touchesRight = bounds.right >= width - 1;
  const touchesBottom = bounds.bottom >= height - 1;
  const edgeTouches = [touchesLeft, touchesTop, touchesRight, touchesBottom].filter(Boolean).length;

  return {
    areaRatio,
    aspectDelta,
    touchesAnyEdge: edgeTouches > 0,
    touchesMultipleEdges: edgeTouches >= 2,
  };
}

function buildRowDensity(gray: Uint8Array, width: number, darkThreshold: number): Float64Array {
  const height = width > 0 ? Math.floor(gray.length / width) : 0;
  const density = new Float64Array(height);

  for (let row = 0; row < height; row += 1) {
    let darkPixels = 0;
    const rowOffset = row * width;

    for (let column = 0; column < width; column += 1) {
      if ((gray[rowOffset + column] ?? 255) <= darkThreshold) {
        darkPixels += 1;
      }
    }

    density[row] = width > 0 ? darkPixels / width : 0;
  }

  return smoothProfile(density);
}

function buildBoundsRowDensity(
  gray: Uint8Array,
  width: number,
  bounds: NonNullable<BoardCandidate['bounds']>,
  darkThreshold: number
): Float64Array {
  const cropWidth = bounds.right - bounds.left + 1;
  const cropHeight = bounds.bottom - bounds.top + 1;
  const density = new Float64Array(cropHeight);

  for (let row = 0; row < cropHeight; row += 1) {
    let darkPixels = 0;
    const sourceRow = bounds.top + row;

    for (let column = 0; column < cropWidth; column += 1) {
      if ((gray[sourceRow * width + bounds.left + column] ?? 255) <= darkThreshold) {
        darkPixels += 1;
      }
    }

    density[row] = cropWidth > 0 ? darkPixels / cropWidth : 0;
  }

  return smoothProfile(density);
}

function buildColumnDensity(
  gray: Uint8Array,
  width: number,
  height: number,
  darkThreshold: number
): Float64Array {
  const density = new Float64Array(width);

  for (let column = 0; column < width; column += 1) {
    let darkPixels = 0;

    for (let row = 0; row < height; row += 1) {
      if ((gray[row * width + column] ?? 255) <= darkThreshold) {
        darkPixels += 1;
      }
    }

    density[column] = height > 0 ? darkPixels / height : 0;
  }

  return smoothProfile(density);
}

function buildBoundsColumnDensity(
  gray: Uint8Array,
  width: number,
  height: number,
  bounds: NonNullable<BoardCandidate['bounds']>,
  darkThreshold: number
): Float64Array {
  const cropWidth = bounds.right - bounds.left + 1;
  const cropHeight = bounds.bottom - bounds.top + 1;
  const density = new Float64Array(cropWidth);

  for (let column = 0; column < cropWidth; column += 1) {
    let darkPixels = 0;
    const sourceColumn = bounds.left + column;

    for (let row = 0; row < cropHeight; row += 1) {
      if ((gray[(bounds.top + row) * width + sourceColumn] ?? 255) <= darkThreshold) {
        darkPixels += 1;
      }
    }

    density[column] = cropHeight > 0 ? darkPixels / cropHeight : 0;
  }

  return smoothProfile(density);
}

function traceHorizontalEdge(
  gray: Uint8Array,
  width: number,
  bounds: NonNullable<BoardCandidate['bounds']>,
  darkThreshold: number,
  edge: 'top' | 'bottom'
): Point[] {
  const cropWidth = bounds.right - bounds.left + 1;
  const cropHeight = bounds.bottom - bounds.top + 1;
  const searchDepth = Math.max(40, Math.round(cropHeight * 0.22));
  const sampleCount = 16;
  const points: Array<Point & { score: number }> = [];

  for (let index = 1; index < sampleCount - 1; index += 1) {
    const x = Math.round(bounds.left + (index / (sampleCount - 1)) * (cropWidth - 1));
    let bestPoint: (Point & { score: number }) | null = null;
    const startY = edge === 'top' ? bounds.top : Math.max(bounds.top, bounds.bottom - searchDepth);
    const endY = edge === 'top' ? Math.min(bounds.bottom, bounds.top + searchDepth) : bounds.bottom;

    for (let y = startY; y <= endY; y += 1) {
      const score = measureVerticalRun(gray, width, bounds, x, y, darkThreshold);
      if (!bestPoint || score > bestPoint.score) {
        bestPoint = { x, y, score };
      }
    }

    if (bestPoint && bestPoint.score >= 6) {
      points.push(bestPoint);
    }
  }

  return rejectOutliers(points, 'y');
}

function traceVerticalEdge(
  gray: Uint8Array,
  width: number,
  height: number,
  bounds: NonNullable<BoardCandidate['bounds']>,
  darkThreshold: number,
  edge: 'left' | 'right'
): Point[] {
  const cropWidth = bounds.right - bounds.left + 1;
  const cropHeight = bounds.bottom - bounds.top + 1;
  const searchWidth = Math.max(40, Math.round(cropWidth * 0.22));
  const sampleCount = 16;
  const points: Array<Point & { score: number }> = [];

  for (let index = 1; index < sampleCount - 1; index += 1) {
    const y = Math.round(bounds.top + (index / (sampleCount - 1)) * (cropHeight - 1));
    let bestPoint: (Point & { score: number }) | null = null;
    const startX =
      edge === 'left' ? bounds.left : Math.max(bounds.left, bounds.right - searchWidth);
    const endX = edge === 'left' ? Math.min(bounds.right, bounds.left + searchWidth) : bounds.right;

    for (let x = startX; x <= endX; x += 1) {
      const score = measureHorizontalRun(gray, width, height, bounds, x, y, darkThreshold);
      if (!bestPoint || score > bestPoint.score) {
        bestPoint = { x, y, score };
      }
    }

    if (bestPoint && bestPoint.score >= 6) {
      points.push(bestPoint);
    }
  }

  return rejectOutliers(points, 'x');
}

function measureVerticalRun(
  gray: Uint8Array,
  width: number,
  bounds: NonNullable<BoardCandidate['bounds']>,
  x: number,
  y: number,
  darkThreshold: number
): number {
  let score = 0;

  for (let dx = -4; dx <= 4; dx += 1) {
    const sampleX = clamp(x + dx, bounds.left, bounds.right);
    if ((gray[y * width + sampleX] ?? 255) <= darkThreshold) {
      score += 1;
    }
  }

  return score;
}

function measureHorizontalRun(
  gray: Uint8Array,
  width: number,
  height: number,
  bounds: NonNullable<BoardCandidate['bounds']>,
  x: number,
  y: number,
  darkThreshold: number
): number {
  let score = 0;

  for (let dy = -4; dy <= 4; dy += 1) {
    const sampleY = clamp(y + dy, bounds.top, Math.min(bounds.bottom, height - 1));
    if ((gray[sampleY * width + x] ?? 255) <= darkThreshold) {
      score += 1;
    }
  }

  return score;
}

function rejectOutliers<T extends Point & { score: number }>(
  points: T[],
  axis: 'x' | 'y'
): Point[] {
  if (points.length < 5) {
    return points.map(({ x, y }) => ({ x, y }));
  }

  const values = points.map(point => point[axis]).sort((left, right) => left - right);
  const medianValue = values[Math.floor(values.length / 2)] ?? 0;
  const deviations = points
    .map(point => Math.abs(point[axis] - medianValue))
    .sort((left, right) => left - right);
  const medianDeviation = deviations[Math.floor(deviations.length / 2)] ?? 0;
  const tolerance = Math.max(6, medianDeviation * 2.5);

  return points
    .filter(point => Math.abs(point[axis] - medianValue) <= tolerance)
    .map(({ x, y }) => ({ x, y }));
}

function fitYFromX(points: Point[]): LineFit | null {
  return fitLine(points, 'x', 'y');
}

function fitXFromY(points: Point[]): LineFit | null {
  return fitLine(points, 'y', 'x');
}

function fitLine(points: Point[], inputAxis: 'x' | 'y', outputAxis: 'x' | 'y'): LineFit | null {
  if (points.length < 2) {
    return null;
  }

  let sumInput = 0;
  let sumOutput = 0;
  let sumInputSquared = 0;
  let sumCross = 0;

  for (const point of points) {
    const input = point[inputAxis];
    const output = point[outputAxis];
    sumInput += input;
    sumOutput += output;
    sumInputSquared += input * input;
    sumCross += input * output;
  }

  const count = points.length;
  const denominator = count * sumInputSquared - sumInput * sumInput;
  if (Math.abs(denominator) < 1e-6) {
    return null;
  }

  const a = (count * sumCross - sumInput * sumOutput) / denominator;
  const b = (sumOutput - a * sumInput) / count;
  const residual =
    points.reduce((sum, point) => {
      const expected = a * point[inputAxis] + b;
      return sum + Math.abs(point[outputAxis] - expected);
    }, 0) / count;

  return { a, b, residual };
}

function intersectLines(horizontal: LineFit, vertical: LineFit): Point | null {
  const denominator = 1 - horizontal.a * vertical.a;
  if (Math.abs(denominator) < 1e-6) {
    return null;
  }

  const x = (vertical.b + vertical.a * horizontal.b) / denominator;
  const y = horizontal.a * x + horizontal.b;

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function distance(left: Point, right: Point): number {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonArea(points: Point[]): number {
  if (points.length < 3) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
}

function smoothProfile(profile: Float64Array): Float64Array {
  const smoothed = new Float64Array(profile.length);
  const radius = Math.max(1, Math.round(profile.length / 120));

  for (let index = 0; index < profile.length; index += 1) {
    let sum = 0;
    let samples = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const sample = profile[index + offset];
      if (sample === undefined) {
        continue;
      }

      sum += sample;
      samples += 1;
    }

    smoothed[index] = samples > 0 ? sum / samples : 0;
  }

  return smoothed;
}

function findDenseBand(profile: Float64Array): { start: number; end: number } | null {
  let mean = 0;
  let max = 0;

  for (const value of profile) {
    mean += value;
    max = Math.max(max, value);
  }

  mean = profile.length > 0 ? mean / profile.length : 0;
  const threshold = Math.max(mean * 1.35, max * 0.38, 0.04);

  let start = -1;
  let end = -1;

  for (let index = 0; index < profile.length; index += 1) {
    if ((profile[index] ?? 0) >= threshold) {
      start = index;
      break;
    }
  }

  for (let index = profile.length - 1; index >= 0; index -= 1) {
    if ((profile[index] ?? 0) >= threshold) {
      end = index;
      break;
    }
  }

  if (start < 0 || end < 0 || end - start < profile.length * 0.2) {
    return null;
  }

  return { start, end };
}

function computeConfidence(
  widthCoverage: number,
  heightCoverage: number,
  aspectDelta: number,
  contrast: number
): number {
  const coverageScore = Math.min(1, (widthCoverage + heightCoverage) / 1.1);
  const aspectScore = Math.max(0, 1 - aspectDelta * 2.5);
  const contrastScore = Math.min(1, contrast / 64);
  return coverageScore * 0.45 + aspectScore * 0.4 + contrastScore * 0.15;
}

function findEdgePeak(profile: Float64Array, edge: 'start' | 'end'): number | null {
  let mean = 0;
  let max = 0;

  for (const value of profile) {
    mean += value;
    max = Math.max(max, value);
  }

  mean = profile.length > 0 ? mean / profile.length : 0;
  const searchLength = Math.max(24, Math.round(profile.length * 0.2));
  const primaryThreshold = Math.max(mean * 1.55, max * 0.52, 0.11);
  const fallbackThreshold = Math.max(mean * 1.15, max * 0.2, 0.08);

  return (
    locateEdgePeak(profile, edge, searchLength, primaryThreshold) ??
    locateEdgePeak(profile, edge, searchLength, fallbackThreshold)
  );
}

function locateEdgePeak(
  profile: Float64Array,
  edge: 'start' | 'end',
  searchLength: number,
  threshold: number
): number | null {
  if (edge === 'start') {
    for (let index = 0; index < Math.min(profile.length, searchLength); index += 1) {
      if ((profile[index] ?? 0) < threshold) {
        continue;
      }

      return expandPeak(profile, index, threshold);
    }
  } else {
    for (
      let index = profile.length - 1;
      index >= Math.max(0, profile.length - searchLength);
      index -= 1
    ) {
      if ((profile[index] ?? 0) < threshold) {
        continue;
      }

      return expandPeak(profile, index, threshold);
    }
  }

  return null;
}

function expandPeak(profile: Float64Array, index: number, threshold: number): number {
  let start = index;
  let end = index;

  while (start > 0 && (profile[start - 1] ?? 0) >= threshold * 0.72) {
    start -= 1;
  }

  while (end + 1 < profile.length && (profile[end + 1] ?? 0) >= threshold * 0.72) {
    end += 1;
  }

  let bestIndex = index;
  let bestValue = profile[index] ?? 0;

  for (let current = start; current <= end; current += 1) {
    const value = profile[current] ?? 0;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = current;
    }
  }

  return bestIndex;
}

function scoreRefinedBounds(
  candidate: NonNullable<BoardCandidate['bounds']>,
  original: NonNullable<BoardCandidate['bounds']>,
  width: number,
  height: number,
  _gray: Uint8Array
): number {
  const metrics = measureBounds(candidate, width, height);
  const originalCenterX = (original.left + original.right) / 2;
  const originalCenterY = (original.top + original.bottom) / 2;
  const candidateCenterX = (candidate.left + candidate.right) / 2;
  const candidateCenterY = (candidate.top + candidate.bottom) / 2;
  const centerShift =
    Math.abs(candidateCenterX - originalCenterX) / Math.max(1, width) +
    Math.abs(candidateCenterY - originalCenterY) / Math.max(1, height);
  const originalArea = (original.right - original.left + 1) * (original.bottom - original.top + 1);
  const candidateArea =
    (candidate.right - candidate.left + 1) * (candidate.bottom - candidate.top + 1);
  const areaRetention = candidateArea / Math.max(1, originalArea);
  const edgePenalty = metrics.touchesAnyEdge ? 0.08 : 0;

  return (
    (1 - metrics.aspectDelta) * 10 + Math.min(1, areaRetention) * 3 - centerShift * 8 - edgePenalty
  );
}

async function scoreRefinedBoundsRuntime(
  normalized: NormalizedImage,
  bounds: NonNullable<BoardCandidate['bounds']>
): Promise<number> {
  const candidate: BoardCandidate = {
    found: true,
    quad: [
      [bounds.left, bounds.top],
      [bounds.right, bounds.top],
      [bounds.right, bounds.bottom],
      [bounds.left, bounds.bottom],
    ],
    confidence: 1,
    quadDiagnostics: null,
    issues: [],
    bounds,
  };
  const rectified = await rectifyBoard(normalized, candidate, {});
  const validation = await validateGrid(rectified, {});
  const horizontalLines = validation.horizontalLineCount ?? 0;
  const verticalLines = validation.verticalLineCount ?? 0;
  const spacingScore = validation.spacingScore ?? 0;

  return (
    horizontalLines + verticalLines + spacingScore * 4 - Math.abs(horizontalLines - verticalLines)
  );
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

function uniqueIssues(issues: BoardCandidate['issues']): BoardCandidate['issues'] {
  return Array.from(new Set(issues));
}

function dedupeBounds(candidates: Array<NonNullable<BoardCandidate['bounds']>>) {
  const seen = new Set<string>();
  const deduped: Array<NonNullable<BoardCandidate['bounds']>> = [];

  for (const candidate of candidates) {
    const key = `${candidate.left}:${candidate.top}:${candidate.right}:${candidate.bottom}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}
