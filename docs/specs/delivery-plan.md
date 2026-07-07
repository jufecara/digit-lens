# Delivery Plan

[Specs Index](./README.md) | [Phases](./phases.md) | [Technical Spec](./technical-spec.md) | [Lessons Learned](../lessons-learned.md)

## Table of Contents

1. [Working Model](#working-model)
2. [Immediate Outputs](#immediate-outputs)
3. [Execution Phases](#execution-phases)
4. [Decision Records](#decision-records)
5. [Approval Model](#approval-model)
6. [Spec Governance](#spec-governance)
7. [Exploration Closeout](#exploration-closeout)

## Working Model

Preferred sequence:

`spec -> explore -> review -> approval -> build -> verify`

## Immediate Outputs

The initial spec set consists of:

- `vision.md`
- `requirements.md`
- `user-stories.md`
- `acceptance-criteria.md`
- `technical-spec.md`
- `delivery-plan.md`
- `../lessons-learned.md`

## Execution Phases

The active delivery control model is the fixed five-phase roadmap in [Phases](./phases.md).

1. `Phase 1: Runtime and test surface`
   Status: complete
2. `Phase 2: Browser demo`
   Status: complete
3. `Phase 3: Geometry baseline`
   Status: active
4. `Phase 4: OCR baseline`
   Status: planned
5. `Phase 5: Robustness and release readiness`
   Status: planned

The earlier `spec -> explore -> review -> approval -> build -> verify` sequence remains useful as historical process context, but it is no longer the active phase tracker for the repository.

## Decision Records

- Benchmark outcomes that change the recommended technical direction must be recorded in `../lessons-learned.md`
- Rejected approaches should remain documented when they materially influenced the chosen implementation path
- Prototype artifacts should be archived into durable documentation rather than left as active runtime

## Approval Model

- The user is the project owner
- The user reviews and approves specs
- Core features should not proceed past the exploration/build boundary without approval

## Spec Governance

- Specs live in `/docs/specs`
- Specs should evolve continuously during early discovery and implementation
- Spec strictness is moderate
- Assumptions and open questions should be tracked inside relevant sections
- Durable benchmark decisions should be reflected in both the specs and the intake source when they change the recommended direction

## Exploration Closeout

Exploration should be treated as complete when the following are true:

- the in-house OCR direction is explicitly retained or rejected based on benchmark evidence
- the lessons-learned archive is updated with the final conclusion
- the project has a documented handoff into the next stage without leaving prototype runtime in the active surface

The current project state satisfies that closeout model as follows:

- the prototype runtime has been removed from the active repository surface
- the archived OCR findings are retained in [Lessons Learned](../lessons-learned.md)
- the prepared dataset under `/data` remains the active project asset
- augmentation remains documented as a second-stage option, not part of the default baseline

Current phase status:

- `Phase 1: Runtime and test surface` is complete
- `Phase 2: Browser demo` is complete
- `Phase 3: Geometry baseline` is active
- `Phase 4: OCR baseline` is planned
- `Phase 5: Robustness and release readiness` is planned

Latest Phase 3 progress:

- rotated hard-case board detection no longer falls back to the whole page when a strong internal square component is available
- the reviewed sideways hard fixture now drops its false `cropped_board` warning while remaining non-blocking
- rectified-board binarization now blends global and local thresholding so glare, shadows, and colored cells degrade the grid less severely
- recovered separator positions now feed cell extraction directly, which allows selected weak-grid captures to become usable without relaxing the reviewed `core` fixture
- board-boundary refinement now runs a bounded inner-crop search and scores candidates with the actual geometry validator instead of a coarse proxy
- the reviewed `core` Jeffrey Wolberg fixture now advances from `unsupported-board` to `partial`, which confirms a geometry gain while also showing OCR ambiguity is still unresolved

Current Phase 3 focus:

- keep geometry-related documentation synchronized with acceptance expectations and runtime behavior
- reduce geometry-driven `digit_ambiguity` on promoted real-photo fixtures before declaring Phase 3 complete
- ensure remaining difficult reviewed cases fail for explicit, documented reasons

Implementation history from the earlier incremental sequence remains preserved in git history and in previous plan revisions, but the active control model for the project is now the fixed phase roadmap in [Phases](./phases.md).
