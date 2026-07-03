# Delivery Plan

[Specs Index](./README.md) | [Technical Spec](./technical-spec.md) | [Lessons Learned](../lessons-learned.md)

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

### Phase 1: Spec

- Finalize product intent, scope, requirements, and risks

### Phase 2: Explore

- Validate OCR and image-processing feasibility
- Confirm whether the suggested stack is adequate

### Phase 3: Review

- Review findings against specs
- Update assumptions and open questions
- Record benchmark-backed decisions and rejected alternatives

### Phase 4: Approval

- Approve core feature direction before committed implementation

### Phase 5: Build

- Implement approved capabilities incrementally

### Phase 6: Verify

- Run tests, fixtures, and regression comparisons

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

Immediate next step:

- define product-grade test fixtures and acceptance checks outside the removed prototype harness
- design the next OCR implementation as a real pipeline, not as a recovered spike script
