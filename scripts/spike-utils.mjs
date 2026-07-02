import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import cvModule from "@techstark/opencv-js";
import { Jimp } from "jimp";

export const rootDir = process.cwd();
export const samplesDir = path.join(rootDir, "spikes", "samples");
export const notesDir = path.join(rootDir, "spikes", "notes");
export const outputDir = path.join(rootDir, "spikes", "output");

export async function listSampleFiles() {
  return (await fs.readdir(samplesDir))
    .filter((file) => !file.startsWith("."))
    .sort();
}

export async function getOpenCv() {
  if (cvModule instanceof Promise) {
    return cvModule;
  }

  if (cvModule.Mat) {
    return cvModule;
  }

  await new Promise((resolve) => {
    cvModule.onRuntimeInitialized = () => resolve();
  });

  return cvModule;
}

export async function readImageAsMat(filePath, cvRef) {
  const image = await Jimp.read(filePath);
  const { width, height, data } = image.bitmap;
  const rgbaMat = new cvRef.Mat(height, width, cvRef.CV_8UC4);
  rgbaMat.data.set(data);
  return { rgbaMat, width, height };
}

export async function saveMat(filePath, mat, cvRef) {
  const png = await matToPngBuffer(mat, cvRef);
  await fs.writeFile(filePath, png);
}

export async function matToPngBuffer(mat, cvRef) {
  let rgba = mat;
  let created = false;

  if (mat.type() !== cvRef.CV_8UC4) {
    rgba = new cvRef.Mat();
    if (mat.type() === cvRef.CV_8UC1) {
      cvRef.cvtColor(mat, rgba, cvRef.COLOR_GRAY2RGBA);
    } else {
      cvRef.cvtColor(mat, rgba, cvRef.COLOR_RGB2RGBA);
    }
    created = true;
  }

  const buffer = Buffer.from(rgba.data);
  const image = new Jimp({ width: rgba.cols, height: rgba.rows, data: buffer });
  const png = await image.getBuffer("image/png");

  if (created) {
    rgba.delete();
  }

  return png;
}

export function detectAndWarpBoard(srcRgba, cvRef) {
  const gray = new cvRef.Mat();
  cvRef.cvtColor(srcRgba, gray, cvRef.COLOR_RGBA2GRAY);
  let boardMaskCandidates = [];
  let bestQuad = findPrimaryBoardQuad(gray, srcRgba.rows * srcRgba.cols, cvRef);

  if (!bestQuad) {
    boardMaskCandidates = buildBoardMaskCandidates(srcRgba, gray, cvRef);
    bestQuad = findBestBoardQuad(boardMaskCandidates, srcRgba.cols, srcRgba.rows, cvRef);
  }

  if (!bestQuad) {
    gray.delete();
    for (const candidate of boardMaskCandidates) {
      candidate.delete();
    }
    return null;
  }

  const ordered = orderQuadPoints(bestQuad.data32S);
  const size = 900;
  const srcTri = cvRef.matFromArray(4, 1, cvRef.CV_32FC2, ordered.flat());
  const dstTri = cvRef.matFromArray(
    4,
    1,
    cvRef.CV_32FC2,
    [0, 0, size - 1, 0, size - 1, size - 1, 0, size - 1]
  );
  const transform = cvRef.getPerspectiveTransform(srcTri, dstTri);

  const warpedColor = new cvRef.Mat();
  cvRef.warpPerspective(
    srcRgba,
    warpedColor,
    transform,
    new cvRef.Size(size, size),
    cvRef.INTER_LINEAR,
    cvRef.BORDER_CONSTANT,
    new cvRef.Scalar()
  );

  const warpedGray = new cvRef.Mat();
  const warpedBinary = new cvRef.Mat();
  cvRef.cvtColor(warpedColor, warpedGray, cvRef.COLOR_RGBA2GRAY);
  cvRef.adaptiveThreshold(
    warpedGray,
    warpedBinary,
    255,
    cvRef.ADAPTIVE_THRESH_GAUSSIAN_C,
    cvRef.THRESH_BINARY_INV,
    11,
    2
  );

  gray.delete();
  for (const candidate of boardMaskCandidates) {
    candidate.delete();
  }
  bestQuad.delete();
  srcTri.delete();
  dstTri.delete();
  transform.delete();
  return { warpedColor, warpedGray, warpedBinary };
}

