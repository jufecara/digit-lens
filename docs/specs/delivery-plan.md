# Delivery Plan

[Specs Index](./README.md) | [Technical Spec](./technical-spec.md) | [Benchmark Record](./benchmark-record.md)

## Table of Contents

1. [Working Model](#working-model)
2. [Immediate Outputs](#immediate-outputs)
3. [Execution Phases](#execution-phases)
4. [Decision Records](#decision-records)
5. [Approval Model](#approval-model)
6. [Spec Governance](#spec-governance)

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
