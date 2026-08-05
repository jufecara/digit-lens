import { describe, it } from 'node:test';
import assert from 'node:assert';
import { collectMetrics, generateQualityReport, clearMetrics } from './helpers/quality-metrics.mjs';

describe('Quality Metrics Collection', () => {

  describe('collectMetrics', () => {
    it('collects complete metrics', async () => {
      const matrix9x9 = Array(9).fill(null).map(() => Array(9).fill(0));
      matrix9x9[0][0] = 1;
      matrix9x9[8][8] = 1;
      
      const result = {
        status: 'partial',
        matrix: matrix9x9,
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 81
        },
        validation: {
          isStructurallyValid: true,
          messages: []
        }
      };
      
      const expected = {
        expectedStatus: 'partial',
        expectedMatrix: matrix9x9,
        expectedDiagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 81
        },
        expectedValidation: {
          isStructurallyValid: true,
          messages: []
        }
      };
      
      const performance = {
        durationMs: 100,
        memoryDelta: { heapUsed: 1024 }
      };
      
      const metrics = await collectMetrics('test-fixture', 'core', result, expected, performance);
      
      assert.strictEqual(metrics.fixtureId, 'test-fixture');
      assert.strictEqual(metrics.tier, 'core');
      assert.strictEqual(metrics.status, 'partial');
      assert.strictEqual(metrics.boardDetected, true);
      assert.strictEqual(metrics.boardUsable, true);
      assert.strictEqual(metrics.estimatedCellCount, 81);
      assert.ok(metrics.accuracy);
      assert.ok(metrics.reliability);
      assert.ok(metrics.performance);
      assert.strictEqual(metrics.performance.durationMs, 100);
    });

    it('collects metrics without performance data', async () => {
      const matrix9x9 = Array(9).fill(null).map(() => Array(9).fill(0));
      matrix9x9[0][0] = 1;
      
      const result = {
        status: 'partial',
        matrix: matrix9x9,
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 81
        },
        validation: {
          isStructurallyValid: true,
          messages: []
        }
      };
      
      const expected = {
        expectedStatus: 'partial',
        expectedMatrix: matrix9x9,
        expectedDiagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 81
        },
        expectedValidation: {
          isStructurallyValid: true,
          messages: []
        }
      };
      
      const metrics = await collectMetrics('test-fixture', 'core', result, expected, null);
      
      assert.strictEqual(metrics.fixtureId, 'test-fixture');
      assert.strictEqual(metrics.performance, null);
    });
  });

  describe('generateQualityReport', () => {
    it('handles empty metrics', async () => {
      await clearMetrics();
      const report = await generateQualityReport();
      
      assert.ok(report.message);
      assert.strictEqual(report.message, "No metrics collected yet");
    });

    it('generates report from collected metrics', async () => {
      await clearMetrics();
      
      // Add some test metrics
      const { saveMetrics } = await import('./helpers/quality-metrics.mjs');
      
      await saveMetrics({
        timestamp: new Date().toISOString(),
        fixtureId: 'test-1',
        tier: 'smoke',
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
        fixtureId: 'test-2',
        tier: 'core',
        accuracy: { accuracyRate: "0.8000", f1Score: "0.8500" },
        reliability: { overallMatch: false },
        performance: { durationMs: 100, memoryDeltaBytes: 2048 },
        status: 'partial',
        boardDetected: true,
        boardUsable: false,
        estimatedCellCount: 64
      });
      
      const report = await generateQualityReport();
      
      assert.strictEqual(report.totalRuns, 2);
      assert.ok(report.byTier.smoke);
      assert.ok(report.byTier.core);
      assert.strictEqual(report.byTier.smoke.count, 1);
      assert.strictEqual(report.byTier.core.count, 1);
      assert.ok(report.overall);
      assert.ok(report.recent);
      assert.strictEqual(report.recent.length, 2);
      
      await clearMetrics();
    });
  });
});
