import { loadBaseline, compareWithBaseline, saveBaseline } from "./baseline-compare.mjs";
import { loadMetrics, generateQualityReport } from "./quality-metrics.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const regressionDir = path.join(rootDir, "tests", "regression");
const regressionReportPath = path.join(regressionDir, "latest-report.json");

/**
 * Initialize regression detection directory
 */
export async function initRegressionDir() {
  await fs.mkdir(regressionDir, { recursive: true });
}

/**
 * Regression thresholds
 */
const defaultThresholds = {
  accuracyRegression: 0.05, // 5% drop in accuracy
  performanceRegression: 1.2, // 20% increase in duration
  memoryRegression: 1.3, // 30% increase in memory
  reliabilityRegression: 0.1 // 10% drop in reliability rate
};

/**
 * Detect regression for a single fixture
 */
export async function detectFixtureRegression(fixtureId, currentResult, thresholds = defaultThresholds) {
  const baseline = await loadBaseline(fixtureId);
  
  if (!baseline) {
    return {
      fixtureId,
      hasRegression: false,
      hasImprovement: false,
      message: "No baseline available - establishing baseline",
      recommendation: "save_baseline"
    };
  }
  
  const comparison = compareWithBaseline(currentResult, baseline, { tolerance: 0 });
  
  // Check for regressions
  const regressions = [];
  const improvements = [];
  
  // Check matrix regression
  if (!comparison.matched && comparison.differences.includes("Matrix differs from baseline")) {
    regressions.push({
      type: "accuracy",
      severity: "high",
      message: "Matrix output differs from baseline",
      details: comparison.differences
    });
  }
  
  // Check status regression
  if (comparison.differences.includes("Status differs")) {
    regressions.push({
      type: "reliability",
      severity: "high",
      message: "Status changed from baseline",
      details: comparison.differences.filter(d => d.includes("Status"))
    });
  }
  
  // Check board usability regression
  if (comparison.differences.includes("Board usability differs from baseline")) {
    regressions.push({
      type: "reliability",
      severity: "medium",
      message: "Board usability changed from baseline"
    });
  }
  
  return {
    fixtureId,
    hasRegression: regressions.length > 0,
    hasImprovement: improvements.length > 0,
    regressions,
    improvements,
    baselineMatched: comparison.matched,
    differences: comparison.differences
  };
}

/**
 * Detect performance regression from metrics history
 */
export async function detectPerformanceRegression(fixtureId, currentDuration, currentMemory) {
  const metrics = await loadMetrics();
  const fixtureMetrics = metrics.filter(m => m.fixtureId === fixtureId && m.performance);
  
  if (fixtureMetrics.length === 0) {
    return {
      fixtureId,
      hasRegression: false,
      message: "No performance history available"
    };
  }
  
  // Calculate average historical performance
  const avgDuration = fixtureMetrics.reduce((sum, m) => sum + m.performance.durationMs, 0) / fixtureMetrics.length;
  const avgMemory = fixtureMetrics.reduce((sum, m) => sum + m.performance.memoryDeltaBytes, 0) / fixtureMetrics.length;
  
  const regressions = [];
  
  // Check duration regression
  if (currentDuration > avgDuration * defaultThresholds.performanceRegression) {
    regressions.push({
      type: "performance",
      metric: "duration",
      severity: "high",
      current: currentDuration,
      baseline: avgDuration,
      increase: ((currentDuration / avgDuration - 1) * 100).toFixed(2) + "%"
    });
  }
  
  // Check memory regression
  if (currentMemory > avgMemory * defaultThresholds.memoryRegression) {
    regressions.push({
      type: "performance",
      metric: "memory",
      severity: "medium",
      current: currentMemory,
      baseline: avgMemory,
      increase: ((currentMemory / avgMemory - 1) * 100).toFixed(2) + "%"
    });
  }
  
  return {
    fixtureId,
    hasRegression: regressions.length > 0,
    regressions,
    historical: {
      avgDuration,
      avgMemory,
      sampleSize: fixtureMetrics.length
    }
  };
}

/**
 * Detect accuracy regression from metrics history
 */
export async function detectAccuracyRegression(fixtureId, currentAccuracy) {
  const metrics = await loadMetrics();
  const fixtureMetrics = metrics.filter(m => m.fixtureId === fixtureId && m.accuracy);
  
  if (fixtureMetrics.length === 0) {
    return {
      fixtureId,
      hasRegression: false,
      message: "No accuracy history available"
    };
  }
  
  // Calculate average historical accuracy
  const avgAccuracy = fixtureMetrics.reduce((sum, m) => sum + parseFloat(m.accuracy.accuracyRate), 0) / fixtureMetrics.length;
  
  const accuracyDrop = avgAccuracy - currentAccuracy;
  
  if (accuracyDrop > defaultThresholds.accuracyRegression) {
    return {
      fixtureId,
      hasRegression: true,
      regression: {
        type: "accuracy",
        severity: "high",
        current: currentAccuracy,
        baseline: avgAccuracy,
        drop: (accuracyDrop * 100).toFixed(2) + "%"
      },
      historical: {
        avgAccuracy,
        sampleSize: fixtureMetrics.length
      }
    };
  }
  
  return {
    fixtureId,
    hasRegression: false,
    currentAccuracy,
    baselineAccuracy: avgAccuracy
  };
}

