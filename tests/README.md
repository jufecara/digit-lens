# Tests

This directory contains the first product-facing test harness for `digit-lens`.

Current scope:

- contract-level tests for the public runtime entrypoint
- acceptance-suite manifest validation
- tiered fixture execution separated into blocking acceptance and opt-in hard monitoring

Current test files:

- `api-contract.test.mjs`
- `acceptance-manifest.test.mjs`
- `smoke-acceptance-suite.test.mjs`
- `core-acceptance-suite.test.mjs`
- `hard-acceptance-suite.test.mjs`

These tests are intentionally light. They exist to lock down:

- public result shape
- explicit failure semantics
- permanent fixture-manifest structure
- synthetic end-to-end board detection plus basic non-zero digit recognition on a generated board-like image
- structural duplicate validation for row/column/box conflicts
- solvability checks for solvable, unsolvable, and malformed matrices
- pipeline assembly remains covered through the public `scanSudoku` contract
- browser builds keep the Node-only decode fallback out of the bundled hot path

They do not yet validate OCR quality.

Execution model:

- `npm run test:contract` runs only the contract and validation-helper checks
- `npm run test:acceptance:smoke` runs manifest checks plus only the reviewed `smoke` tier
- `npm run test:acceptance:core` runs manifest checks plus only the reviewed `core` tier
- `npm test` and `npm run test:acceptance` run the blocking `smoke` and `core` tiers plus the contract checks
- `npm run test:acceptance:hard` runs the reviewed `hard` fixtures separately
- `npm run test:acceptance:all` runs every tier plus the contract checks
