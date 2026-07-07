# Contributing to digit-lens

Thank you for your interest in contributing to digit-lens! This document provides guidelines and instructions for contributing to the project.

## AI Assistant Guidelines

This section provides context for AI assistants (Claude, Copilot, Codex, etc.) working on this project.

### Project Overview

digit-lens is a TypeScript library for browser-first Sudoku board recognition with OCR capabilities.

### Coding Standards

- **Language**: TypeScript (strict mode)
- **Package Manager**: npm only (not yarn/pnpm)
- **Linting**: ESLint with flat config (eslint.config.js)
- **Formatting**: Prettier (single quotes, 2 spaces, LF line endings)
- **Style**: 2-space indentation, max 100 char line length

### TypeScript Rules

- Avoid `any` type (use `unknown` if needed)
- Prefix unused parameters with underscore (`_param`)
- Use type inference when types are obvious
- Prefer interfaces for object shapes

### Quality Requirements

- All code must pass `npm run lint`
- All code must pass `npm run format:check`
- All code must pass `npm run typecheck`
- All tests must pass `npm test`
- Pre-commit hooks enforce linting/formatting

### Security Rules

- Use `npm install --save-exact <package>` for exact versions
- Commit both package.json and package-lock.json together
- Use `--no-verify` when committing dependency changes
- Never bypass npm audit without justification

### File Organization

- Source: `/src`
- Tests: `/tests`
- Scripts: `/scripts`
- Demo: `/demo`
- Docs: `/docs`

### Commit Messages

Use conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
Format: `<type>: <description>`

### Before Committing

1. Run `npm run lint` (or let pre-commit handle it)
2. Run `npm run format` (or let pre-commit handle it)
3. Run `npm run typecheck`
4. Run `npm test`
5. Write conventional commit message

## Human Contributors

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [jfcastrillonr@gmail.com](mailto:jfcastrillonr@gmail.com).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment details (Node.js version, OS, browser)
- Relevant code samples or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Explain why this enhancement would be useful
- Provide examples of how the enhancement would be used

### Pull Requests

1. Fork the repository
2. Create a branch for your feature or bugfix
3. Make your changes following the project's coding standards
4. Add tests for your changes
5. Ensure all tests pass
6. Commit your changes using [conventional commits](https://www.conventionalcommits.org/)
7. Push to your fork and submit a pull request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/jufecara/digit-lens.git
cd digit-lens

# Install dependencies
nvm use
npm ci

# Run tests
npm test

# Run type checking
npm run typecheck

# Build the project
npm run build
```

### Commit Message Format

This project uses [conventional commits](https://www.conventionalcommits.org/):

- `fix:` - Bug fixes
- `feat:` - New features
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

Example: `feat: add support for custom digit recognition models`

### Coding Standards

- Follow existing code style and patterns
- Use TypeScript for type safety
- Write tests for new features
- Keep functions small and focused
- Add comments for complex logic
- Follow ESLint rules (run `npm run lint` to check)
- Follow Prettier formatting (run `npm run format` to format)
- Pre-commit hooks automatically lint and format staged files

### Updating Dependencies

Due to security protections, updating dependencies requires specific steps:

```bash
# Add a new dependency
npm install --save-exact <package-name>
git add package.json package-lock.json
git commit --no-verify -m "chore: add <package-name> dependency"

# Update a dependency
npm install --save-exact <package-name>@<version>
git add package.json package-lock.json
git commit --no-verify -m "chore: update <package-name> to <version>"
```

See [docs/release-plan.md](./docs/release-plan.md) for more details.

## Project Structure

- `/src` - Library source code
- `/tests` - Test files
- `/scripts` - Build and utility scripts
- `/demo` - Browser demo application
- `/docs` - Documentation
- `/data` - Dataset files (git ignored)

## Getting Help

If you need help:

- Check existing [issues](https://github.com/jufecara/digit-lens/issues)
- Read the [documentation](./README.md)
- Contact [jfcastrillonr@gmail.com](mailto:jfcastrillonr@gmail.com)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