function findPrimaryBoardQuad(gray, imageArea, cvRef) {
  const blurred = new cvRef.Mat();
  const binary = new cvRef.Mat();
  const contours = new cvRef.MatVector();
  const hierarchy = new cvRef.Mat();

  cvRef.GaussianBlur(gray, blurred, new cvRef.Size(5, 5), 0);
  cvRef.adaptiveThreshold(
    blurred,
    binary,
    255,
    cvRef.ADAPTIVE_THRESH_GAUSSIAN_C,
    cvRef.THRESH_BINARY_INV,
    11,
    2
  );
  cvRef.findContours(binary, contours, hierarchy, cvRef.RETR_EXTERNAL, cvRef.CHAIN_APPROX_SIMPLE);

  let bestQuad = null;
  let maxArea = 0;

  for (let i = 0; i < contours.size(); i += 1) {
    const contour = contours.get(i);
    const area = cvRef.contourArea(contour);

    if (area < Math.max(imageArea * 0.08, 50000)) {
      contour.delete();
      continue;
    }

    const peri = cvRef.arcLength(contour, true);
    const approx = new cvRef.Mat();
    cvRef.approxPolyDP(contour, approx, 0.02 * peri, true);

    if (approx.rows === 4 && area > maxArea) {
      if (bestQuad) {
        bestQuad.delete();
      }
      bestQuad = approx;
      maxArea = area;
    } else {
      approx.delete();
    }

    contour.delete();
  }

  blurred.delete();
  binary.delete();
  contours.delete();
  hierarchy.delete();
  return bestQuad;
}

export function extractCell(sourceBoard, row, col, cvRef, marginRatio = 0.18) {
  const cellSize = Math.floor(sourceBoard.rows / 9);
  const margin = Math.floor(cellSize * marginRatio);
  const x = col * cellSize + margin;
  const y = row * cellSize + margin;
  const w = cellSize - margin * 2;
  const h = cellSize - margin * 2;
  const roi = sourceBoard.roi(new cvRef.Rect(x, y, w, h));
  const scaled = new cvRef.Mat();
  cvRef.resize(roi, scaled, new cvRef.Size(w * 3, h * 3), 0, 0, cvRef.INTER_NEAREST);
  roi.delete();
  return scaled;
}

export function isThresholdLikeBoard(boardGray) {
  let dark = 0;
  let bright = 0;
  let mid = 0;

  for (let i = 0; i < boardGray.data.length; i += 16) {
    const value = boardGray.data[i];
    if (value <= 40) {
      dark += 1;
    } else if (value >= 215) {
      bright += 1;
    } else {
      mid += 1;
    }
  }

  const total = Math.max(dark + bright + mid, 1);
  const extremeRatio = (dark + bright) / total;
  const midRatio = mid / total;
  return extremeRatio >= 0.72 && midRatio <= 0.28;
}

export function prepareCellForOcr(cellGray, cvRef, cellBinary = null) {
  if (isThresholdLikeCell(cellGray)) {
    const thresholded = prepareCellThresholded(cellGray, cvRef);
    if (thresholded && !thresholded.isBlank && thresholded.image) {
      return thresholded;
    }
  }

  const standard = prepareCellStandard(cellGray, cvRef);
  if (!standard.isBlank && standard.image && standard.activeRatio >= 0.03) {
    return standard;
  }

  const thin = prepareCellThinStroke(cellGray, cellBinary, cvRef);
  if (thin && !thin.isBlank && thin.image) {
    if (standard.image) {
      standard.image.delete();
    }
    return thin;
  }

  return standard;
}

function isThresholdLikeCell(cellGray) {
  let dark = 0;
  let bright = 0;
  let mid = 0;

  for (let i = 0; i < cellGray.data.length; i += 1) {
    const value = cellGray.data[i];
    if (value <= 32) {
      dark += 1;
    } else if (value >= 223) {
      bright += 1;
    } else {
      mid += 1;
    }
  }

  const total = Math.max(cellGray.data.length, 1);
  const extremeRatio = (dark + bright) / total;
  const midRatio = mid / total;
  return extremeRatio >= 0.7 && midRatio <= 0.3;
}

