# digit-lens

Dataset-preparation workspace for browser-first Sudoku board recognition.

## Current status

The OCR prototype and benchmark scripts used during the exploration phase are archived as documentation only. They are not part of the active project runtime anymore.

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
npm run dataset:download
npm run dataset:organize
npm run dataset:split
```

Or run the default active flow:

```bash
npm run dataset:build
```

Augmentation is kept as a second-stage dataset expansion pass:

```bash
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
