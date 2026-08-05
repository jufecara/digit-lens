import fs from "node:fs/promises";
import path from "node:path";
import { measurePerformance } from "./performance-measure.mjs";

const rootDir = process.cwd();
const metricsDir = path.join(rootDir, "tests", "metrics");
const metricsFile = path.join(metricsDir, "quality-metrics.jsonl");

/**
 * Initialize metrics directory
 */
export async function initMetricsDir() {
  await fs.mkdir(metricsDir, { recursive: true });
}

/**
 * Collect quality metrics for a single test run
 */
export async function collectMetrics(fixtureId, tier, result, expected, performance = null) {
  const timestamp = new Date().toISOString();
  
  // Calculate accuracy metrics
  const accuracyMetrics = calculateAccuracyMetrics(result.matrix, expected.expectedMatrix);
  
  // Calculate reliability metrics
  const reliabilityMetrics = calculateReliabilityMetrics(result, expected);
  
  const metrics = {
    timestamp,
    fixtureId,
    tier,
    accuracy: accuracyMetrics,
    reliability: reliabilityMetrics,
    performance: performance ? {
      durationMs: performance.durationMs,
      memoryDeltaBytes: performance.memoryDelta.heapUsed
    } : null,
    status: result.status,
    boardDetected: result.diagnostics?.boardDetected,
    boardUsable: result.diagnostics?.boardUsable,
    estimatedCellCount: result.diagnostics?.estimatedCellCount
  };
  
  return metrics;
}

/**
 * Calculate accuracy metrics comparing result matrix to expected matrix
 */
function calculateAccuracyMetrics(actualMatrix, expectedMatrix) {
  let correctCells = 0;
  let totalNonEmptyExpected = 0;
  let totalNonEmptyActual = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const actual = actualMatrix[row][col];
      const expected = expectedMatrix[row][col];
      
      if (expected !== 0) {
        totalNonEmptyExpected++;
        if (actual === expected) {
          correctCells++;
        } else if (actual === 0) {
          falseNegatives++;
        }
      }
      
      if (actual !== 0) {
        totalNonEmptyActual++;
        if (expected === 0) {
          falsePositives++;
        }
      }
    }
  }
  
  const precision = totalNonEmptyActual > 0 ? correctCells / totalNonEmptyActual : 1;
  const recall = totalNonEmptyExpected > 0 ? correctCells / totalNonEmptyExpected : 1;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  return {
    correctCells,
    totalNonEmptyExpected,
    totalNonEmptyActual,
    falsePositives,
    falseNegatives,
    precision: precision.toFixed(4),
    recall: recall.toFixed(4),
    f1Score: f1Score.toFixed(4),
    accuracyRate: totalNonEmptyExpected > 0 ? (correctCells / totalNonEmptyExpected).toFixed(4) : "1.0000"
  };
}

/**
 * Calculate reliability metrics
 */
function calculateReliabilityMetrics(result, expected) {
  const statusMatch = result.status === expected.expectedStatus;
  const boardUsableMatch = result.diagnostics?.boardUsable === expected.expectedDiagnostics.boardUsable;
  const boardDetectedMatch = result.diagnostics?.boardDetected === expected.expectedDiagnostics.boardDetected;
  const structuralValidMatch = result.validation?.isStructurallyValid === expected.expectedValidation.isStructurallyValid;
  
  const validationMessagesMatch = JSON.stringify(result.validation?.messages || []) === 
                                 JSON.stringify(expected.expectedValidation.messages || []);
  
  return {
    statusMatch,
    boardUsableMatch,
    boardDetectedMatch,
    structuralValidMatch,
    validationMessagesMatch,
    overallMatch: statusMatch && boardUsableMatch && boardDetectedMatch && structuralValidMatch && validationMessagesMatch
  };
}

/**
 * Save metrics to file
 */
export async function saveMetrics(metrics) {
  await initMetricsDir();
  const line = JSON.stringify(metrics) + "\n";
  await fs.appendFile(metricsFile, line, "utf8");
}

/**
 * Load all metrics from file
 */
