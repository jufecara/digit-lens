# Release Plan

## Overview

Releases are performed manually after the CI workflow passes. The project no
longer uses semantic-release.

## Setup Required

### GitHub Actions

The CI workflow (`.github/workflows/ci.yml`) validates pushes to `main` and
pull requests. It does not publish packages.

### NPM Authentication

Authenticate with npm before publishing, using `npm login` or an approved
automation token.

---

## Manual Release

### Release Process

1. Update the version in `packages/core/package.json`.
2. Push the change and wait for the CI workflow to pass.
3. From the repository root, run `npm publish --workspace=@digit-lens/core`.
4. Create the corresponding Git tag and GitHub release.

---

## Current Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and PR:

- Security audit (npm audit)
- Type checking
- Test suite
- Build verification

### Demo Deployment Workflow (`.github/workflows/deploy-demo.yml`)

Runs on push to `main` branch:

- Builds the demo application
- Deploys to GitHub Pages at https://jufecara.github.io/digit-lens/

---

## Security Measures

### Post-install Script Protection

The project uses `.npmrc` with `ignore-scripts=true` to block dependency lifecycle scripts during `npm install`. This is the primary protection against install-time supply-chain attacks.

### Security Audits

The CI workflow runs `npm audit --audit-level=high` before a release.

### Additional .npmrc Protections

- `audit=true` - Enables npm audit
- `audit-level=high` - Fails on high-severity vulnerabilities
- `fund=false` - Disables funding messages
- `save-exact=true` - Pins exact versions
- `package-lock=true` - Ensures deterministic installs
- `registry=https://registry.npmjs.org/` - Pins to public npm registry

### Dependency Version Pinning

The project uses multiple layers to prevent unintended dependency updates:

1. **Exact version pinning**: `.npmrc` has `save-exact=true` to pin exact versions in package.json
2. **Lockfile enforcement**: CI workflows verify that `package-lock.json` hasn't changed unexpectedly
3. **Pre-commit hook**: Warns when `package-lock.json` is modified to prevent accidental subdependency updates
4. **Deterministic installs**: `npm ci` (used in CI) installs exact versions from the lockfile

This ensures that both direct dependencies and subdependencies stay at approved versions, preventing supply-chain attacks from unexpected updates.

---

## Updating Dependencies

Due to the security protections, updating dependencies requires explicit steps:

### To Add a New Dependency

```bash
npm install --save-exact <package-name>
git add package.json package-lock.json
git commit --no-verify -m "chore: add <package-name> dependency"
```

### To Update a Dependency

```bash
npm install --save-exact <package-name>@<version>
git add package.json package-lock.json
git commit --no-verify -m "chore: update <package-name> to <version>"
```

### To Update All Dependencies (Caution)

```bash
npm update
git add package-lock.json
git commit --no-verify -m "chore: update dependencies"
```

**Note**: The `--no-verify` flag bypasses the pre-commit hook that warns about lockfile changes. Only use this when you intentionally modified dependencies.

### To Revert Accidental Lockfile Changes

If you accidentally modified the lockfile without intent:

```bash
git checkout package-lock.json
npm install
```
