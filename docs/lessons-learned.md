# Lessons Learned

## Purpose

This document replaces the removed OCR prototype runtime and `/spikes` workspace.

It preserves:

- the final benchmark evidence
- the architectural decisions that survived exploration
- the main failed approaches and why they failed
- the minimum reconstruction notes needed if the team later chooses to rebuild the prototype scripts

## Final prototype conclusion

The prototype phase answered the main question: a browser-first, local-first pipeline for printed Sudoku boards is viable.

The strongest explored direction was:

- OpenCV.js for board detection and perspective correction
- in-house printed-digit recognition using normalized cell images
- conservative prediction behavior with low false positives on clean boards

The remaining gap at closeout was not “can this work?”. It was normalization quality on degraded inputs:

- threshold-heavy images
- blur + shadows
- colored grids
- perspective-heavy boards
- partially cropped or weakly rectified boards

That is why the prototype runtime was removed instead of being promoted directly as product code.

## Final recorded benchmark results

### Benchmark set

- `10` labeled benchmark images for the original exploration set
- `12` annotated Jeffrey Wolberg clue-board images for the curated dataset subset

### Best retained in-house benchmark

- Full benchmark cell accuracy: `86.67%`
- Full benchmark digit recall: `63.49%`
- Clean-pool cell accuracy: `99.18%`
- Clean-pool digit recall: `97.80%`

### Final annotated dataset benchmark

- Board detection rate: `100.00%`
- Annotated cell accuracy: `82.72%`
- Annotated digit recall: `52.62%`
- Annotated false positive digits: `5`

## Decisions worth keeping

### Keep

- Browser-first and local-first architecture
- OpenCV.js as the core image-processing dependency
- Printed-digit-only assumption for the active dataset pool
- Dataset preparation under `/data`
- Deferred handling for filled or handwritten-candidate boards
- Augmentation as a second-stage option, not part of the default baseline

### Do not carry forward as active runtime

- OCR-first experimentation without strong board normalization
- Ad hoc prototype runners over `/spikes/samples`
- Benchmark scripts that depend on hand-maintained prototype fixtures
- Board-level recrop heuristics that are not geometry-safe

## Important failures

### 1. OCR too early in the pipeline

The prototype often tried to classify digits before the board had been normalized into a reliable canonical form.

Result:

- weak handling of rotated boards
- weak handling of perspective-heavy boards
- unstable behavior on thresholded boards

### 2. Post-warp recrop experiments were fragile

Several “fix the board after warp” experiments were tested and reverted.

Observed failure mode:

- they sometimes helped one target image
- they degraded unrelated boards
- they increased false positives or broke clean boards

### 3. Threshold-heavy boards remained unresolved

Examples:

- `pyimagesearch-thresh.png`
- `stackoverflow-newspaper-thresh.png`

Observed failure mode:

- the board was often detected
- digit isolation inside the cells still failed
- no safe heuristic produced a broad improvement

### 4. Structural validation helped as diagnostics, not yet as a hard gate

A later prototype pass added:

- line-count estimates
- spacing checks
- cell-count estimates
- board usability scoring

That work was useful as evidence, but not reliable enough to block OCR automatically because some valid boards still scored poorly.

## What the next real implementation should do

If the team resumes OCR implementation, the order should be:

1. Input normalization
2. Board normalization
3. Structural validation
4. Cell normalization
5. OCR and result validation

In practical terms:

1. Normalize grayscale, illumination, and noise before board search.
2. Detect the real board and warp to a fixed square.
3. Validate expected geometry:
   - `10` horizontal lines
   - `10` vertical lines
   - near-uniform spacing
   - `81` cells
4. Extract cells only after geometry is accepted.
5. Recognize printed digits only.
6. Reject bad boards explicitly instead of returning garbage matrices.

## Removed scripts and what they used to do

The following files were removed on purpose:

- `scripts/spike-utils.mjs`
- `scripts/inhouse-ocr-utils.mjs`
- `scripts/run-spike-inhouse-ocr.mjs`
- `scripts/evaluate-dataset.js`
- `scripts/create-dataset-benchmark.js`
- `scripts/generate-dataset-benchmark-review.js`
- `scripts/export-dataset-debug.js`
- the full `/spikes` tree

### Reconstruction notes

If reconstruction is ever needed, the removed prototype was organized around these responsibilities:

#### `scripts/spike-utils.mjs`

- read sample images into OpenCV.js mats
- detect the board quad
- warp the board to a fixed square
- extract cells
- normalize cells for OCR
- save debug images

#### `scripts/inhouse-ocr-utils.mjs`

- build leave-one-board-out training samples from labeled boards
- evaluate a board image with the in-house classifier
- compare predicted matrices against expected matrices
- rotate boards across `0/90/180/270` and score the best orientation
- run low-signal rescue passes on hard cells

#### `scripts/run-spike-inhouse-ocr.mjs`

- execute the original benchmark over the prototype fixture set
- emit a markdown report with per-board metrics and summary metrics

#### `scripts/evaluate-dataset.js`

- run the prototype OCR pipeline over the curated dataset split
- optionally evaluate only the annotated subset
- emit dataset-level accuracy and recall summaries

#### `scripts/create-dataset-benchmark.js`

- pick a small benchmark subset from the dataset
- write a fixture file for manual matrix annotation

#### `scripts/generate-dataset-benchmark-review.js`

- generate a human review worksheet pairing images with predicted matrices

#### `scripts/export-dataset-debug.js`

- export warped boards, cells, and prepared OCR inputs for visual debugging

## Reconstruction inputs that existed

The removed prototype used:

- labeled sample images under `/spikes/samples`
- expected matrices under `/spikes/fixtures/expected-matrices.json`
- annotated dataset benchmark fixtures under `/spikes/fixtures/dataset-benchmark-annotations.json`
- generated markdown reports under `/spikes/notes`
- generated warped/debug images under `/spikes/output`

Those assets were intentionally removed with the prototype runtime. If reconstruction is needed, equivalent fixtures will need to be recreated from the archived benchmark descriptions in this document and from the curated dataset under `/data`.

## Why the cleanup was done

The project is no longer in a prototype stage.

Keeping prototype runners and ad hoc benchmark scripts in the active surface would:

- blur the boundary between archival evidence and supported runtime
- encourage accidental dependence on a removed OCR path
- make the dataset-preparation project look more complete than it really is

The repository now keeps:

- active dataset-preparation scripts
- active specs and requirements
- one consolidated lessons-learned archive

That is the intended steady state until a real product-grade OCR pipeline is designed and built.
