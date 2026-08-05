import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateFixtureStructure, validateAcceptanceSuite } from './helpers/fixture-validator.mjs';
import { loadAcceptanceSuite } from './helpers/load-acceptance-suite.mjs';
import { measureTime, formatMemorySize, checkPerformanceThresholds } from './helpers/performance-measure.mjs';
import { compareWithBaseline, saveBaseline, loadBaseline } from './helpers/baseline-compare.mjs';
import path from 'node:path';

describe('Test Helpers', () => {
  
  describe('fixture-validator', () => {
    it('validates correct fixture structure', () => {
      const validFixture = {
        id: 'test-fixture',
        imagePath: 'images/test.jpg',
        tier: 'core',
        sourceType: 'real_photo',
        boardType: 'printed_clue',
        expectedStatus: 'partial',
        expectedMatrix: Array(9).fill(null).map(() => Array(9).fill(0)),
        expectedDiagnostics: {
          warnings: [],
          issues: [],
          boardDetected: true,
          boardUsable: true,
          rotationDegrees: 0,
          estimatedCellCount: 81
        },
        expectedValidation: {
          isStructurallyValid: true,
          isSolvable: true,
          messages: []
        },
        tags: ['test'],
        notes: 'Test fixture'
      };

      const result = validateFixtureStructure(validFixture);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('detects missing required fields', () => {
      const invalidFixture = {
        id: 'test-fixture'
      };

      const result = validateFixtureStructure(invalidFixture);
      assert.strictEqual(result.valid, false);
      assert(result.errors.length > 0);
    });

    it('detects invalid tier', () => {
      const invalidFixture = {
        id: 'test-fixture',
        imagePath: 'images/test.jpg',
        tier: 'invalid_tier',
        sourceType: 'real_photo',
        boardType: 'printed_clue',
        expectedStatus: 'partial',
        expectedMatrix: Array(9).fill(null).map(() => Array(9).fill(0)),
        expectedDiagnostics: {
          warnings: [],
          issues: [],
          boardDetected: true,
          boardUsable: true,
          rotationDegrees: 0,
          estimatedCellCount: 81
        },
        expectedValidation: {
          isStructurallyValid: true,
          isSolvable: true,
          messages: []
        },
        tags: ['test'],
        notes: 'Test fixture'
      };

      const result = validateFixtureStructure(invalidFixture);
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(e => e.includes('Invalid tier')));
    });

    it('detects invalid matrix dimensions', () => {
      const invalidFixture = {
        id: 'test-fixture',
        imagePath: 'images/test.jpg',
        tier: 'core',
        sourceType: 'real_photo',
        boardType: 'printed_clue',
        expectedStatus: 'partial',
        expectedMatrix: [[1, 2]], // Wrong dimensions
        expectedDiagnostics: {
          warnings: [],
          issues: [],
          boardDetected: true,
          boardUsable: true,
          rotationDegrees: 0,
          estimatedCellCount: 81
        },
        expectedValidation: {
          isStructurallyValid: true,
          isSolvable: true,
          messages: []
        },
        tags: ['test'],
        notes: 'Test fixture'
      };

      const result = validateFixtureStructure(invalidFixture);
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(e => e.includes('9x9')));
    });
  });

  describe('performance-measure', () => {
    it('measures execution time', async () => {
      const { durationMs, result } = await measureTime(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 42;
      });

      assert.strictEqual(result, 42);
      assert(durationMs >= 10);
    });

    it('formats memory size', () => {
      assert.strictEqual(formatMemorySize(1024), '1.00 KB');
      assert.strictEqual(formatMemorySize(1048576), '1.00 MB');
      assert.strictEqual(formatMemorySize(512), '512.00 B');
    });

    it('checks performance thresholds', () => {
      const measurement = {
        durationMs: 50,
        memoryDelta: { heapUsed: 1024 * 1024 } // 1MB
      };

      const result = checkPerformanceThresholds(measurement, {
        maxDurationMs: 100,
        maxMemoryBytes: 2 * 1024 * 1024 // 2MB
      });

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.violations.length, 0);
    });

    it('detects performance violations', () => {
      const measurement = {
        durationMs: 150,
        memoryDelta: { heapUsed: 3 * 1024 * 1024 } // 3MB
      };

      const result = checkPerformanceThresholds(measurement, {
        maxDurationMs: 100,
        maxMemoryBytes: 2 * 1024 * 1024 // 2MB
      });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.violations.length, 2);
    });
  });

  describe('baseline-compare', () => {
    it('compares matching results', () => {
      const current = {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };

      const baseline = {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };

      const result = compareWithBaseline(current, baseline);
      assert.strictEqual(result.matched, true);
      assert.strictEqual(result.differences.length, 0);
    });

    it('detects matrix differences', () => {
      const current = {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };

      const baseline = {
        matrix: [[0, 1], [1, 0]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };

      const result = compareWithBaseline(current, baseline);
      assert.strictEqual(result.matched, false);
      assert(result.differences.some(d => d.includes('Matrix')));
    });

    it('handles missing baseline', () => {
      const current = {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };

      const result = compareWithBaseline(current, null);
      assert.strictEqual(result.matched, false);
      assert(result.differences.some(d => d.includes('No baseline')));
    });

    it('uses tolerance for cell count comparison', () => {
      const current = {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 5
        }
      };

      const baseline = {
        matrix: [[1, 0], [0, 1]],
        status: 'partial',
        diagnostics: {
          boardDetected: true,
          boardUsable: true,
          estimatedCellCount: 4
        }
      };

      const result = compareWithBaseline(current, baseline, { tolerance: 2 });
      assert.strictEqual(result.matched, true);
    });
  });

  describe('validateAcceptanceSuite integration', () => {
    it('validates actual acceptance suite', async () => {
      const suite = await loadAcceptanceSuite();
      const fixtureRoot = path.join(process.cwd(), 'tests', 'fixtures');
      
      const result = await validateAcceptanceSuite(suite, fixtureRoot);
      
      assert(result.summary.total > 0);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.fixtureErrors.length, 0);
      assert.strictEqual(result.imageErrors.length, 0);
    });
  });
});
