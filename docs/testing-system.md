# Testing System Documentation

This document describes the comprehensive testing system for the Digit Lens Sudoku board recognition library.

## Overview

The testing system includes:

- **Acceptance tests** - End-to-end tests using real Sudoku board images
- **Unit tests** - Component-level tests for validation and pipeline functions
- **Quality metrics** - Performance and accuracy tracking
- **Regression detection** - Automated monitoring of performance and accuracy changes
- **Test helpers** - Utilities for baseline comparison, performance measurement, and fixture validation

## Acceptance Test Suite

### Fixture Structure

The acceptance suite is defined in `tests/fixtures/acceptance-suite.json` with three tiers:

- **Smoke tier** - 2 fixtures for basic functionality validation
- **Core tier** - 4 fixtures for typical newspaper captures
- **Hard tier** - 5 fixtures for challenging real-world cases

Each fixture includes:

- `id` - Unique identifier
- `imagePath` - Path to fixture image
- `tier` - Test tier (smoke/core/hard)
- `sourceType` - Image source (synthetic_generated/real_photo)
- `boardType` - Board type (printed_clue)
- `expectedStatus` - Expected recognition status
- `expectedMatrix` - Expected 9x9 digit matrix
- `expectedDiagnostics` - Expected board detection diagnostics
- `expectedValidation` - Expected structural and solvability validation
- `tags` - Fixture classification tags
- `notes` - Description of fixture purpose

### Running Acceptance Tests

```bash
# Run all acceptance tests
npm test

# Run specific tier
node --test tests/smoke-acceptance-suite.test.mjs
node --test tests/core-acceptance-suite.test.mjs
node --test tests/hard-acceptance-suite.test.mjs
```

## Test Helpers

### Baseline Comparison (`tests/helpers/baseline-compare.mjs`)

Utilities for comparing test results against baseline expectations:

- `loadBaseline(fixtureId)` - Load baseline data for a fixture
- `saveBaseline(fixtureId, data)` - Save baseline data for a fixture
- `compareWithBaseline(result, baseline, options)` - Compare result with baseline
- `listBaselines()` - List all available baselines
- `clearBaseline(fixtureId)` - Clear a specific baseline

### Performance Measurement (`tests/helpers/performance-measure.mjs`)

Utilities for measuring execution performance:

- `measurePerformance(fn)` - Measure execution time and memory usage
- `formatDuration(ms)` - Format duration in human-readable format
- `formatMemory(bytes)` - Format memory in human-readable format
- `checkThreshold(value, threshold, type)` - Check if value exceeds threshold

### Fixture Validation (`tests/helpers/fixture-validator.mjs`)

Utilities for validating fixture metadata:

- `validateFixtureStructure(fixture)` - Validate fixture has required fields
- `validateTier(tier)` - Validate tier is valid
- `validateMatrixDimensions(matrix)` - Validate matrix is 9x9
- `validateDiagnostics(diagnostics)` - Validate diagnostics structure
- `validateValidation(validation)` - Validate validation structure
- `validateFixtureImage(fixture, fixtureRoot)` - Validate fixture image exists

## Quality Metrics System

### Metrics Collection (`tests/helpers/quality-metrics.mjs`)

The quality metrics system tracks accuracy, reliability, and performance:

- `collectMetrics(fixtureId, tier, result, expected, performance)` - Collect metrics for a test run
- `saveMetrics(metrics)` - Save metrics to JSONL file
- `loadMetrics()` - Load all metrics from JSONL file
- `generateQualityReport()` - Generate aggregated quality report by tier
- `runTestWithMetrics(fixture, scanSudoku, fixtureRoot)` - Run test with automatic metrics collection

### Metrics Structure

Each metric entry includes:

- `timestamp` - ISO timestamp of collection
- `fixtureId` - Fixture identifier
- `tier` - Test tier
- `accuracy` - Accuracy metrics (accuracyRate, f1Score, precision, recall)
- `reliability` - Reliability metrics (overallMatch, statusMatch, diagnosticsMatch, validationMatch)
- `performance` - Performance metrics (durationMs, memoryDeltaBytes)
- `status` - Recognition status
- `boardDetected` - Board detection flag
- `boardUsable` - Board usability flag
- `estimatedCellCount` - Estimated cell count

### Running Quality Metrics

```bash
# Generate quality report
node -e "
  import('./tests/helpers/quality-metrics.mjs').then(async ({ generateQualityReport }) => {
    console.log(await generateQualityReport());
  });
"
```

## Regression Detection

### Regression Detection (`tests/helpers/regression-detection.mjs`)

Automated detection of performance and accuracy regressions:

- `detectFixtureRegression(fixtureId, currentResult, thresholds)` - Detect fixture-level regression
- `detectPerformanceRegression(fixtureId, currentDuration, currentMemory)` - Detect performance regression
- `detectAccuracyRegression(fixtureId, currentAccuracy)` - Detect accuracy regression
- `runRegressionDetection(suite, fixtureRoot, scanSudoku)` - Run comprehensive regression detection
- `formatRegressionSummary(report)` - Format regression report for human reading
- `loadRegressionReport()` - Load latest regression report
- `hasRegressions()` - Check if latest report has regressions

