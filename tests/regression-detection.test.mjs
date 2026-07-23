import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectFixtureRegression, detectPerformanceRegression, detectAccuracyRegression, formatRegressionSummary } from './helpers/regression-detection.mjs';
import { saveMetrics, clearMetrics } from './helpers/quality-metrics.mjs';
import { saveBaseline, clearBaseline } from './helpers/baseline-compare.mjs';

describe('Regression Detection', () => {
  
  describe('detectFixtureRegression', () => {
    it('handles missing baseline', async () => {
      const currentResult = {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };
      
      const result = await detectFixtureRegression('test-fixture', currentResult);
      
      assert.strictEqual(result.hasRegression, false);
      assert.strictEqual(result.recommendation, "save_baseline");
      assert.ok(result.message.includes("No baseline"));
    });
    
    it('detects matrix regression', async () => {
      // Save baseline
      await saveBaseline('test-fixture-regression', {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      });
      
      const currentResult = {
        matrix: [[0, 1], [1, 0]], // Different matrix
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };
      
      const result = await detectFixtureRegression('test-fixture-regression', currentResult);
      
      assert.strictEqual(result.hasRegression, true);
      assert.strictEqual(result.regressions.length, 1);
      assert.strictEqual(result.regressions[0].type, "accuracy");
      
      await clearBaseline('test-fixture-regression');
    });
    
    it('detects no regression when matching baseline', async () => {
      // Save baseline
      await saveBaseline('test-fixture-match', {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      });
      
      const currentResult = {
        matrix: [[1, 0], [0, 1]], // Same matrix
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };
      
      const result = await detectFixtureRegression('test-fixture-match', currentResult);
      
      assert.strictEqual(result.hasRegression, false);
      assert.strictEqual(result.baselineMatched, true);
      
      await clearBaseline('test-fixture-match');
    });
  });
  
  describe('detectPerformanceRegression', () => {
    it('handles no performance history', async () => {
      await clearMetrics();
      
      const result = await detectPerformanceRegression('test-fixture-perf', 100, 1024);
      
      assert.strictEqual(result.hasRegression, false);
      assert.ok(result.message.includes("No performance history"));
    });
    
    it('detects duration regression', async () => {
      await clearMetrics();
      
      // Add historical metrics with lower duration
      await saveMetrics({
        timestamp: new Date().toISOString(),
        fixtureId: 'test-fixture-perf-reg',
        tier: 'core',
        accuracy: { accuracyRate: "0.9000", f1Score: "0.9500" },
        reliability: { overallMatch: true },
        performance: { durationMs: 50, memoryDeltaBytes: 1024 },
        status: 'partial',
        boardDetected: true,
        boardUsable: true,
        estimatedCellCount: 81
      });
      
      await saveMetrics({
        timestamp: new Date().toISOString(),
        fixtureId: 'test-fixture-perf-reg',
        tier: 'core',
        accuracy: { accuracyRate: "0.9000", f1Score: "0.9500" },
        reliability: { overallMatch: true },
        performance: { durationMs: 55, memoryDeltaBytes: 1024 },
        status: 'partial',
        boardDetected: true,
        boardUsable: true,
        estimatedCellCount: 81
      });
      
      // Current duration is significantly higher (20% threshold)
      const result = await detectPerformanceRegression('test-fixture-perf-reg', 70, 1024);
      
      assert.strictEqual(result.hasRegression, true);
      assert.strictEqual(result.regressions.length, 1);
      assert.strictEqual(result.regressions[0].metric, "duration");
      
      await clearMetrics();
    });
    
    it('detects no regression when within threshold', async () => {
      await clearMetrics();
      
      // Add historical metrics
      await saveMetrics({
        timestamp: new Date().toISOString(),
        fixtureId: 'test-fixture-perf-ok',
        tier: 'core',
        accuracy: { accuracyRate: "0.9000", f1Score: "0.9500" },
        reliability: { overallMatch: true },
        performance: { durationMs: 100, memoryDeltaBytes: 1024 },
        status: 'partial',
        boardDetected: true,
        boardUsable: true,
        estimatedCellCount: 81
      });
      
      // Current duration is slightly higher but within threshold
      const result = await detectPerformanceRegression('test-fixture-perf-ok', 110, 1024);
      
      assert.strictEqual(result.hasRegression, false);
      
      await clearMetrics();
    });
  });
  
  describe('detectAccuracyRegression', () => {
    it('handles no accuracy history', async () => {
      await clearMetrics();
      
      const result = await detectAccuracyRegression('test-fixture-acc', 0.9);
      
      assert.strictEqual(result.hasRegression, false);
      assert.ok(result.message.includes("No accuracy history"));
    });
    
    it('detects accuracy regression', async () => {
      await clearMetrics();
      
      // Add historical metrics with high accuracy
      await saveMetrics({
        timestamp: new Date().toISOString(),
        fixtureId: 'test-fixture-acc-reg',
        tier: 'core',
        accuracy: { accuracyRate: "0.9500", f1Score: "0.9700" },
        reliability: { overallMatch: true },
        performance: { durationMs: 100, memoryDeltaBytes: 1024 },
        status: 'partial',
        boardDetected: true,
        boardUsable: true,
        estimatedCellCount: 81
      });
      
      // Current accuracy dropped significantly (5% threshold)
      const result = await detectAccuracyRegression('test-fixture-acc-reg', 0.85);
      
      assert.strictEqual(result.hasRegression, true);
      assert.strictEqual(result.regression.type, "accuracy");
      assert.strictEqual(result.regression.severity, "high");
      
      await clearMetrics();
    });
    
    it('detects no regression when accuracy stable', async () => {
      await clearMetrics();
      
      // Add historical metrics
      await saveMetrics({
        timestamp: new Date().toISOString(),
        fixtureId: 'test-fixture-acc-ok',
        tier: 'core',
        accuracy: { accuracyRate: "0.9000", f1Score: "0.9500" },
        reliability: { overallMatch: true },
        performance: { durationMs: 100, memoryDeltaBytes: 1024 },
        status: 'partial',
        boardDetected: true,
        boardUsable: true,
        estimatedCellCount: 81
      });
      
      // Current accuracy is similar
      const result = await detectAccuracyRegression('test-fixture-acc-ok', 0.89);
      
      assert.strictEqual(result.hasRegression, false);
      
      await clearMetrics();
    });
  });
  
  describe('formatRegressionSummary', () => {
    it('formats regression report', () => {
      const report = {
        timestamp: "2024-01-01T00:00:00.000Z",
        totalFixtures: 10,
        regressions: [
          {
            fixtureId: "fixture-1",
            tier: "core",
            regressions: [
              { severity: "high", message: "Matrix output differs", details: ["row 1"] }
            ]
          }
        ],
        improvements: [],
        newBaselines: ["fixture-2"],
        summary: {
          withRegressions: 1,
          withImprovements: 0,
          needsBaseline: 1,
          healthy: 8
        }
      };
      
      const summary = formatRegressionSummary(report);
      
      assert.ok(summary.includes("Regression Detection Report"));
      assert.ok(summary.includes("Total fixtures: 10"));
      assert.ok(summary.includes("Regressions: 1"));
      assert.ok(summary.includes("fixture-1"));
      assert.ok(summary.includes("HIGH: Matrix output differs"));
      assert.ok(summary.includes("New baselines: 1"));
      assert.ok(summary.includes("✗ 1 regression(s) detected"));
    });
    
    it('formats healthy report', () => {
      const report = {
        timestamp: "2024-01-01T00:00:00.000Z",
        totalFixtures: 10,
        regressions: [],
        improvements: [],
        newBaselines: [],
        summary: {
          withRegressions: 0,
          withImprovements: 0,
          needsBaseline: 0,
          healthy: 10
        }
      };
      
      const summary = formatRegressionSummary(report);
      
      assert.ok(summary.includes("Healthy: 10"));
      assert.ok(summary.includes("✓ No regressions detected"));
      assert.ok(summary.includes("Regressions: 0"));
    });
  });
});