function prepareCellStandard(cellGray, cvRef) {
  const blurred = new cvRef.Mat();
  const binary = new cvRef.Mat();
  const opened = new cvRef.Mat();
  const inverted = new cvRef.Mat();
  const contours = new cvRef.MatVector();
  const hierarchy = new cvRef.Mat();

  cvRef.GaussianBlur(cellGray, blurred, new cvRef.Size(3, 3), 0);
  cvRef.threshold(
    blurred,
    binary,
    0,
    255,
    cvRef.THRESH_BINARY_INV + cvRef.THRESH_OTSU
  );
  const kernel = cvRef.getStructuringElement(cvRef.MORPH_RECT, new cvRef.Size(3, 3));
  cvRef.morphologyEx(binary, opened, cvRef.MORPH_OPEN, kernel);
  kernel.delete();

  const activeRatio = cvRef.countNonZero(opened) / (opened.rows * opened.cols);
  if (activeRatio < 0.02) {
    blurred.delete();
    binary.delete();
    opened.delete();
    inverted.delete();
    contours.delete();
    hierarchy.delete();
    return { isBlank: true, image: null, activeRatio };
  }

  cvRef.findContours(opened, contours, hierarchy, cvRef.RETR_EXTERNAL, cvRef.CHAIN_APPROX_SIMPLE);

  let bestRect = null;
  let bestArea = 0;

  for (let i = 0; i < contours.size(); i += 1) {
    const contour = contours.get(i);
    const area = cvRef.contourArea(contour);
    if (area > bestArea) {
      bestArea = area;
      bestRect = cvRef.boundingRect(contour);
    }
    contour.delete();
  }

  if (!bestRect || bestArea < (opened.rows * opened.cols) * 0.015) {
    blurred.delete();
    binary.delete();
    opened.delete();
    inverted.delete();
    contours.delete();
    hierarchy.delete();
    return { isBlank: true, image: null, activeRatio };
  }

  const pad = 8;
  const x = Math.max(bestRect.x - pad, 0);
  const y = Math.max(bestRect.y - pad, 0);
  const w = Math.min(bestRect.width + pad * 2, binary.cols - x);
  const h = Math.min(bestRect.height + pad * 2, binary.rows - y);
  const roi = opened.roi(new cvRef.Rect(x, y, w, h));
  const resized = new cvRef.Mat();
  cvRef.resize(roi, resized, new cvRef.Size(96, 96), 0, 0, cvRef.INTER_CUBIC);
  cvRef.bitwise_not(resized, inverted);

  roi.delete();
  blurred.delete();
  binary.delete();
  opened.delete();
  resized.delete();
  contours.delete();
  hierarchy.delete();

  return { isBlank: false, image: inverted, activeRatio };
}

