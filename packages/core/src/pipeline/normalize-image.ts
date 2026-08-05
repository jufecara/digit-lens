import type { DigitLensOptions } from '../types/api';
import type { DecodedImage, NormalizedImage } from '../types/internal';

export async function normalizeImage(
  decoded: DecodedImage,
  _options: DigitLensOptions = {}
): Promise<NormalizedImage> {
  const gray = createGrayscale(decoded.rgba);
  const stretchedGray = stretchContrast(gray);
  const threshold = computeOtsuThreshold(stretchedGray);
  const stats = measureQuality(stretchedGray, decoded.rgba);
  const normalizationFlags = inferNormalizationFlags(stats);

  return {
    width: decoded.width,
    height: decoded.height,
    mimeType: decoded.mimeType,
    rawBytes: decoded.rawBytes,
    rgba: decoded.rgba,
    gray: stretchedGray,
    threshold,
    normalizationFlags,
    stats,
  };
}

function createGrayscale(rgba: Uint8Array): Uint8Array {
  const gray = new Uint8Array(rgba.length / 4);

  for (
    let sourceIndex = 0, targetIndex = 0;
    sourceIndex < rgba.length;
    sourceIndex += 4, targetIndex += 1
  ) {
    const red = rgba[sourceIndex] ?? 0;
    const green = rgba[sourceIndex + 1] ?? 0;
    const blue = rgba[sourceIndex + 2] ?? 0;
    gray[targetIndex] = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
  }

  return gray;
}

function stretchContrast(gray: Uint8Array): Uint8Array {
  const histogram = new Uint32Array(256);

  for (const value of gray) {
    histogram[value] += 1;
  }

  const lower = findPercentile(histogram, gray.length, 0.03);
  const upper = findPercentile(histogram, gray.length, 0.97);

  if (upper <= lower) {
    return Uint8Array.from(gray);
  }

  const stretched = new Uint8Array(gray.length);
  const scale = 255 / (upper - lower);

  for (let index = 0; index < gray.length; index += 1) {
    const shifted = (gray[index] ?? 0) - lower;
    const normalized = Math.round(shifted * scale);
    stretched[index] = clampByte(normalized);
  }

  return stretched;
}

function findPercentile(histogram: Uint32Array, total: number, percentile: number): number {
  const target = total * percentile;
  let cumulative = 0;

  for (let index = 0; index < histogram.length; index += 1) {
    cumulative += histogram[index] ?? 0;
    if (cumulative >= target) {
      return index;
    }
  }

  return histogram.length - 1;
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
  let maxVariance = -1;
  let threshold = 127;

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

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = index;
    }
  }

  return threshold;
}

function measureQuality(gray: Uint8Array, rgba: Uint8Array) {
  let sum = 0;
  let min = 255;
  let max = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  let colorDelta = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let grayIndex = 0, rgbaIndex = 0; grayIndex < gray.length; grayIndex += 1, rgbaIndex += 4) {
    const value = gray[grayIndex] ?? 0;
    const red = rgba[rgbaIndex] ?? 0;
    const green = rgba[rgbaIndex + 1] ?? 0;
    const blue = rgba[rgbaIndex + 2] ?? 0;

    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
    if (value <= 48) {
      darkPixels += 1;
    }
    if (value >= 224) {
      brightPixels += 1;
    }

    colorDelta += Math.abs(red - green) + Math.abs(green - blue) + Math.abs(red - blue);

    if (grayIndex > 0) {
      edgeSum += Math.abs(value - (gray[grayIndex - 1] ?? value));
      edgeCount += 1;
    }
  }

  const mean = gray.length > 0 ? sum / gray.length : 0;
  let variance = 0;
  for (const value of gray) {
    const delta = value - mean;
    variance += delta * delta;
  }

  return {
    meanLuma: mean,
    contrast: gray.length > 0 ? Math.sqrt(variance / gray.length) : 0,
    darkPixelRatio: gray.length > 0 ? darkPixels / gray.length : 0,
    brightPixelRatio: gray.length > 0 ? brightPixels / gray.length : 0,
    colorCast: rgba.length > 0 ? colorDelta / (gray.length * 3 * 255) : 0,
    edgeStrength: edgeCount > 0 ? edgeSum / edgeCount : 0,
    dynamicRange: max - min,
  };
}

function inferNormalizationFlags(stats: ReturnType<typeof measureQuality>) {
  const flags: NormalizedImage['normalizationFlags'] = [];

  if (stats.contrast < 42 || stats.dynamicRange < 120) {
    flags.push('low_contrast');
  }

  if (stats.edgeStrength < 18) {
    flags.push('blur');
  }

  if (stats.darkPixelRatio > 0.24 && stats.meanLuma < 125) {
    flags.push('shadows');
  }

  if (stats.brightPixelRatio > 0.12 && stats.meanLuma > 145) {
    flags.push('glare');
  }

  if (stats.colorCast > 0.08) {
    flags.push('color_interference');
  }

  return flags;
}

function clampByte(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 255) {
    return 255;
  }

  return value;
}
