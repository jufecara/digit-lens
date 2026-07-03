# Requirements

[Specs Index](./README.md) | [Vision](./vision.md) | [Technical Spec](./technical-spec.md)

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Business Rules](#business-rules)
4. [Platform Requirements](#platform-requirements)
5. [Data Requirements](#data-requirements)

## Functional Requirements

- The library must accept image input from file-based sources and Base64 strings.
- The library must support standard browser file inputs and browser-mediated mobile camera capture flows.
- The library must detect the Sudoku board from a printed paper puzzle image.
- The library must recognize printed digits in each detected cell.
- The library must return a best-effort `9x9` matrix.
- The library must represent blank cells with `0`.
- The library must return basic scan diagnostics when uncertainty or quality issues exist.
- The library must validate whether the extracted board is structurally valid under Sudoku rules.
- The library must determine whether the extracted board has at least one valid solution.
- The library must report validation results separately from scan diagnostics.

## Non-Functional Requirements

- The library should run at usable speed in browser-based environments without requiring a server round trip.
- The library should remain local-first and self-contained in v1.
- The library should behave deterministically for the same input.
- The library should support modern browsers, PWAs, and compatible React Native-related JavaScript environments.

## Business Rules

- Returned board output must always be a `9x9` matrix.
- Blank cells must always be represented as `0`.
- Solved Sudoku output must not be presented as a product output.
- Diagnostics must not be mixed with validation semantics.

## Platform Requirements

- Browser-based usage is the primary target environment.
- Node.js compatibility is desirable where practical, but secondary.
- No authentication, role model, pricing rules, or quotas are required at the library level.

## Data Requirements

- The consuming application provides the image input.
- The library generates the matrix, diagnostics, and validation results.
- No permanent storage is required at the library level.
- Output should be structured as JSON-like data that is easy to consume programmatically.
- The curated dataset under `/data` is the active local evaluation and future-training asset for this project.
