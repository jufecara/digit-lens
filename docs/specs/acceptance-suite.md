# Acceptance Suite

[Specs Index](./README.md) | [Acceptance Criteria](./acceptance-criteria.md) | [Runtime Contract](./runtime-contract.md)

## Purpose

This document freezes the permanent acceptance suite structure for `digit-lens`.

It defines:

- fixture storage layout
- benchmark tiers
- expected-output requirements
- promotion rules for new fixtures
- regression policy

It does not add implementation code. It defines the suite the implementation must satisfy.

## Current Harness

The first product-facing harness lives under:

- `/tests/api-contract.test.mjs`
- `/tests/acceptance-manifest.test.mjs`
- `/tests/smoke-acceptance-suite.test.mjs`
- `/tests/core-acceptance-suite.test.mjs`
- `/tests/hard-acceptance-suite.test.mjs`

Current role:

- validate public result-shape and failure semantics
- validate the permanent fixture manifest structure
- execute the blocking `smoke` and `core` fixture tiers through the built runtime
- keep API-contract checks available independently from fixture-tier acceptance

Current limitation:

- these tests do not yet validate OCR accuracy
- they are the contract gate that should exist before OCR work expands
- `hard` fixtures should remain opt-in runtime monitoring until the early geometry path is stable

## Fixture Root

Permanent product fixtures live under:

- `/tests/fixtures`

Required tracked files:

- `/tests/fixtures/README.md`
- `/tests/fixtures/acceptance-suite.json`
- `/tests/fixtures/images/`

## Fixture Manifest

The canonical fixture manifest is:

- `/tests/fixtures/acceptance-suite.json`

Each fixture entry should eventually contain:

```json
{
  "id": "fixture-id",
  "imagePath": "images/example.jpg",
  "tier": "core",
  "sourceType": "real_photo",
  "boardType": "printed_clue",
  "expectedStatus": "ok",
  "expectedMatrix": [[0, 0, 0, 0, 0, 0, 0, 0, 0]],
  "expectedDiagnostics": {
    "warnings": ["blur"],
    "issues": [],
    "boardDetected": true,
    "boardUsable": true,
    "rotationDegrees": 0,
    "estimatedCellCount": 81
  },
  "expectedValidation": {
    "isStructurallyValid": true,
    "isSolvable": true,
    "messages": []
  },
  "tags": ["clean", "perspective"],
  "notes": "Short fixture rationale"
}
```

## Benchmark Tiers

### `smoke`

Purpose:

- verify the runtime works at all
- fast local checks during development

Expected contents:

- small set of clean printed boards
- at least one valid clue board
- at least one invalid or unsolvable matrix case once validation fixtures exist

### `core`

Purpose:

- default product acceptance suite
- main regression gate for implementation work

Expected contents:

- representative printed clue boards
- clean and moderately difficult captures
- enough variety to cover rotation, perspective, low contrast, blur, shadows, and color interference

### `hard`

Purpose:

- targeted robustness monitoring
- not required to block every early implementation step

Expected contents:

- degraded real-world captures
- known difficult threshold-heavy or color-heavy cases
- borderline usable boards

## What qualifies as a permanent fixture

A fixture may enter the permanent suite only if:

- it represents a printed `9x9` Sudoku board or a deliberate validation edge case
- it has a stable expected outcome
- the image is allowed to live in-repo
- the team can explain why it belongs in `smoke`, `core`, or `hard`

## What should not enter the permanent suite

- handwritten-only boards for v1 acceptance
- duplicate images that add no new failure mode
- fixtures without a reviewed expected matrix
- fixtures that exist only because a prototype script once used them

## Expected Output Rules

Every accepted OCR fixture must eventually define:

- expected `status`
- expected `9x9` matrix
- expected minimum diagnostics state
- expected validation state

When a fixture has reviewed diagnostic semantics, it should also pin:

- expected diagnostic `warnings`
- expected diagnostic `issues`
- expected `rotationDegrees` when orientation is known
- expected `estimatedCellCount` when geometry evidence is stable
- expected validation `messages`

At minimum:

- matrix shape must be exact
- matrix values must be `0..9`
- board detection expectation must be explicit
- usability expectation must be explicit

## Acceptance Policy

### Required for implementation merge readiness

For the `core` tier:

- no regression in matrix shape correctness
- no regression in required status semantics
- no regression in required validation semantics
- no unexplained regression on approved core fixtures

### Allowed during early build iterations

- `hard` tier may remain non-blocking while the first product pipeline is still being assembled
- additional diagnostics may be added if they do not break the runtime contract

Recommended execution model:

- contract-only command runs public runtime and validation-helper checks without fixture tiers
- smoke command runs manifest checks plus only the reviewed `smoke` tier
- core command runs manifest checks plus only the reviewed `core` tier
- default `test` and acceptance commands run only `smoke` and `core`
- default acceptance command runs `smoke` and `core`
- an explicit hard-tier acceptance command may run reviewed `hard` fixtures separately for robustness monitoring
- a direct Node-based acceptance runner should exist so tier execution does not depend on npm wrapper resolution

## Fixture Promotion Rules

Move a fixture into `core` only when:

- its expected matrix is reviewed
- its role in coverage is documented
- it is not redundant with an existing fixture

Move a fixture into `hard` when:

- it exposes a real-world degradation mode worth tracking
- it is still too difficult to demand as a short-term blocking acceptance gate

## Initial Build Recommendation

The first implementation phase should start with:

1. a very small `smoke` tier
2. a curated `core` tier of printed clue boards
3. `hard` tier entries added after the core path is stable

## Relationship to the archived prototype

The removed prototype benchmark images are not automatically part of the permanent suite.

If any archived case is reintroduced:

- it must be copied into `/tests/fixtures/images`
- it must receive a reviewed manifest entry
- it must be assigned an explicit tier

## Definition of completion for step 2

Step 2 is complete when:

- the permanent fixture root exists
- the suite manifest path is fixed
- the benchmark tiers are fixed
- the promotion and regression rules are fixed
- future implementation work can add fixtures without inventing a new structure