function prepareCellThresholded(cellGray, cvRef) {
  const source = new cvRef.Mat();
  const linePruned = new cvRef.Mat();
  const merged = new cvRef.Mat();
  const selected = cvRef.Mat.zeros(cellGray.rows, cellGray.cols, cvRef.CV_8UC1);
  const contours = new cvRef.MatVector();
  const hierarchy = new cvRef.Mat();
  const inverted = new cvRef.Mat();

  cvRef.threshold(cellGray, source, 200, 255, cvRef.THRESH_BINARY);
  suppressCellBorder(source, 18);
  pruneLongLines(source, linePruned, cvRef);

  const closeKernel = cvRef.getStructuringElement(cvRef.MORPH_RECT, new cvRef.Size(3, 3));
  const dilateKernel = cvRef.getStructuringElement(cvRef.MORPH_RECT, new cvRef.Size(2, 2));
  cvRef.morphologyEx(linePruned, merged, cvRef.MORPH_CLOSE, closeKernel);
  cvRef.dilate(merged, merged, dilateKernel);
  closeKernel.delete();
  dilateKernel.delete();

  const mergedActiveRatio = cvRef.countNonZero(merged) / (merged.rows * merged.cols);
  if (mergedActiveRatio < 0.002 || mergedActiveRatio > 0.5) {
    source.delete();
    linePruned.delete();
    merged.delete();
    selected.delete();
    contours.delete();
    hierarchy.delete();
    inverted.delete();
    return { isBlank: true, image: null, activeRatio: mergedActiveRatio };
  }

  cvRef.findContours(merged, contours, hierarchy, cvRef.RETR_EXTERNAL, cvRef.CHAIN_APPROX_SIMPLE);
  const selectedContours = collectCentralContours(contours, merged.cols, merged.rows, cvRef, {
    minAreaRatio: 0.002,
    maxAreaRatio: 0.18,
    minAspectRatio: 0.08,
    maxAspectRatio: 1.9,
    maxCenterDistance: 0.42,
    minEdgeMargin: 14
  });

  if (selectedContours.length === 0) {
    source.delete();
    linePruned.delete();
    merged.delete();
    selected.delete();
    contours.delete();
    hierarchy.delete();
    inverted.delete();
    return { isBlank: true, image: null, activeRatio: mergedActiveRatio };
  }

  let minX = merged.cols;
  let minY = merged.rows;
  let maxX = 0;
  let maxY = 0;

  for (const rect of selectedContours) {
    const topLeft = new cvRef.Point(rect.x, rect.y);
    const bottomRight = new cvRef.Point(rect.x + rect.width, rect.y + rect.height);
    cvRef.rectangle(selected, topLeft, bottomRight, new cvRef.Scalar(255), cvRef.FILLED);
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  cvRef.bitwise_and(selected, merged, selected);
  const activeRatio = cvRef.countNonZero(selected) / (selected.rows * selected.cols);
  if (activeRatio < 0.002 || activeRatio > 0.12) {
    source.delete();
    linePruned.delete();
    merged.delete();
    selected.delete();
    contours.delete();
    hierarchy.delete();
    inverted.delete();
    return { isBlank: true, image: null, activeRatio };
  }

  const pad = 10;
  const x = Math.max(minX - pad, 0);
  const y = Math.max(minY - pad, 0);
  const w = Math.min(maxX - minX + pad * 2, selected.cols - x);
  const h = Math.min(maxY - minY + pad * 2, selected.rows - y);
  const roi = selected.roi(new cvRef.Rect(x, y, w, h));
  const resized = new cvRef.Mat();
  cvRef.resize(roi, resized, new cvRef.Size(96, 96), 0, 0, cvRef.INTER_CUBIC);
  cvRef.bitwise_not(resized, inverted);

  roi.delete();
  resized.delete();
  source.delete();
  linePruned.delete();
  merged.delete();
  selected.delete();
  contours.delete();
  hierarchy.delete();

  return { isBlank: false, image: inverted, activeRatio };
}

function prepareCellThinStroke(cellGray, cellBinary, cvRef) {
  const source = new cvRef.Mat();
  const working = new cvRef.Mat();
  const cleaned = new cvRef.Mat();
  const contours = new cvRef.MatVector();
  const hierarchy = new cvRef.Mat();
  const inverted = new cvRef.Mat();

  if (cellBinary) {
    cellBinary.copyTo(source);
  } else {
    const blurred = new cvRef.Mat();
    cvRef.GaussianBlur(cellGray, blurred, new cvRef.Size(3, 3), 0);
    cvRef.threshold(blurred, source, 0, 255, cvRef.THRESH_BINARY_INV + cvRef.THRESH_OTSU);
    blurred.delete();
  }

  suppressCellBorder(source, 5);
  const kernel = cvRef.getStructuringElement(cvRef.MORPH_RECT, new cvRef.Size(2, 2));
  cvRef.morphologyEx(source, working, cvRef.MORPH_CLOSE, kernel);
  kernel.delete();
  pruneLongLines(working, cleaned, cvRef);

  const activeRatio = cvRef.countNonZero(cleaned) / (cleaned.rows * cleaned.cols);
  if (activeRatio < 0.003 || activeRatio > 0.35) {
    source.delete();
    working.delete();
    cleaned.delete();
    contours.delete();
    hierarchy.delete();
    inverted.delete();
    return { isBlank: true, image: null, activeRatio };
  }

  cvRef.findContours(cleaned, contours, hierarchy, cvRef.RETR_EXTERNAL, cvRef.CHAIN_APPROX_SIMPLE);
  const bestRect = findBestCenteredRect(contours, cleaned.cols, cleaned.rows, cvRef, {
    minAreaRatio: 0.0025,
    maxAreaRatio: 0.35,
    minAspectRatio: 0.12,
    maxAspectRatio: 2.2
  });

  if (!bestRect) {
    source.delete();
    working.delete();
    cleaned.delete();
    contours.delete();
    hierarchy.delete();
    inverted.delete();
    return { isBlank: true, image: null, activeRatio };
  }

  const pad = 10;
  const x = Math.max(bestRect.x - pad, 0);
  const y = Math.max(bestRect.y - pad, 0);
  const w = Math.min(bestRect.width + pad * 2, cleaned.cols - x);
  const h = Math.min(bestRect.height + pad * 2, cleaned.rows - y);
  const roi = cleaned.roi(new cvRef.Rect(x, y, w, h));
  const resized = new cvRef.Mat();
  cvRef.resize(roi, resized, new cvRef.Size(96, 96), 0, 0, cvRef.INTER_CUBIC);
  cvRef.bitwise_not(resized, inverted);

  roi.delete();
  resized.delete();
  source.delete();
  working.delete();
  cleaned.delete();
  contours.delete();
  hierarchy.delete();

  return { isBlank: false, image: inverted, activeRatio };
}

export function formatMatrix(matrix) {
  return matrix.map((row) => row.join(" ")).join("\n");
}

function orderQuadPoints(data32S) {
  const points = [];
  for (let i = 0; i < data32S.length; i += 2) {
    points.push({ x: data32S[i], y: data32S[i + 1] });
  }

  const sums = points.map((point) => point.x + point.y);
  const diffs = points.map((point) => point.x - point.y);

  const topLeft = points[sums.indexOf(Math.min(...sums))];
  const bottomRight = points[sums.indexOf(Math.max(...sums))];
  const topRight = points[diffs.indexOf(Math.max(...diffs))];
  const bottomLeft = points[diffs.indexOf(Math.min(...diffs))];

  return [
    [topLeft.x, topLeft.y],
    [topRight.x, topRight.y],
    [bottomRight.x, bottomRight.y],
    [bottomLeft.x, bottomLeft.y]
  ];
}

function buildBoardMaskCandidates(srcRgba, gray, cvRef) {
  const candidates = [];

  const blurred = new cvRef.Mat();
  cvRef.GaussianBlur(gray, blurred, new cvRef.Size(5, 5), 0);

  const adaptive = new cvRef.Mat();
  cvRef.adaptiveThreshold(
    blurred,
    adaptive,
    255,
    cvRef.ADAPTIVE_THRESH_GAUSSIAN_C,
    cvRef.THRESH_BINARY_INV,
    21,
    7
  );
  candidates.push(expandBoardMask(adaptive, 7, cvRef));

  const strongAdaptive = new cvRef.Mat();
  cvRef.adaptiveThreshold(
    blurred,
    strongAdaptive,
    255,
    cvRef.ADAPTIVE_THRESH_MEAN_C,
    cvRef.THRESH_BINARY_INV,
    31,
    9
  );
  candidates.push(expandBoardMask(strongAdaptive, 11, cvRef));

  const edges = new cvRef.Mat();
  cvRef.Canny(blurred, edges, 50, 150);
  candidates.push(expandBoardMask(edges, 9, cvRef));

  const colorMask = buildNonWhiteMask(srcRgba, cvRef);
  candidates.push(expandBoardMask(colorMask, 11, cvRef));

  blurred.delete();
  adaptive.delete();
  strongAdaptive.delete();
  edges.delete();
  colorMask.delete();

  return candidates;
}

function buildNonWhiteMask(srcRgba, cvRef) {
  const gray = new cvRef.Mat();
  const hsv = new cvRef.Mat();
  const hsvChannels = new cvRef.MatVector();
  const darkMask = new cvRef.Mat();
  const satMask = new cvRef.Mat();
  const valMask = new cvRef.Mat();
  const satValMask = new cvRef.Mat();
  const combined = new cvRef.Mat();

  cvRef.cvtColor(srcRgba, gray, cvRef.COLOR_RGBA2GRAY);
  cvRef.cvtColor(srcRgba, hsv, cvRef.COLOR_RGBA2RGB);
  cvRef.cvtColor(hsv, hsv, cvRef.COLOR_RGB2HSV);
  cvRef.split(hsv, hsvChannels);

  cvRef.threshold(gray, darkMask, 215, 255, cvRef.THRESH_BINARY_INV);
  cvRef.threshold(hsvChannels.get(1), satMask, 25, 255, cvRef.THRESH_BINARY);
  cvRef.threshold(hsvChannels.get(2), valMask, 245, 255, cvRef.THRESH_BINARY_INV);
  cvRef.bitwise_and(satMask, valMask, satValMask);
  cvRef.bitwise_or(darkMask, satValMask, combined);

  gray.delete();
  hsv.delete();
  for (let i = 0; i < hsvChannels.size(); i += 1) {
    hsvChannels.get(i).delete();
  }
  hsvChannels.delete();
  darkMask.delete();
  satMask.delete();
  valMask.delete();
  satValMask.delete();
  return combined;
}

function expandBoardMask(mask, kernelSize, cvRef) {
  const expanded = new cvRef.Mat();
  const closed = new cvRef.Mat();
  const opened = new cvRef.Mat();
  const kernel = cvRef.getStructuringElement(cvRef.MORPH_RECT, new cvRef.Size(kernelSize, kernelSize));

  cvRef.dilate(mask, expanded, kernel);
  cvRef.morphologyEx(expanded, closed, cvRef.MORPH_CLOSE, kernel);
  cvRef.morphologyEx(closed, opened, cvRef.MORPH_OPEN, kernel);

  expanded.delete();
  closed.delete();
  kernel.delete();
  return opened;
}

function findBestBoardQuad(maskCandidates, imageWidth, imageHeight, cvRef) {
  const imageArea = imageWidth * imageHeight;
  let bestQuad = null;
  let bestScore = 0;

  for (const mask of maskCandidates) {
    const contours = new cvRef.MatVector();
    const hierarchy = new cvRef.Mat();
    cvRef.findContours(mask, contours, hierarchy, cvRef.RETR_EXTERNAL, cvRef.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      const area = cvRef.contourArea(contour);
      const areaRatio = area / imageArea;

      if (areaRatio < 0.12) {
        contour.delete();
        continue;
      }

      const peri = cvRef.arcLength(contour, true);
      const approx = new cvRef.Mat();
      cvRef.approxPolyDP(contour, approx, 0.02 * peri, true);

      let quad = null;
      if (approx.rows === 4) {
        quad = approx;
      } else {
        approx.delete();
        quad = contourRectToQuad(contour, cvRef);
      }

      const score = scoreQuadCandidate(quad, areaRatio, imageWidth, imageHeight, cvRef);
      if (score > bestScore) {
        if (bestQuad) {
          bestQuad.delete();
        }
        bestQuad = quad;
        bestScore = score;
      } else {
        quad.delete();
      }

      contour.delete();
    }

    contours.delete();
    hierarchy.delete();
  }

  return bestQuad;
}

function contourRectToQuad(contour, cvRef) {
  const rect = cvRef.boundingRect(contour);
  return cvRef.matFromArray(
    4,
    1,
    cvRef.CV_32SC2,
    [
      rect.x, rect.y,
      rect.x + rect.width, rect.y,
      rect.x + rect.width, rect.y + rect.height,
      rect.x, rect.y + rect.height
    ]
  );
}

function scoreQuadCandidate(quad, areaRatio, imageWidth, imageHeight, cvRef) {
  const points = quadPointsToObjects(quad);
  const edgeLengths = [
    pointDistance(points[0], points[1]),
    pointDistance(points[1], points[2]),
    pointDistance(points[2], points[3]),
    pointDistance(points[3], points[0])
  ];
  const minEdge = Math.min(...edgeLengths);
  const maxEdge = Math.max(...edgeLengths);
  if (minEdge <= 0) {
    return 0;
  }

  const balance = minEdge / maxEdge;
  const quadArea = Math.abs(cvRef.contourArea(quad));
  const bounds = cvRef.boundingRect(quad);
  const rectArea = Math.max(bounds.width * bounds.height, 1);
  const fillRatio = quadArea / rectArea;
  const aspectRatio = Math.min(bounds.width, bounds.height) / Math.max(bounds.width, bounds.height);
  const borderMargin = Math.min(bounds.x, bounds.y, imageWidth - (bounds.x + bounds.width), imageHeight - (bounds.y + bounds.height));
  const normalizedMargin = Math.max(borderMargin, 0) / Math.min(imageWidth, imageHeight);
  const marginBonus = Math.min(normalizedMargin / 0.08, 1);

  return areaRatio * 100 + fillRatio * 12 + balance * 8 + aspectRatio * 10 + marginBonus * 12;
}

function quadPointsToObjects(quad) {
  const data = quad.data32S?.length ? quad.data32S : quad.data32F;
  const points = [];
  for (let i = 0; i < data.length; i += 2) {
    points.push({ x: data[i], y: data[i + 1] });
  }
  return points;
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function suppressCellBorder(mat, borderWidth) {
  const width = Math.min(borderWidth, Math.floor(mat.cols / 5));
  const height = Math.min(borderWidth, Math.floor(mat.rows / 5));
  for (let y = 0; y < mat.rows; y += 1) {
    for (let x = 0; x < mat.cols; x += 1) {
      if (x < width || x >= mat.cols - width || y < height || y >= mat.rows - height) {
        mat.ucharPtr(y, x)[0] = 0;
      }
    }
  }
}

function pruneLongLines(source, output, cvRef) {
  const horizontal = new cvRef.Mat();
  const vertical = new cvRef.Mat();
  const lines = new cvRef.Mat();
  const horizontalKernel = cvRef.getStructuringElement(cvRef.MORPH_RECT, new cvRef.Size(18, 1));
  const verticalKernel = cvRef.getStructuringElement(cvRef.MORPH_RECT, new cvRef.Size(1, 18));

  cvRef.morphologyEx(source, horizontal, cvRef.MORPH_OPEN, horizontalKernel);
  cvRef.morphologyEx(source, vertical, cvRef.MORPH_OPEN, verticalKernel);
  cvRef.bitwise_or(horizontal, vertical, lines);
  cvRef.subtract(source, lines, output);

  horizontal.delete();
  vertical.delete();
  lines.delete();
  horizontalKernel.delete();
  verticalKernel.delete();
}

function findBestCenteredRect(contours, width, height, cvRef, options) {
  let bestRect = null;
  let bestScore = 0;
  const totalArea = width * height;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < contours.size(); i += 1) {
    const contour = contours.get(i);
    const area = cvRef.contourArea(contour);
    const rect = cvRef.boundingRect(contour);
    const areaRatio = area / totalArea;
    const aspectRatio = rect.width / Math.max(rect.height, 1);
    const rectCenterX = rect.x + rect.width / 2;
    const rectCenterY = rect.y + rect.height / 2;
    const centerDistance = Math.hypot(rectCenterX - centerX, rectCenterY - centerY) / Math.max(centerX, centerY);
    const score = areaRatio * 10 + (1 - Math.min(centerDistance, 1)) * 4;

    if (
      areaRatio >= options.minAreaRatio &&
      areaRatio <= options.maxAreaRatio &&
      aspectRatio >= options.minAspectRatio &&
      aspectRatio <= options.maxAspectRatio &&
      score > bestScore
    ) {
      bestScore = score;
      bestRect = rect;
    }
  }

  return bestRect;
}

function collectCentralContours(contours, width, height, cvRef, options) {
  const selected = [];
  const totalArea = width * height;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < contours.size(); i += 1) {
    const contour = contours.get(i);
    const area = cvRef.contourArea(contour);
    const rect = cvRef.boundingRect(contour);
    const areaRatio = area / totalArea;
    const aspectRatio = rect.width / Math.max(rect.height, 1);
    const rectCenterX = rect.x + rect.width / 2;
    const rectCenterY = rect.y + rect.height / 2;
    const centerDistance = Math.hypot(rectCenterX - centerX, rectCenterY - centerY) / Math.max(centerX, centerY);
    const edgeMargin = Math.min(rect.x, rect.y, width - (rect.x + rect.width), height - (rect.y + rect.height));

    if (
      areaRatio >= options.minAreaRatio &&
      areaRatio <= options.maxAreaRatio &&
      aspectRatio >= options.minAspectRatio &&
      aspectRatio <= options.maxAspectRatio &&
      centerDistance <= options.maxCenterDistance &&
      edgeMargin >= options.minEdgeMargin
    ) {
      selected.push(rect);
    }
  }

  return selected;
}
