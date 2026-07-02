# Technical Spec

[Specs Index](./README.md) | [Requirements](./requirements.md) | [Benchmark Record](./benchmark-record.md)

## Table of Contents

1. [Architecture Direction](#architecture-direction)
2. [Suggested Stack](#suggested-stack)
3. [Core Processing Pipeline](#core-processing-pipeline)
4. [Proposed Output Shape](#proposed-output-shape)
5. [Testing Strategy](#testing-strategy)
6. [Current OCR Direction](#current-ocr-direction)
7. [Dataset Usage Plan](#dataset-usage-plan)
8. [Near-Term Improvement Targets](#near-term-improvement-targets)
9. [Fallback Strategy](#fallback-strategy)

## Architecture Direction

- Browser-first library design
- Local-first processing
- Clear separation between image processing, OCR, diagnostics, and validation
- Deterministic outputs where practical

## Suggested Stack

This is the current recommendation, not a permanent commitment.

- TypeScript
- Vite library mode for browser-oriented library builds
- ESM-first package output with Node-compatible package exports
- OpenCV.js for board detection, preprocessing, and perspective correction
- In-house digit recognition for printed Sudoku digits

## Core Processing Pipeline

1. Accept input image from file-like or Base64 source
2. Normalize image into a processable representation
3. Detect Sudoku board and correct perspective
4. Segment the board into `9x9` cells
5. Run in-house digit recognition on printed digit candidates
6. Build a best-effort matrix
7. Generate scan diagnostics
8. Run structural validation
9. Run solvability check
10. Return structured output

## Proposed Output Shape

```ts
type DigitLensResult = {
  status: "ok" | "partial" | "invalid-input";
  matrix: number[][];
  diagnostics: {
    warnings: string[];
    issues: string[];
  };
  validation: {
    isStructurallyValid: boolean;
    isSolvable: boolean;
    messages: string[];
  };
};
```

This shape is illustrative and can evolve during the spike phase.

## Testing Strategy

- Linting and type-checking
- Unit tests for validation and result-shaping logic
- Fixture-based evaluation tests on representative Sudoku images
- Regression comparison against benchmark images over time

## Current OCR Direction

- The active OCR direction is the in-house classifier path documented in [Benchmark Record](./benchmark-record.md).
- ONNX and ensemble experiments are preserved as benchmark evidence, but they are not the current implementation choice.
- The current improvement target is preprocessing and digit isolation on degraded inputs rather than replacing the in-house classifier again.

## Dataset Usage Plan

- The curated dataset under `/data` is prepared for the next stage, not the current spike runtime.
- The current spike still consumes `/spikes/samples` and fixture matrices directly.
- The next-stage dataset consumer should read `/data/metadata/dataset_index.json` and active split membership from `/data/splits`.
- Default next-stage usage should start with `usage === "active"` and non-augmented boards only.
- Deferred filled or handwritten-candidate boards should remain excluded by default until explicitly reintroduced.
- See [Dataset Next Stage](./dataset-next-stage.md) for the operational rules.

## Near-Term Improvement Targets

- Improve board rectification quality before OCR using safer geometric refinement rather than raw edge cropping
- Improve preprocessing for threshold-heavy inputs before changing the classifier family again
- Improve digit isolation for color-heavy and blue-grid boards
- Add diagnostics that better distinguish low-quality scans from valid mostly-blank Sudoku boards
- Keep benchmark comparison against the current in-house record as the acceptance gate for future OCR changes

## Fallback Strategy

Alternative local models may still be revisited later, but only if benchmark evidence shows the in-house path has plateaued below the required quality bar.
