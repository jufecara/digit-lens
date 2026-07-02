# Dataset Next Stage

[Specs Index](./README.md) | [Technical Spec](./technical-spec.md) | [Benchmark Record](./benchmark-record.md)

## Purpose

This document defines how the prepared Sudoku dataset under `/data` is intended to be used in the next stage of the project.

The current spike still operates from `/spikes/samples` and does not yet consume the curated dataset directly. The dataset pipeline exists to prepare that next step without changing the active spike baseline prematurely.

## Stage Boundary

Current stage:

- Use `/spikes/samples` and `/spikes/fixtures/expected-matrices.json`
- Continue benchmark-driven iteration on board detection, rectification, and printed-digit OCR
- Do not treat `/data` as the active model-training input yet

Next stage:

- Add a dedicated dataset consumer script or module
- Read metadata from `/data/metadata/dataset_index.json`
- Read active split membership from `/data/splits/train`, `/data/splits/val`, and `/data/splits/test`
- Use the curated dataset for evaluation expansion first, then for training experiments

## Intended Consumer

The next-stage consumer should be a separate script or module rather than silently changing the current spike behavior.

Suggested responsibilities:

1. Load `dataset_index.json`
2. Filter to `usage === "active"`
3. Optionally filter to `boardFillType === "clue"` when only printed clue boards are desired
4. Resolve the file path from `processedPath`
5. Group by split using the `split` field
6. Feed those images into the next training or evaluation loop

## What Enters the Active Pool

For the next stage, the default active pool is:

- entries with `usage: "active"`
- entries assigned to `train`, `val`, or `test`
- board images under `/data/processed/boards/real`

This active pool is intended for printed-board recognition work.

## What Stays Deferred

The following should stay out of the default next-stage training/evaluation pool until explicitly reintroduced:

- entries with `usage: "deferred"`
- files staged under `/data/processed/boards/deferred/handwritten_candidates`
- second-stage augmentation outputs unless a robustness experiment is explicitly being run

Current defer rule:

- `deferredReason: "filled_or_handwritten_candidate"`

This is a practical proxy for now, not a full handwriting classifier.

## Augmentation Policy

Augmentation is not part of the default next-stage baseline.

Default next-stage dataset:

- real active boards only
- no synthetic variants unless the experiment explicitly enables them

Future robustness stage:

- generate or load augmentation outputs from `/data/processed/boards/augmented`
- keep active/deferred filtering consistent with the original image
- compare robustness results against the non-augmented baseline before adopting augmentation broadly

## Evaluation Before Training

The first use of `/data` in the next stage should be broader evaluation, not immediate retraining.

Recommended order:

1. Run the current detector/OCR pipeline on the active `test` split
2. Record board-detection and digit-recognition metrics
3. Identify failure clusters
4. Decide whether the next change should be preprocessing, digit isolation, classifier training, or augmentation

## Required Follow-Up Implementation

This document defines intent, but one implementation step is still required:

- add a dedicated script or module that consumes `dataset_index.json` and `data/splits/*`

Until that consumer exists, the dataset remains prepared but not integrated into the active spike runtime.
