# Pipeline Modules

[Specs Index](./README.md) | [Runtime Contract](./runtime-contract.md) | [Technical Spec](./technical-spec.md)

## Purpose

This document defines the concrete module boundaries and stage-to-stage data flow for the first real `digit-lens` implementation.

It answers step 3:

- what modules should exist
- what each module owns
- what each module must return
- what the first implementation slice should include

This is an implementation design document, not a prototype recovery plan.

## Design Principles

- one responsibility per stage
- explicit typed handoff between stages
- diagnostics produced as early as possible
- OCR must not compensate for bad geometry
- validation must be separate from scan quality

## Recommended Source Layout

Suggested implementation layout:

```text
src/
  index.ts
  types/
    api.ts
    internal.ts
  pipeline/
    decode-input.ts
    normalize-image.ts
    detect-board.ts
    rectify-board.ts
    validate-grid.ts
    extract-cells.ts
    recognize-digits.ts
    assemble-result.ts
  validation/
    structural.ts
    solvability.ts
  diagnostics/
    issue-codes.ts
    summarize-diagnostics.ts
```

The exact filenames can change, but the responsibility boundaries should not collapse back into one large pipeline file.

## Stage Model

### Stage 1: Input decode

Module:

- `pipeline/decode-input.ts`

Input:

- `DigitLensInput`

Output:

```ts
type DecodedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray | ImageData;
  mimeType: string | null;
};
```

Responsibilities:

- validate supported input types
- decode bytes into a consistent image representation
- reject malformed payloads as `invalid-input`

Non-responsibilities:

- board detection
- OCR
- Sudoku validation

### Stage 2: Image normalization

Module:

- `pipeline/normalize-image.ts`

Input:

- `DecodedImage`

Output:

```ts
type NormalizedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray | ImageData;
  gray: unknown;
  normalizationFlags: string[];
};
```

Responsibilities:

- grayscale conversion
- illumination stabilization
- contrast normalization
- basic denoise
- color suppression support

Non-responsibilities:

- deciding final board validity
- digit classification

### Stage 3: Board candidate detection

Module:

- `pipeline/detect-board.ts`

Input:

- `NormalizedImage`

Output:

```ts
type BoardCandidate = {
  found: boolean;
  quad: [number, number][];
  confidence: number;
  issues: string[];
};
```

Responsibilities:

- find the dominant board candidate
- estimate the outer quadrilateral
- report `board-not-found` conditions

Non-responsibilities:

- perspective warp output
- OCR

### Stage 4: Board rectification

Module:

- `pipeline/rectify-board.ts`

Input:

- `NormalizedImage`
- `BoardCandidate`

Output:

```ts
type RectifiedBoard = {
  found: boolean;
  boardRgba: unknown;
  boardGray: unknown;
  boardBinary: unknown;
  size: number;
  rotationCandidates: Array<0 | 90 | 180 | 270>;
};
```

Responsibilities:

- perspective correction
- fixed-size board normalization
- generation of canonical orientation candidates

Non-responsibilities:

- final orientation choice based on OCR
- final Sudoku matrix

### Stage 5: Structural validation

Module:

- `pipeline/validate-grid.ts`

Input:

- `RectifiedBoard`

Output:

```ts
type GridValidation = {
  boardUsable: boolean;
  chosenRotation: 0 | 90 | 180 | 270 | null;
  horizontalLineCount: number | null;
  verticalLineCount: number | null;
  estimatedCellCount: number | null;
  spacingScore: number | null;
  issues: string[];
};
```

Responsibilities:

- choose canonical orientation using geometry first
- estimate `10` horizontal and `10` vertical separators
- estimate `81` cells
- determine whether the board is usable enough for OCR

Non-responsibilities:

- classifying digits
- determining Sudoku validity

### Stage 6: Cell extraction

Module:

- `pipeline/extract-cells.ts`

Input:

- `RectifiedBoard`
- `GridValidation`

Output:

```ts
type CellImage = {
  row: number;
  col: number;
  image: unknown;
  issues: string[];
};

type ExtractedCells = {
  cells: CellImage[];
};
```

Responsibilities:

- split board into `81` cells
- apply fixed margins
- remove borders and residual grid strokes
- normalize per-cell image size

Non-responsibilities:

- digit recognition
- Sudoku rule validation

### Stage 7: Printed-digit recognition

Module:

- `pipeline/recognize-digits.ts`

Input:

- `ExtractedCells`

Output:

```ts
type RecognizedCell = {
  row: number;
  col: number;
  digit: number;
  confidence: number | null;
  issues: string[];
};

type RecognizedBoard = {
  cells: RecognizedCell[];
};
```

Responsibilities:

- classify printed digits `1..9`
- keep blanks as `0`
- reject ambiguous or unsupported shapes

Non-responsibilities:

- board geometry correction
- Sudoku validation

### Stage 8: Result assembly

Module:

- `pipeline/assemble-result.ts`

Input:

- `GridValidation`
- `RecognizedBoard`

Output:

- preliminary `DigitLensResult`

Responsibilities:

- build the `9x9` matrix
- derive `status`
- combine diagnostics into stable runtime fields

### Stage 9: Sudoku validation

Modules:

- `validation/structural.ts`
- `validation/solvability.ts`

Input:

- assembled matrix

Output:

- structural validity
- solvability result
- validation codes

Responsibilities:

- check duplicates in rows, columns, and boxes
- run solvability only after structural validity succeeds

## Data Flow

Recommended execution order:

```text
DigitLensInput
  -> decode-input
  -> normalize-image
  -> detect-board
  -> rectify-board
  -> validate-grid
  -> extract-cells
  -> recognize-digits
  -> assemble-result
  -> structural validation
  -> solvability validation
  -> DigitLensResult
```

## Diagnostics Flow

Diagnostics should be accumulated progressively:

- decode stage adds input errors
- normalization adds image-quality warnings
- board stages add geometry issues
- cell/OCR stages add uncertainty issues
- validation stage adds Sudoku rule messages separately

Important rule:

- scan diagnostics must never be stored inside the validation message list

## First Implementation Slice

The first product slice should stop before OCR sophistication.

Recommended slice:

1. `decode-input`
2. `normalize-image`
3. `detect-board`
4. `rectify-board`
5. `validate-grid`

Deliverable behavior for slice 1:

- accept supported input
- detect and rectify the board
- report `boardDetected`
- report `boardUsable`
- report chosen orientation
- report geometric quality signals
- return placeholder matrix semantics only if explicitly allowed by the runtime contract

Why this slice first:

- geometry is the real dependency for every later step
- OCR quality will stay unstable until the board is canonical
- this isolates the highest-risk preprocessing work early

## Slice 2

After slice 1 is stable:

1. `extract-cells`
2. basic `recognize-digits`
3. `assemble-result`
4. structural Sudoku validation

## Slice 3

After slice 2 is stable:

- stronger printed-digit rejection
- low-confidence handling
- hard-case diagnostics
- solvability integration

## Explicit Anti-Patterns

Do not reintroduce:

- one large script that owns the whole pipeline
- OCR-driven board orientation without geometry checks
- board recrop heuristics that bypass structural validation
- prototype-only fixtures as implicit acceptance gates

## Completion Condition For Step 3

Step 3 is complete when:

- module boundaries are fixed
- stage inputs/outputs are fixed
- stage responsibilities are explicit
- the first implementation slice is defined
- implementation can begin without inventing a new architecture
