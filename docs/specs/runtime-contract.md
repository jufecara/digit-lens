# Runtime Contract

[Specs Index](./README.md) | [Technical Spec](./technical-spec.md) | [Acceptance Criteria](./acceptance-criteria.md)

## Purpose

This document defines the product-facing runtime contract for the first real implementation of `digit-lens`.

It covers:

- supported input forms
- output shape
- diagnostics contract
- validation contract
- failure semantics
- internal module boundaries

This is the contract implementation should satisfy even if internal OCR or preprocessing details evolve.

## Supported Inputs

### Required input types

The runtime must accept one supported image at a time in one of these forms:

- browser `File`
- browser `Blob`
- Base64-encoded image string
- `Uint8Array` or `ArrayBuffer` image bytes

### Supported image formats

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/bmp`

### Input assumptions

- input contains at most one intended Sudoku board
- target board is a printed `9x9` Sudoku board
- target board may be rotated, skewed, shadowed, noisy, low-contrast, or partially color-biased
- input may contain background clutter

### Explicitly unsupported for v1

- handwritten digit recognition
- multiple board extraction from one image
- non-`9x9` Sudoku variants
- PDF/document ingestion as a first-class runtime input

## Public API Shape

Illustrative contract:

```ts
export type DigitLensInput =
  File | Blob | ArrayBuffer | Uint8Array | { base64: string; mimeType?: string };

export type DigitLensStatus =
  'ok' | 'partial' | 'invalid-input' | 'board-not-found' | 'unsupported-board' | 'processing-error';

export type DigitLensIssueCode =
  | 'low_contrast'
  | 'blur'
  | 'shadows'
  | 'glare'
  | 'perspective_distortion'
  | 'rotation_ambiguity'
  | 'weak_grid'
  | 'cropped_board'
  | 'color_interference'
  | 'digit_ambiguity'
  | 'low_confidence_cells';

export type DigitLensValidationCode =
  'invalid_shape' | 'duplicate_in_row' | 'duplicate_in_column' | 'duplicate_in_box' | 'unsolvable';

export type DigitLensResult = {
  status: DigitLensStatus;
  matrix: number[][];
  diagnostics: {
    warnings: DigitLensIssueCode[];
    issues: DigitLensIssueCode[];
    boardDetected: boolean;
    boardUsable: boolean;
    rotationDegrees: 0 | 90 | 180 | 270 | null;
    estimatedCellCount: number | null;
  };
  validation: {
    isStructurallyValid: boolean;
    isSolvable: boolean | null;
    messages: DigitLensValidationCode[];
  };
};
```

## Output Rules

### Matrix rules

- output must always contain `9` rows
- each row must always contain `9` integers
- cells must contain only `0..9`
- blank cells must always be `0`
- the runtime must never return alphabetic OCR output or multi-character cell output

### Status rules

#### `ok`

Use when:

- a board was detected
- the extracted matrix is usable
- no major runtime failure occurred

This does not require the puzzle to be valid or solvable.

#### `partial`

Use when:

- a board was detected
- some cells are uncertain, weak, or likely incomplete
- best-effort output is still worth returning

#### `invalid-input`

Use when:

- bytes cannot be decoded as a supported image
- image payload is empty or malformed

#### `board-not-found`

Use when:

- no Sudoku board candidate can be detected confidently

#### `unsupported-board`

Use when:

- a board-like structure exists
- but the runtime cannot normalize it into a reliable printed `9x9` board
- or the board appears handwritten-only or otherwise outside the supported scope

#### `processing-error`

Use when:

- an internal runtime failure occurs that is not caused by malformed user input

## Diagnostics Contract

Diagnostics describe scan and OCR quality. They must not be mixed with Sudoku validity.

### Diagnostics requirements

- `boardDetected` reports whether a board candidate was found
- `boardUsable` reports whether the candidate passed normalization/quality checks well enough for OCR
- `rotationDegrees` reports chosen canonical orientation when available
- `estimatedCellCount` reports geometric quality evidence when available
- `warnings` are non-fatal quality issues
- `issues` are more severe quality issues that justify retry or manual correction

### Diagnostics interpretation

- diagnostics are operational, not semantic
- diagnostics help the caller decide whether to trust the matrix
- diagnostics may exist even when `status === "ok"`

## Validation Contract

Validation describes Sudoku correctness, not image quality.

### Validation rules

- structural validity must be evaluated from the returned matrix
- solvability must be evaluated only if structural validity is true
- if structural validity is false, `isSolvable` should be `null`
- validation messages must use stable codes, not free-form text only

## Failure Semantics

### Allowed behavior

- return a best-effort matrix with `status: "partial"`
- return `board-not-found` when no reliable board exists
- return `unsupported-board` when the image is outside v1 scope

### Disallowed behavior

- returning malformed matrix shapes
- returning non-digit characters in cells
- silently mixing scan failure with Sudoku invalidity
- silently promoting low-confidence garbage to normal success without diagnostics

## Internal Module Boundaries

The first product implementation should keep these responsibilities separate.

### 1. Input decoding

Responsibilities:

- validate input type
- decode bytes into an image representation
- normalize image orientation metadata if present

### 2. Image normalization

Responsibilities:

- grayscale or color suppression
- illumination normalization
- noise reduction
- contrast stabilization

### 3. Board detection and rectification

Responsibilities:

- detect board candidate
- estimate quadrilateral
- correct perspective
- normalize canonical orientation
- output a fixed-size board image

### 4. Structural validation

Responsibilities:

- detect expected grid structure
- estimate `10` horizontal and `10` vertical separators
- verify near-uniform spacing
- estimate `81` cells
- set board usability signals

### 5. Cell extraction and normalization

Responsibilities:

- split board into `81` cells
- apply consistent crop margins
- suppress borders and leftover grid lines
- normalize cell image size

### 6. Printed-digit recognition

Responsibilities:

- classify printed digits `1..9`
- reject weak or unsupported cell shapes
- keep blank cells as `0`

### 7. Result validation

Responsibilities:

- build final `9x9` matrix
- run structural Sudoku validation
- run solvability check
- assemble final diagnostics and validation payload

## Non-Goals For Step 1

This contract does not decide:

- which OCR model or classifier family will be used
- exact confidence math
- exact internal file layout under a future `src/` implementation
- whether WebAssembly, pure JS, or hybrid local inference will be chosen

Those are implementation decisions that must satisfy this contract.

## Acceptance Mapping

This contract is considered satisfied when:

- the runtime accepts the supported input forms
- the runtime always returns the required output shape
- diagnostics and validation are separated
- failure states are explicit and stable
- implementation modules respect the responsibility boundaries above
