# digit-lens

Browser-first Sudoku board recognition library with OCR capabilities.

> **⚠️ Experimental Status**: This library is currently marked as experimental and published with the `@experimental` tag. OCR quality is limited and may not work reliably on all Sudoku boards. Use for research and prototyping only.

[![CI](https://github.com/jufecara/digit-lens/actions/workflows/ci.yml/badge.svg)](https://github.com/jufecara/digit-lens/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/digit-lens.svg)](https://www.npmjs.com/package/digit-lens)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/jufecara/digit-lens/branch/main/graph/badge.svg)](https://codecov.io/gh/jufecara/digit-lens)

## Current Status

The active runtime is the browser-first library under `/src`. Library builds are emitted to `/dist`, and the build clears stale output files before writing new artifacts for deterministic builds.

## Code Quality

This project uses ESLint and Prettier to maintain code quality and consistent formatting.

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Pre-commit Hooks

The project uses husky and lint-staged to automatically lint and format staged files before commits. This ensures all committed code follows the project's style standards.

### CI/CD

Both CI and release workflows run linting and formatting checks to maintain code quality across all changes.

## Runtime setup

The repository now includes a project-level [.nvmrc](./.nvmrc) pinned to the expected Node.js version.

Before running project commands, use:

```bash
nvm use
```

If you do not have that version installed yet, run:

```bash
nvm install
```

## Runtime package

The library entrypoint is `scanSudoku`, with `validateStructuralSudoku` and `validateSudokuSolvability` exported as validation helpers. The package build now emits:

- ESM runtime: `/dist/digit-lens.js`
- CommonJS runtime: `/dist/digit-lens.umd.cjs`
- Type declarations: `/dist/index.d.ts`

Typical usage:

```ts
import { scanSudoku } from 'digit-lens';
```

Runtime verification commands:

- `npm run test:contract`: API-contract and validation-helper checks only
- `npm run test:acceptance:smoke`: smoke-tier fixture checks plus manifest validation
- `npm run test:acceptance:core`: core-tier fixture checks plus manifest validation
- `npm test`: same blocking suite as the default acceptance command
- `npm run test:acceptance`: blocking `smoke` and `core` acceptance tiers
- `npm run test:acceptance:hard`: opt-in `hard` tier monitoring for reviewed difficult fixtures
- `npm run test:acceptance:all`: blocking tiers plus the opt-in hard tier in one run

## Browser demo

The repository now includes a browser example app under `/demo`. It loads the library directly in the browser, opens the camera, captures one frame, and renders:

- recognized `9x9` matrix
- runtime status
- diagnostics warnings and issues
- validation output
- raw JSON response

### Live Demo

A live version of the demo is available at: https://jufecara.github.io/digit-lens/

### Local Development

Run it with:

```bash
nvm use
npm run demo
```

Build it with:

```bash
nvm use
npm run demo:build
```

If `npm` is not on your shell `PATH`, the equivalent direct command is:

```bash
node node_modules/vite/bin/vite.js --config vite.demo.config.ts
```

Use [docs/lessons-learned.md](./docs/lessons-learned.md) for:

- final benchmark results
- decisions that survived the prototype phase
- failed approaches worth remembering
- enough implementation detail to reconstruct the removed scripts if the team ever needs them again

## npm safety

This project uses a local [.npmrc](./.npmrc) with `ignore-scripts=true` to block dependency lifecycle scripts during `npm install`. That is the main protection against install-time supply-chain attacks. It also enables audit checks at `high` severity and pins installs to the public npm registry.

If a dependency legitimately requires a postinstall step, run that step manually after review instead of allowing it automatically during installation.

## Sudoku training dataset

The dataset setup uses only public sources that do not require credentials, API keys, cookies, or account login:

- `jeffreywolberg/sudoku_dataset` from GitHub
- the public Newcastle/Figshare Sudoku dataset page, if it still exposes a direct public archive link

If a public source is unavailable or its direct download link has changed, the scripts skip it gracefully and record the reason in [data/metadata/failed_downloads.log](./data/metadata/failed_downloads.log).

Run the dataset setup with:

```bash
nvm use
npm run dataset:download
npm run dataset:organize
npm run dataset:split
```

Or run the default active flow:

```bash
nvm use
npm run dataset:build
```

Augmentation is kept as a second-stage dataset expansion pass:

```bash
nvm use
npm run dataset:augment
npm run dataset:build:stage2
```

Raw downloads are stored under `/data/raw`. Processed board images are stored under `/data/processed/boards`. Train/validation/test split links or copies are stored under `/data/splits`.

The generated dataset tree under `data/` is local working state and is ignored by git.

Fully filled boards stay out of the default active pool and are staged for later use under `/data/processed/boards/deferred/handwritten_candidates`. Deferred entries remain in metadata with `usage: "deferred"` so they can be reintroduced deliberately later.

The augmentation step creates second-stage hard-case variants for:

- `blur`
- `low_light`
- `glare`
- `shadows`
- `perspective`
- `cropped`
- `noisy`
- `low_contrast`
- `jpeg_compression`

These variants are written to `/data/processed/boards/augmented` and mirrored into `/data/processed/boards/hard_cases/<case>`. Treat them as future robustness material, not part of the default baseline.

If one of the public dataset pages changes, update the source URL discovery logic in [scripts/dataset-utils.js](./scripts/dataset-utils.js) or place a publicly downloadable archive into the matching folder under `/data/raw` and rerun the organize and split steps.
