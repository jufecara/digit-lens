# Technical Spec

[Specs Index](./README.md) | [Pipeline Modules](./pipeline-modules.md) | [Lessons Learned](../lessons-learned.md)

## Table of Contents

1. [Architecture Direction](#architecture-direction)
2. [Suggested Stack](#suggested-stack)
3. [Runtime Relationship](#runtime-relationship)
4. [Core Processing Pipeline](#core-processing-pipeline)
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
- Jimp plus lightweight in-house geometry heuristics for the first runtime slice
- In-house digit recognition for printed Sudoku digits

## Runtime Relationship

- The public runtime behavior is defined in [Runtime Contract](./runtime-contract.md).
- The concrete stage decomposition is defined in [Pipeline Modules](./pipeline-modules.md).
- This document does not redefine public statuses, matrix rules, or diagnostics semantics.
- This document focuses on implementation direction and architecture choices needed to satisfy that contract.
- The current implementation slice prioritizes a dependency-light normalization and validation path before reintroducing heavier CV tooling.

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

## Testing Strategy

- Linting and type-checking
- Unit tests for validation and result-shaping logic
- Fixture-based evaluation tests on representative Sudoku images
- Regression comparison against benchmark images over time

## Current OCR Direction

- Earlier OCR exploration is archived in [Lessons Learned](../lessons-learned.md).
- The project should not treat any removed prototype script as active runtime.
- Future OCR work should start from a product-grade normalization and validation pipeline, not from the removed prototype runners.

## Dataset Usage Plan

- The curated dataset under `/data` is the active project asset.
- Dataset consumers should read `/data/metadata/dataset_index.json` and active split membership from `/data/splits`.
- Default usage should start with `usage === "active"` and non-augmented boards only.
- Deferred filled or handwritten-candidate boards should remain excluded by default until explicitly reintroduced.

## Near-Term Improvement Targets

- Improve board rectification quality before OCR using safer geometric refinement rather than raw edge cropping
- Improve preprocessing for threshold-heavy inputs before changing the classifier family again
- Improve digit isolation for color-heavy and blue-grid boards
- Add diagnostics that better distinguish low-quality scans from valid mostly-blank Sudoku boards
- Define new acceptance benchmarks in product-facing test fixtures rather than rebuilding the removed prototype harness

## Fallback Strategy

Alternative local models may still be revisited later, but only if benchmark evidence shows the in-house path has plateaued below the required quality bar.
