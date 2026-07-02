# Benchmark Record

[Specs Index](./README.md) | [Technical Spec](./technical-spec.md) | [Delivery Plan](./delivery-plan.md)

## Table of Contents

1. [Purpose](#purpose)
2. [Benchmark Scope](#benchmark-scope)
3. [Evaluated Paths](#evaluated-paths)
4. [Recorded Results](#recorded-results)
5. [Decision](#decision)
6. [Reasoning](#reasoning)
7. [Improvement Backlog](#improvement-backlog)
8. [Next Focus](#next-focus)

## Purpose

This document preserves the benchmark evidence and implementation decisions produced during the OCR spike phase.

## Benchmark Scope

- Benchmark set: `10` labeled Sudoku board images
- Focus: board detection, cell-level recognition accuracy, digit recall, and false-positive behavior
- Canonical detailed report:
  - [In-house report](../../spikes/notes/ocr-spike-report-inhouse.md)

## Evaluated Paths

### In-house baseline

- Local OpenCV.js preprocessing
- Local hand-built feature extraction
- In-house nearest-neighbor digit classifier
- No remote OCR dependency

### ONNX path

- Local OpenCV.js preprocessing
- Leave-one-board-out ONNX classifier executed with `onnxruntime-web`

### Ensemble path

- In-house classifier as base prediction
- ONNX high-confidence fill-in for some blanks

## Recorded Results

### Earlier single-source in-house baseline

- Full benchmark cell accuracy: `80.25%`
- Full benchmark digit recall: `46.24%`
- Behavior: conservative, low false positives, weak on degraded threshold-heavy boards

### ONNX path

- Full benchmark cell accuracy: `77.64%`
- Full benchmark digit recall: `42.94%`
- Behavior: slightly improved some individual clean boards, but worse overall than the in-house baseline and more prone to noise on hard boards

### Ensemble path

- Full benchmark cell accuracy: `80.66%`
- Full benchmark digit recall: `48.81%`
- Average cross-board false positives: `0.33`
- Behavior: modest recall gain, but it introduced avoidable noise on degraded inputs and increased decision complexity

### Current in-house direction

- Training pool excludes noisy benchmark variants:
  - `forum-sudoku-engine2.jpeg`
  - `pyimagesearch-thresh.png`
  - `stackoverflow-blue-grid.png`
  - `stackoverflow-newspaper-thresh.png`
- Full benchmark cell accuracy: `86.42%`
- Full benchmark digit recall: `63.12%`
- Clean-pool benchmark cell accuracy: `99.18%`
- Clean-pool benchmark digit recall: `97.80%`
- Behavior: clearly stronger on clean and moderately difficult boards while remaining conservative on difficult degraded inputs; the replacement blue-grid sample is now a full visible board instead of a cropped/incomplete board

## Decision

The project will stay on the in-house model path as the active OCR direction.

The ONNX path and the ensemble path are recorded as explored alternatives, not the current implementation direction.

## Reasoning

- The ONNX path did not beat the in-house baseline on the benchmark that matters for this project.
- The ensemble path improved recall slightly, but the added false positives and extra decision logic were not worth the complexity.
- The in-house path is simpler to reason about, easier to debug, easier to keep browser-first, and currently produces the best benchmark outcome among the tested local options.
- The remaining problem is not mainly model orchestration. It is digit isolation and preprocessing on low-quality thresholded or color-heavy inputs.

## Improvement Backlog

### Priority 1: Threshold-heavy cell recovery

- Target boards:
  - `pyimagesearch-thresh.png`
  - `stackoverflow-newspaper-thresh.png`
- Goal:
  - recover more true digits without breaking the current low-false-positive behavior on clean boards
- Candidate work:
  - alternative binarization per cell
  - better border suppression inside extracted cells
  - branch-specific preprocessing for already-thresholded inputs
- Success check:
  - improve full benchmark digit recall without introducing a visible false-positive jump on clean-pool boards

### Priority 2: Color-heavy and blue-grid isolation

- Target board:
  - `stackoverflow-blue-grid.png`
- Goal:
  - separate printed digits from colored grid/background noise more reliably
- Candidate work:
  - color-aware masking before cell extraction
  - stronger grid-line suppression
  - contrast normalization tuned for colored backgrounds
- Success check:
  - raise recall on the blue-grid case while keeping board detection stable

### Priority 3: Hard-case diagnostics

- Goal:
  - make degraded scans easier to classify as retry-worthy instead of silently returning mostly blank matrices
- Candidate work:
  - board-level quality heuristics
  - per-cell ambiguity flags
  - explicit detection of threshold-damaged or color-damaged scans
- Success check:
  - difficult boards return clearer diagnostics even when OCR quality is still limited

### Guardrails

- Do not accept improvements that only help excluded noisy boards by increasing false positives everywhere else
- Keep the browser-first, local-first architecture unchanged
- Re-benchmark after every material preprocessing change
- Preserve benchmark history rather than overwriting prior decisions

### Latest Priority 1 attempt

- A threshold-specific preprocessing branch was tested for the in-house path
- A board-level tighter crop experiment was also tested and then reverted because it degraded non-target boards such as `servo-sudoku-figure09.jpg`
- A projection-based outer-grid recrop pass was also tested after the initial perspective warp
- Net outcome:
  - no measurable recall improvement on `pyimagesearch-thresh.png`
  - no measurable recall improvement on `stackoverflow-newspaper-thresh.png`
  - the projection-based recrop severely degraded multiple boards, including `servo-sudoku-figure09.jpg`, `stackoverflow-blue-grid.png`, and `forum-sudoku-engine2.jpeg`
  - baseline behavior on the stronger non-threshold boards was preserved after reverting the harmful crop override
- Current interpretation:
  - the main Priority 1 blocker is not only threshold detection
  - the remaining gap is still digit isolation quality inside threshold-damaged cells
  - future rectification work should favor line-intersection or contour-geometry refinement, not direct recropping from row/column peak strength alone

## Next Focus

- Improve board rectification quality before OCR, especially on skewed and perspective-distorted captures
- Improve in-house preprocessing and digit isolation in difficult cells
- Keep benchmark history in the spike reports and this decision record
- Revisit alternative models only if a later benchmark plateau shows the in-house path cannot meet the target quality bar
