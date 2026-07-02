import fs from "node:fs/promises";
import path from "node:path";
import {
  detectAndWarpBoard,
  extractCell,
  formatMatrix,
  getOpenCv,
  listSampleFiles,
  notesDir,
  outputDir,
  prepareCellForOcr,
  readImageAsMat,
  samplesDir,
  saveMat
} from "./spike-utils.mjs";

const cv = await getOpenCv();
const sampleFiles = await listSampleFiles();
const fixturePath = path.join(process.cwd(), "spikes", "fixtures", "expected-matrices.json");
const expectedMatrices = JSON.parse(await fs.readFile(fixturePath, "utf8"));
const reportPath = path.join(notesDir, "ocr-spike-report-inhouse.md");
await fs.mkdir(outputDir, { recursive: true });

const excludedTrainingFiles = new Set([
  "forum-sudoku-engine2.jpeg",
  "pyimagesearch-thresh.png",
  "stackoverflow-blue-grid.png",
  "stackoverflow-newspaper-thresh.png"
]);
const evaluationTargets = sampleFiles.filter((file) => expectedMatrices[file]);
const sampleCache = await buildSampleCache();
const results = [];

for (const file of evaluationTargets) {
  const trainingSamples = getTrainingSamplesForFile(file);
  const filePath = path.join(samplesDir, file);
  let rgbaMat;
  let width;
  let height;

  try {
    ({ rgbaMat, width, height } = await readImageAsMat(filePath, cv));
  } catch (error) {
    results.push(makeErrorResult(file, error));
    continue;
  }

  const detected = detectAndWarpBoard(rgbaMat, cv);
  if (!detected) {
    results.push({
      file,
      width,
      height,
      boardDetected: false,
      recognizedDigits: 0,
      matrix: null,
      benchmark: null,
      error: null
    });
    rgbaMat.delete();
    continue;
  }

  const { warpedColor, warpedGray, warpedBinary } = detected;
  await saveMat(path.join(outputDir, `${path.parse(file).name}-warped-inhouse.png`), warpedColor, cv);

  const matrix = [];
  let recognizedDigits = 0;

  for (let row = 0; row < 9; row += 1) {
    const currentRow = [];
    for (let col = 0; col < 9; col += 1) {
      const cellGray = extractCell(warpedGray, row, col, cv);
      const cellBinary = extractCell(warpedBinary, row, col, cv);
      const prepared = prepareCellForOcr(cellGray, cv, cellBinary);
      cellGray.delete();
      cellBinary.delete();

      if (prepared.isBlank || !prepared.image) {
        currentRow.push(0);
        continue;
      }

      const feature = buildFeatureVector(prepared.image, cv);
      const digit = classifyNearestNeighbor(feature, trainingSamples);
      if (digit !== 0) {
        recognizedDigits += 1;
      }
      currentRow.push(digit);
      prepared.image.delete();
    }
    matrix.push(currentRow);
  }

  results.push({
    file,
    width,
    height,
    boardDetected: true,
    recognizedDigits,
    matrix,
    benchmark: expectedMatrices[file] ? compareMatrices(matrix, expectedMatrices[file]) : null,
    error: null
  });

  rgbaMat.delete();
  warpedColor.delete();
  warpedGray.delete();
  warpedBinary.delete();
}

const reportLines = [
  "# OCR Spike Report: In-House Classifier Prototype",
  "",
  "This spike prototypes an in-house digit recognizer using extracted labeled cell images and a leave-one-board-out nearest-neighbor classifier on normalized binary features.",
  "",
  `Training pool: ${Object.keys(sampleCache).filter((file) => !excludedTrainingFiles.has(file)).map((file) => `\`${file}\``).join(", ")}`,
  `Excluded from training: ${Array.from(excludedTrainingFiles).map((file) => `\`${file}\``).join(", ")}`,
  `Evaluation targets: ${evaluationTargets.map((file) => `\`${file}\``).join(", ")}`,
  "",
  "## Results"
];

for (const result of results) {
  reportLines.push(`### ${result.file}`);
  reportLines.push("");
  reportLines.push(`- Board detected: ${result.boardDetected ? "yes" : "no"}`);
  if (result.error) {
    reportLines.push(`- Error: ${result.error}`);
  }
  reportLines.push(`- Recognized digits: ${result.recognizedDigits}`);
  if (result.benchmark) {
    reportLines.push(`- Cell accuracy: ${(result.benchmark.cellAccuracy * 100).toFixed(2)}%`);
    reportLines.push(`- Digit recall: ${(result.benchmark.digitRecall * 100).toFixed(2)}%`);
    reportLines.push(`- False positive digits: ${result.benchmark.falsePositiveDigits}`);
    reportLines.push(`- Correct filled digits: ${result.benchmark.correctFilledDigits}`);
  }
  reportLines.push("- Matrix:");
  reportLines.push("");
  reportLines.push("```text");
  reportLines.push(result.matrix ? formatMatrix(result.matrix) : "[board not detected]");
  reportLines.push("```");
  reportLines.push("");
}

const benchmarkedResults = results.filter((result) => result.benchmark);
const cleanPoolResults = benchmarkedResults.filter((result) => !excludedTrainingFiles.has(result.file));
const detectedBoards = results.filter((result) => result.boardDetected);