### Regression Thresholds

Default thresholds for regression detection:

- **Accuracy regression** - 5% drop in accuracy rate
- **Performance regression** - 20% increase in duration
- **Memory regression** - 30% increase in memory usage
- **Reliability regression** - 10% drop in reliability rate

### Running Regression Detection

```bash
# Run regression detection
node scripts/run-regression-detection.mjs

# Run performance analysis
node scripts/performance-analysis.mjs
```

## CI/CD Integration

### GitHub Actions Workflows

**CI Workflow** (`.github/workflows/ci.yml`):

- Runs on push to main and pull requests
- Includes lint, format check, security audit, type check
- Runs all tests including acceptance suite
- Runs regression detection
- Uploads regression reports and quality metrics as artifacts

**Quality Metrics Workflow** (`.github/workflows/quality-metrics.yml`):

- Runs on push to main, pull requests, and weekly schedule
- Runs acceptance tests with metrics collection
- Generates quality reports
- Comments on PRs with quality metrics
- Uploads metrics with extended retention

## Unit Tests

### Validation Unit Tests (`tests/unit/validation.test.mjs`)

Unit tests for Sudoku validation functions:

- `validateStructuralSudoku` - Tests for duplicate detection (row, column, box)
- `validateSudokuSolvability` - Tests for solvability validation

### Running Unit Tests

```bash
# Run validation unit tests
node --test tests/unit/validation.test.mjs

# Run all unit tests
node --test tests/unit/
```

## Performance Analysis

### Performance Analysis Script (`scripts/performance-analysis.mjs`)

Analyzes performance across the acceptance suite:

```bash
node scripts/performance-analysis.mjs
```

Output includes:

- Per-fixture duration and memory usage
- Tier-level performance summaries
- Overall performance statistics
- Identification of bottlenecks (fixtures > 2x average)

### Current Performance (Post-Optimization)

- **Overall average**: 341ms
- **Smoke tier**: 249ms average
- **Core tier**: 403ms average
- **Hard tier**: 328ms average
- **No bottlenecks**: All fixtures within 2x average

## Test File Structure

```
tests/
├── acceptance-suite.json          # Acceptance test fixture manifest
├── fixtures/
│   ├── images/                    # Fixture images
│   └── acceptance-suite.json      # Fixture metadata
├── helpers/                       # Test helper modules
│   ├── baseline-compare.mjs
│   ├── performance-measure.mjs
│   ├── fixture-validator.mjs
│   ├── quality-metrics.mjs
│   ├── regression-detection.mjs
│   └── load-acceptance-suite.mjs
├── unit/                          # Unit tests
│   └── validation.test.mjs
├── baselines/                     # Baseline data
├── metrics/                       # Quality metrics (JSONL)
├── regression/                    # Regression reports
├── acceptance-manifest.test.mjs
├── smoke-acceptance-suite.test.mjs
├── core-acceptance-suite.test.mjs
├── hard-acceptance-suite.test.mjs
├── api-contract.test.mjs
├── test-helpers.test.mjs
├── quality-metrics.test.mjs
└── regression-detection.test.mjs
```

## Best Practices

### Adding New Fixtures

1. Add fixture image to `tests/fixtures/images/`
2. Add fixture metadata to `tests/fixtures/acceptance-suite.json`
3. Run acceptance tests to establish baseline
4. Update fixture expectations based on actual results
5. Add appropriate tags and notes

### Updating Baselines

When recognition behavior changes intentionally:

1. Run `node scripts/run-regression-detection.mjs` to detect changes
2. Update fixture expectations in `acceptance-suite.json`
3. Clear old baselines with `clearBaseline(fixtureId)`
4. Re-run tests to establish new baselines

### Performance Optimization

1. Run `node scripts/performance-analysis.mjs` to identify bottlenecks
2. Optimize code in pipeline components
3. Re-run performance analysis to verify improvements
4. Update fixture expectations if behavior changes
5. Run regression detection to ensure no regressions

## Troubleshooting

### Test Failures

- **Matrix mismatch**: Update `expectedMatrix` in fixture metadata
- **Diagnostics mismatch**: Update `expectedDiagnostics` warnings/issues
- **Validation mismatch**: Update `expectedValidation` messages
- **Performance regression**: Check optimization changes or hardware differences

### Regression Detection

- **False positives**: Adjust thresholds in regression detection
- **Missing regressions**: Lower thresholds or check metric collection
- **Baseline issues**: Clear and re-establish baselines

## Continuous Improvement

The testing system supports continuous improvement through:

- Historical metrics tracking for trend analysis
- Automated regression detection in CI/CD
- Performance monitoring and optimization
- Quality metrics reporting on PRs
- Baseline comparison for behavior changes
