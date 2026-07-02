# digit-lens

Spike workspace for browser-first Sudoku board extraction and OCR experiments.

## npm safety

This project now uses a local [.npmrc](./.npmrc) with `ignore-scripts=true` to block dependency lifecycle scripts during `npm install`. That is the main protection against install-time supply-chain attacks. It also enables audit checks at `high` severity and pins installs to the public npm registry.

If you intentionally need a package that requires a postinstall step, run that step explicitly after review instead of allowing it automatically during installation.

## Sudoku training dataset

The dataset setup uses only public sources that do not require credentials, API keys, cookies, or account login:

- `jeffreywolberg/sudoku_dataset` from GitHub
- the public Newcastle/Figshare Sudoku dataset page, if it still exposes a direct public archive link

If a public source is unavailable or its direct download link has changed, the scripts skip it gracefully and record the reason in [data/metadata/failed_downloads.log](data/metadata/failed_downloads.log).

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

Augmentation is kept as a second stage for near-future robustness work, not as part of the default active pipeline:

```bash
npm run dataset:augment
npm run dataset:build:stage2
```

Raw downloads are stored under `/data/raw`. Processed board images are stored under `/data/processed/boards`. Train/validation/test split links or copies are stored under `/data/splits`.

The generated dataset tree under `data/` is local working state and is ignored by git.

Fully filled boards are kept out of the current train/val/test pool and staged for later use under `/data/processed/boards/deferred/handwritten_candidates`. For the Jeffrey Wolberg source, the organizer uses paired public `.dat` labels to move filled-board candidates into that deferred bucket while keeping clue-style boards active. Deferred entries remain in the metadata with `usage: "deferred"` and `deferredReason: "filled_or_handwritten_candidate"`.

The augmentation step is a second-stage dataset expansion pass. It creates hard-case board variants for:

- `blur`
- `low_light`
- `glare`
- `shadows`
- `perspective`
- `cropped`
- `noisy`
- `low_contrast`
- `jpeg_compression`

These variants are written to `/data/processed/boards/augmented` and mirrored into `/data/processed/boards/hard_cases/<case>`. Treat them as future training material rather than part of the current spike baseline.

If one of the public dataset pages changes, update the source URL discovery logic in [scripts/dataset-utils.js](./scripts/dataset-utils.js) or place a publicly downloadable archive into the matching folder under `/data/raw` and rerun the organize and split steps. Only rerun augmentation when you intentionally want the second-stage expanded set.