if (benchmarkedResults.length > 0) {
  reportLines.push("## Outcome");
  reportLines.push("");
  reportLines.push(`- Evaluation target count: ${results.length}`);
  reportLines.push(`- Board detection rate: ${((detectedBoards.length / results.length) * 100).toFixed(2)}%`);
  reportLines.push(`- Full benchmark count: ${benchmarkedResults.length}`);
  const fullCellAccuracy =
    benchmarkedResults.reduce((sum, result) => sum + result.benchmark.cellAccuracy, 0) / benchmarkedResults.length;
  const fullDigitRecall =
    benchmarkedResults.reduce((sum, result) => sum + result.benchmark.digitRecall, 0) / benchmarkedResults.length;
  reportLines.push(`- Full benchmark cell accuracy: ${(fullCellAccuracy * 100).toFixed(2)}%`);
  reportLines.push(`- Full benchmark digit recall: ${(fullDigitRecall * 100).toFixed(2)}%`);
  reportLines.push(`- Clean-pool benchmark count: ${cleanPoolResults.length}`);
  if (cleanPoolResults.length > 0) {
    const cleanPoolCellAccuracy =
      cleanPoolResults.reduce((sum, result) => sum + result.benchmark.cellAccuracy, 0) / cleanPoolResults.length;
    const cleanPoolDigitRecall =
      cleanPoolResults.reduce((sum, result) => sum + result.benchmark.digitRecall, 0) / cleanPoolResults.length;
    reportLines.push(`- Clean-pool cell accuracy: ${(cleanPoolCellAccuracy * 100).toFixed(2)}%`);
    reportLines.push(`- Clean-pool digit recall: ${(cleanPoolDigitRecall * 100).toFixed(2)}%`);
  }
  reportLines.push("");
}

await fs.writeFile(reportPath, `${reportLines.join("\n")}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      reportPath,
      excludedTrainingFiles: Array.from(excludedTrainingFiles),
      evaluationTargets,
      results
    },
    null,
    2
  )
);

async function buildSampleCache() {
  const cache = {};
  for (const [file, expectedMatrix] of Object.entries(expectedMatrices)) {
    cache[file] = await extractLabeledSamples(file, expectedMatrix);
  }
  return cache;
}

function getTrainingSamplesForFile(targetFile) {
  const samples = [];
  for (const [file, entries] of Object.entries(sampleCache)) {
    if (file === targetFile || excludedTrainingFiles.has(file)) {
      continue;
    }
    samples.push(...entries);
  }
  return samples;
}

async function extractLabeledSamples(file, expectedMatrix) {
  const filePath = path.join(samplesDir, file);
  const { rgbaMat } = await readImageAsMat(filePath, cv);
  const detected = detectAndWarpBoard(rgbaMat, cv);
  if (!detected) {
    rgbaMat.delete();
    return [];
  }

  const { warpedColor, warpedGray, warpedBinary } = detected;
  const samples = [];

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const expectedDigit = expectedMatrix[row][col];
      if (expectedDigit === 0) {
        continue;
      }

      const cellGray = extractCell(warpedGray, row, col, cv);
      const cellBinary = extractCell(warpedBinary, row, col, cv);
      const prepared = prepareCellForOcr(cellGray, cv, cellBinary);
      cellGray.delete();
      cellBinary.delete();

      if (!prepared.isBlank && prepared.image) {
        samples.push({
          digit: expectedDigit,
          file,
          row,
          col,
          feature: buildFeatureVector(prepared.image, cv)
        });
        prepared.image.delete();
      }
    }
  }

  rgbaMat.delete();
  warpedColor.delete();
  warpedGray.delete();
  warpedBinary.delete();

  return samples;
}

function buildFeatureVector(mat, cvRef) {
  const resized = new cvRef.Mat();
  cvRef.resize(mat, resized, new cvRef.Size(24, 24), 0, 0, cvRef.INTER_AREA);
  const gray = new cvRef.Mat();
  if (resized.type() === cvRef.CV_8UC4) {
    cvRef.cvtColor(resized, gray, cvRef.COLOR_RGBA2GRAY);
  } else {
    resized.copyTo(gray);
  }

  const vector = [];
  for (let i = 0; i < gray.data.length; i += 1) {
    vector.push(gray.data[i] < 200 ? 1 : 0);
  }

  resized.delete();
  gray.delete();
  return vector;
}

function classifyNearestNeighbor(feature, samples) {
  if (samples.length === 0) {
    return 0;
  }

  let bestDigit = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const sample of samples) {
    const distance = hammingDistance(feature, sample.feature);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDigit = sample.digit;
    }
  }

  return bestDistance < 0.17 ? bestDigit : 0;
}

function hammingDistance(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      diff += 1;
    }
  }
  return diff / a.length;
}

function compareMatrices(actual, expected) {
  let totalCells = 0;
  let correctCells = 0;
  let expectedDigits = 0;
  let correctFilledDigits = 0;
  let falsePositiveDigits = 0;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      totalCells += 1;
      const a = actual[row][col];
      const e = expected[row][col];
      if (a === e) {
        correctCells += 1;
      }
      if (e !== 0) {
        expectedDigits += 1;
        if (a === e) {
          correctFilledDigits += 1;
        }
      } else if (a !== 0) {
        falsePositiveDigits += 1;
      }
    }
  }

  return {
    totalCells,
    correctCells,
    cellAccuracy: correctCells / totalCells,
    expectedDigits,
    correctFilledDigits,
    digitRecall: expectedDigits > 0 ? correctFilledDigits / expectedDigits : 0,
    falsePositiveDigits
  };
}

function makeErrorResult(file, error) {
  return {
    file,
    width: 0,
    height: 0,
    boardDetected: false,
    recognizedDigits: 0,
    matrix: null,
    benchmark: null,
    error: error instanceof Error ? error.message : String(error)
  };
}
