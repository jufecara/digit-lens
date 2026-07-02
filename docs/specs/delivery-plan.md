# Delivery Plan

[Specs Index](./README.md) | [Technical Spec](./technical-spec.md) | [Benchmark Record](./benchmark-record.md)

## Table of Contents

1. [Working Model](#working-model)
2. [Immediate Outputs](#immediate-outputs)
3. [Execution Phases](#execution-phases)
4. [Decision Records](#decision-records)
5. [Approval Model](#approval-model)
6. [Spec Governance](#spec-governance)
7. [Spike Exit](#spike-exit)

## Working Model

Preferred sequence:

`spec -> spike -> review -> approval -> build -> verify`

## Immediate Outputs

The initial spec set consists of:

- `vision.md`
- `requirements.md`
- `user-stories.md`
- `acceptance-criteria.md`
- `technical-spec.md`
- `benchmark-record.md`
- `delivery-plan.md`

## Execution Phases

### Phase 1: Spec

- Finalize product intent, scope, requirements, and risks

### Phase 2: Spike

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

- Benchmark outcomes that change the recommended technical direction must be recorded in `benchmark-record.md`
- Rejected approaches should remain documented when they materially influenced the chosen implementation path
- Spike notes under `/spikes/notes` are the detailed evidence, while `/docs/specs` captures the durable project decision

## Approval Model

- The user is the project owner
- The user reviews and approves specs
- Core features should not proceed past the spike/build boundary without approval

## Spec Governance

- Specs live in `/docs/specs`
- Specs should evolve continuously during early discovery and implementation
- Spec strictness is moderate
- Assumptions and open questions should be tracked inside relevant sections
- Durable benchmark decisions should be reflected in both the specs and the intake source when they change the recommended direction

## Spike Exit

The spike should be treated as complete when the following are true:

- the in-house OCR direction is explicitly retained or rejected based on benchmark evidence
- the benchmark record is updated with the final spike conclusion
- the project has a documented handoff into the next stage without silently changing the active spike runtime

The current project state satisfies that exit model as follows:

- the in-house OCR path is retained in [Benchmark Record](./benchmark-record.md)
- the prepared dataset under `/data` is documented as next-stage material rather than active spike input
- augmentation is documented as a second-stage option, not part of the default spike baseline

Immediate post-spike next step:

- build a dedicated dataset consumer/evaluation script for `/data/metadata/dataset_index.json` and `/data/splits/*`
