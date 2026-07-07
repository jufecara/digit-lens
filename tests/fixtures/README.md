# Acceptance Fixtures

This directory contains the permanent product-facing acceptance fixtures for `digit-lens`.

Tracked structure:

- `acceptance-suite.json`: canonical fixture manifest
- `images/`: reviewed fixture images used by the permanent suite

Fixtures should be added here only after they have:

- a stable expected outcome
- a documented benchmark tier
- a reviewed reason for inclusion

Current tracked fixture set:

- `images/smoke-synthetic-board.png`: deterministic smoke-tier board used to exercise the full public runtime from image decode through validation
- `images/smoke-invalid-duplicate-row.png`: deterministic smoke-tier board used to keep structural-validation failures under reviewed runtime coverage
- `images/core-jeffreywolberg-image1073.jpg`: reviewed core-tier real printed-board capture copied from the public dataset to track the current geometry-stage limitation on moderately difficult photos
- `images/hard-jeffreywolberg-image1043.jpg`: reviewed hard-tier rotated real-photo board copied from the public dataset to track a non-blocking sideways-page failure mode

Prototype-era benchmark assets are not restored here automatically. If an archived case is worth keeping, re-add it deliberately with a reviewed manifest entry.

Execution model:

- `npm test` and the default acceptance command run only `smoke` and `core`
- `npm run test:acceptance:smoke` and `npm run test:acceptance:core` isolate those tiers with the shared manifest checks
- `smoke` and `core` fixtures run in the default acceptance command
- `hard` fixtures run only through the opt-in hard acceptance command so difficult cases stay monitored without blocking each early implementation phase
- the acceptance runner is available as `node scripts/run-acceptance.js <contract|smoke|core|blocking|hard|all>` when direct Node execution is preferable to npm wrappers
