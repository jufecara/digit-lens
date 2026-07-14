# Delivery Phases

[Specs Index](./README.md) | [Delivery Plan](./delivery-plan.md) | [Technical Spec](./technical-spec.md)

This project now follows a fixed phase model instead of open-ended step numbering.

## Phase 1: Runtime And Test Surface

Purpose:

- freeze the public runtime contract
- establish blocking and non-blocking acceptance tiers
- make build and test execution deterministic

Completion criteria:

- library package builds cleanly
- contract checks exist
- `smoke` and `core` acceptance are blocking
- `hard` acceptance is opt-in

Status:

- complete

## Phase 2: Browser Demo

Purpose:

- provide a concrete browser example that uses the public API
- prove the library can be loaded in a real capture flow
- expose recognized matrix, diagnostics, and validation results to a human reviewer

Completion criteria:

- demo app opens in the browser
- demo can start the camera
- demo can capture one frame and call `scanSudoku`
- demo renders the matrix, status, diagnostics, and validation output

Status:

- complete

## Phase 3: Geometry Baseline

Purpose:

- improve board detection, rectification, rotation handling, and grid validation
- move the current `core` real-photo fixture from unsupported geometry toward usable board extraction

Completion criteria:

- reviewed `core` fixtures no longer fail due to avoidable geometry defects
- rotation and perspective handling improve on targeted real-photo cases
- geometric diagnostics remain stable under acceptance checks

Status:

- active

Current progress:

- full-page component fallback has been corrected for reviewed rotated hard cases
- false page-edge cropping on the first hard rotated fixture has been reduced
- rectified boards now use blended global and local thresholding instead of a single global cut
- recovered grid positions now drive cell extraction instead of equal-width slicing when a regular lattice can be inferred
- board detection now performs a bounded inner-crop search scored by the real geometry validator instead of stopping at the first rectangular crop
- a reviewed low-quality phone capture now crosses the geometry gate as a usable board
- the reviewed `core` real-photo fixture now reaches `partial` with `boardUsable: true` after tighter square-boundary selection, but OCR ambiguity still keeps it inside the geometry-to-OCR transition gap

Phase 3 remains active until:

- reviewed real-photo fixtures consistently clear geometry failures for the right reason rather than via fragile recovery
- boundary selection, rectification, rotation handling, and grid validation are stable enough that remaining failures are primarily OCR quality problems
- documented acceptance expectations and runtime behavior stay synchronized

## Phase 4: OCR Baseline

Purpose:

- improve cell extraction and printed-digit recognition after geometry is stable
- reduce false blanks and digit ambiguity on reviewed printed-board captures

Completion criteria:

- recognized matrix quality improves on approved fixtures
- structural and solvability validation reflect more accurate recognized boards
- OCR changes do not regress the geometry acceptance tiers

Status:

- planned

## Phase 5: Robustness And Release Readiness

Purpose:

- work through selected `hard` fixtures
- polish docs, commands, packaging, and example surfaces
- define the release-ready acceptance set

Completion criteria:

- targeted `hard` fixtures are tracked with explicit rationale
- package and example docs are complete
- final blocking acceptance flow is stable and documented

Status:

- planned
