# User Stories

[Specs Index](./README.md) | [Requirements](./requirements.md) | [Acceptance Criteria](./acceptance-criteria.md)

## Table of Contents

1. [Primary Personas](#primary-personas)
2. [Core User Stories](#core-user-stories)
3. [Maintainer Stories](#maintainer-stories)
4. [Workflow States](#workflow-states)
5. [Edge Cases](#edge-cases)

## Primary Personas

- Frontend developer building a Sudoku web app
- Indie developer building a standalone puzzle tool
- Technical product builder prototyping Sudoku-related features

## Core User Stories

1. As a frontend developer, I want to pass a photo of a printed Sudoku board into the library, so that I can obtain a `9x9` matrix representation of the puzzle.
2. As a frontend developer, I want scan diagnostics returned with the matrix, so that my application can decide whether to accept the result, ask for retry, or allow manual correction.
3. As an indie developer, I want minimal setup, so that I can add Sudoku scanning without building custom OCR or image-processing logic.
4. As a product builder, I want the library to handle difficult real-world photos, so that users do not need ideal image capture conditions.
5. As a developer, I want structural validation and solvability results, so that I can distinguish invalid source puzzles from scan-related issues.

## Maintainer Stories

1. As a library maintainer, I want representative Sudoku image fixtures, so that quality can be evaluated against realistic inputs.
2. As a library maintainer, I want failures separated into board-detection, OCR, and validation categories, so that improvements are diagnosable.
3. As a library maintainer, I want benchmark comparisons across versions, so that regressions are visible.

## Workflow States

- Image received
- Scan in progress
- Matrix and diagnostics returned
- Retry or correction recommended
- Invalid or unsolvable puzzle reported

## Edge Cases

- Angled or perspective-distorted photos
- Uneven lighting and shadows
- Non-uniform paper colors
- Background clutter
- Imperfect framing
- Low-resolution or mildly blurry images
- Faint or low-contrast printed digits
- Boards that are invalid or unsolvable