export async function loadMetrics() {
  try {
    const content = await fs.readFile(metricsFile, "utf8");
    const lines = content.trim().split("\n").filter(line => line.length > 0);
    return lines.map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Generate quality metrics report
 */
export async function generateQualityReport() {
  const metrics = await loadMetrics();
  
  if (metrics.length === 0) {
    return { message: "No metrics collected yet" };
  }
  
  // Group by tier
  const byTier = { smoke: [], core: [], hard: [] };
  for (const m of metrics) {
    if (byTier[m.tier]) {
      byTier[m.tier].push(m);
    }
  }
  
  // Calculate aggregate metrics
  const report = {
    totalRuns: metrics.length,
    byTier: {},
    overall: {
      avgAccuracy: 0,
      avgF1Score: 0,
      avgDurationMs: 0,
      reliabilityRate: 0,
      boardDetectionRate: 0,
      boardUsabilityRate: 0
    },
    recent: metrics.slice(-10)
  };
  
  let totalAccuracy = 0;
  let totalF1Score = 0;
  let totalDuration = 0;
  let totalReliable = 0;
  let totalDetected = 0;
  let totalUsable = 0;
  let withPerformance = 0;
  
  for (const tier of ['smoke', 'core', 'hard']) {
    const tierMetrics = byTier[tier];
    if (tierMetrics.length === 0) continue;
    
    const tierAccuracy = tierMetrics.reduce((sum, m) => sum + parseFloat(m.accuracy.accuracyRate), 0) / tierMetrics.length;
    const tierF1Score = tierMetrics.reduce((sum, m) => sum + parseFloat(m.accuracy.f1Score), 0) / tierMetrics.length;
    const tierReliable = tierMetrics.filter(m => m.reliability.overallMatch).length / tierMetrics.length;
    const tierDetected = tierMetrics.filter(m => m.boardDetected).length / tierMetrics.length;
    const tierUsable = tierMetrics.filter(m => m.boardUsable).length / tierMetrics.length;
    
    let tierDuration = 0;
    let withPerf = 0;
    for (const m of tierMetrics) {
      if (m.performance) {
        tierDuration += m.performance.durationMs;
        withPerf++;
      }
    }
    const avgTierDuration = withPerf > 0 ? tierDuration / withPerf : 0;
    
    report.byTier[tier] = {
      count: tierMetrics.length,
      avgAccuracy: tierAccuracy.toFixed(4),
      avgF1Score: tierF1Score.toFixed(4),
      avgDurationMs: avgTierDuration.toFixed(2),
      reliabilityRate: tierReliable.toFixed(4),
      boardDetectionRate: tierDetected.toFixed(4),
      boardUsabilityRate: tierUsable.toFixed(4)
    };
    
    totalAccuracy += tierAccuracy * tierMetrics.length;
    totalF1Score += tierF1Score * tierMetrics.length;
    totalReliable += tierMetrics.filter(m => m.reliability.overallMatch).length;
    totalDetected += tierMetrics.filter(m => m.boardDetected).length;
    totalUsable += tierMetrics.filter(m => m.boardUsable).length;
    
    for (const m of tierMetrics) {
      if (m.performance) {
        totalDuration += m.performance.durationMs;
        withPerformance++;
      }
    }
  }
  
  report.overall.avgAccuracy = (totalAccuracy / metrics.length).toFixed(4);
  report.overall.avgF1Score = (totalF1Score / metrics.length).toFixed(4);
  report.overall.avgDurationMs = withPerformance > 0 ? (totalDuration / withPerformance).toFixed(2) : 0;
  report.overall.reliabilityRate = (totalReliable / metrics.length).toFixed(4);
  report.overall.boardDetectionRate = (totalDetected / metrics.length).toFixed(4);
  report.overall.boardUsabilityRate = (totalUsable / metrics.length).toFixed(4);
  
  return report;
}

/**
 * Clear metrics file
 */
export async function clearMetrics() {
  try {
    await fs.unlink(metricsFile);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Run acceptance test with metrics collection
 */
export async function runTestWithMetrics(fixture, scanSudoku, fixtureRoot) {
  const imagePath = path.join(fixtureRoot, fixture.imagePath);
  const imageBuffer = await fs.readFile(imagePath);
  
  const perf = await measurePerformance(async () => {
    return await scanSudoku(new Uint8Array(imageBuffer));
  });
  
  const metrics = await collectMetrics(
    fixture.id,
    fixture.tier,
    perf.result,
    fixture,
    perf
  );
  
  await saveMetrics(metrics);
  
  return { result: perf.result, metrics };
}