/**
 * Run comprehensive regression detection on all fixtures
 */
export async function runRegressionDetection(suite, fixtureRoot, scanSudoku) {
  await initRegressionDir();
  
  const report = {
    timestamp: new Date().toISOString(),
    totalFixtures: 0,
    regressions: [],
    improvements: [],
    newBaselines: [],
    summary: {
      withRegressions: 0,
      withImprovements: 0,
      needsBaseline: 0,
      healthy: 0
    }
  };
  
  for (const tier of ['smoke', 'core', 'hard']) {
    const fixtures = suite.tiers[tier] || [];
    
    for (const fixture of fixtures) {
      report.totalFixtures++;
      
      // Run the test
      const imagePath = path.join(fixtureRoot, fixture.imagePath);
      const imageBuffer = await fs.readFile(imagePath);
      const result = await scanSudoku(new Uint8Array(imageBuffer));
      
      // Detect fixture-level regression
      const fixtureRegression = await detectFixtureRegression(fixture.id, result);
      
      if (fixtureRegression.recommendation === "save_baseline") {
        await saveBaseline(fixture.id, {
          matrix: result.matrix,
          status: result.status,
          diagnostics: result.diagnostics
        });
        report.newBaselines.push(fixture.id);
        report.summary.needsBaseline++;
      } else if (fixtureRegression.hasRegression) {
        report.regressions.push({
          fixtureId: fixture.id,
          tier,
          regressions: fixtureRegression.regressions
        });
        report.summary.withRegressions++;
      } else if (fixtureRegression.hasImprovement) {
        report.improvements.push({
          fixtureId: fixture.id,
          tier,
          improvements: fixtureRegression.improvements
        });
        report.summary.withImprovements++;
      } else {
        report.summary.healthy++;
      }
    }
  }
  
  // Save report
  await fs.writeFile(regressionReportPath, JSON.stringify(report, null, 2), "utf8");
  
  return report;
}

/**
 * Generate regression summary
 */
export function formatRegressionSummary(report) {
  const lines = [];
  
  lines.push("=== Regression Detection Report ===");
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Total fixtures: ${report.totalFixtures}`);
  lines.push("");
  
  lines.push("--- Summary ---");
  lines.push(`Healthy: ${report.summary.healthy}`);
  lines.push(`Regressions: ${report.summary.withRegressions}`);
  lines.push(`Improvements: ${report.summary.withImprovements}`);
  lines.push(`New baselines: ${report.summary.needsBaseline}`);
  lines.push("");
  
  if (report.regressions.length > 0) {
    lines.push("--- Regressions Detected ---");
    for (const reg of report.regressions) {
      lines.push(`[${reg.tier}] ${reg.fixtureId}:`);
      for (const r of reg.regressions) {
        lines.push(`  - ${r.severity.toUpperCase()}: ${r.message}`);
        if (r.details) {
          lines.push(`    Details: ${r.details.join(", ")}`);
        }
      }
    }
    lines.push("");
  }
  
  if (report.improvements.length > 0) {
    lines.push("--- Improvements Detected ---");
    for (const imp of report.improvements) {
      lines.push(`[${imp.tier}] ${imp.fixtureId}:`);
      for (const i of imp.improvements) {
        lines.push(`  - ${i.message}`);
      }
    }
    lines.push("");
  }
  
  if (report.newBaselines.length > 0) {
    lines.push("--- New Baselines Established ---");
    for (const id of report.newBaselines) {
      lines.push(`  - ${id}`);
    }
    lines.push("");
  }
  
  lines.push("--- Overall Status ---");
  if (report.summary.withRegressions === 0) {
    lines.push("✓ No regressions detected");
  } else {
    lines.push(`✗ ${report.summary.withRegressions} regression(s) detected`);
  }
  
  return lines.join("\n");
}

/**
 * Load latest regression report
 */
export async function loadRegressionReport() {
  try {
    const content = await fs.readFile(regressionReportPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Check if regressions exist in latest report
 */
export async function hasRegressions() {
  const report = await loadRegressionReport();
  if (!report) return false;
  return report.summary.withRegressions > 0;
}
