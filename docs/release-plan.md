# Release Plan

## Overview

This project uses **automated semantic-release** with conventional commits.

## Setup Required

### GitHub Secrets

Add these secrets to your GitHub repository settings:

- `NPM_TOKEN`: Your NPM publish token (create at https://www.npmjs.com/settings/tokens)
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions (no setup needed)

### NPM Token Setup

1. Go to https://www.npmjs.com/settings/tokens
2. Create a new automation token
3. Add it as a repository secret named `NPM_TOKEN`

---

## Automated Release

### How It Works

- Semantic-release analyzes your commit messages
- Automatically determines version bump (major/minor/patch)
- Creates GitHub releases
- Publishes to NPM
- Generates changelog

### Commit Message Format

Use conventional commits:

```bash
# Patch release (bug fixes)
git commit -m "fix: resolve memory leak in image processing"

# Minor release (new features, backwards compatible)
git commit -m "feat: add support for custom digit recognition models"

# Major release (breaking changes)
git commit -m "break: change scanSudoku API signature"
```

### Installation

Dependencies are already installed:

```bash
semantic-release @semantic-release/changelog @semantic-release/commit-analyzer @semantic-release/github @semantic-release/npm @semantic-release/release-notes-generator
```

### Release Process

1. Make commits with conventional commit messages
2. Push to `main` branch
3. GitHub Actions runs tests and builds
4. If tests pass, semantic-release creates a new release
5. Package is published to NPM automatically

### Benefits

- No manual version management
- Consistent versioning based on changes
- Automatic changelog generation
- GitHub releases created automatically

---

## Current Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and PR:

- Security audit (npm audit)
- Type checking
- Test suite
- Build verification

### Release Workflow (`.github/workflows/publish.yml`)

Runs on push to `main` branch:

- Security audit (npm audit)
- Type checking
- Test suite
- Build
- Semantic-release creates version, GitHub release, and publishes to NPM

### Demo Deployment Workflow (`.github/workflows/deploy-demo.yml`)

Runs on push to `main` branch:

- Builds the demo application
- Deploys to GitHub Pages at https://jufecara.github.io/digit-lens/

---

## Security Measures

### Post-install Script Protection

The project uses `.npmrc` with `ignore-scripts=true` to block dependency lifecycle scripts during `npm install`. This is the primary protection against install-time supply-chain attacks.

### Security Audits

Both CI and release workflows run `npm audit --audit-level=high` to detect known vulnerabilities in dependencies before any release.

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
