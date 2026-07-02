# Acceptance Criteria

[Specs Index](./README.md) | [User Stories](./user-stories.md) | [Technical Spec](./technical-spec.md)

## Table of Contents

1. [Checklist Criteria](#checklist-criteria)
2. [Gherkin Criteria](#gherkin-criteria)
3. [Definition of Done](#definition-of-done)
4. [Traceability Note](#traceability-note)

## Checklist Criteria

### Input Handling

- Accepts file-based image input
- Accepts Base64-encoded image input
- Supports browser-mediated mobile camera capture flows through the consuming application

### Extraction

- Detects a printed Sudoku board
- Returns a `9x9` matrix
- Uses `0` for blanks
- Attempts extraction under non-ideal real-world conditions

### Diagnostics

- Returns basic diagnostics when recognition uncertainty exists
- Separates scan diagnostics from validation outcomes
- Provides enough information to support retry or manual correction decisions

### Validation

- Reports structural validity
- Reports solvability status
- Does not return the completed solved board as product output

## Gherkin Criteria

```gherkin
Feature: Extract Sudoku board from image

  Scenario: Valid printed Sudoku image
    Given a supported image containing a printed Sudoku board
    When the library processes the image
    Then it returns a 9x9 matrix
    And blank cells are represented as 0

  Scenario: Low-confidence extraction
    Given a supported image with difficult quality conditions
    When the library processes the image
    Then it returns a best-effort 9x9 matrix
    And it includes scan diagnostics describing uncertainty

  Scenario: Invalid puzzle
    Given an extracted board that violates Sudoku rules
    When validation runs
    Then the library reports that the puzzle is invalid
    And the validation result is separate from scan diagnostics

  Scenario: Unsolvable puzzle
    Given an extracted board that is structurally valid but has no solution
    When solvability evaluation runs
    Then the library reports that the puzzle has no valid solution
```

## Definition of Done

A feature is done when it is implemented, tested, documented, and produces deterministic results against approved acceptance criteria.

## Traceability Note

Important requirements should map to tests. Full one-to-one traceability is not required for every minor statement, but core behaviors must remain test-backed.
