# Security Policy

## Supported Versions

Currently supported versions of digit-lens:

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do not** open a public issue for security vulnerabilities.

Instead, send an email to [jfcastrillonr@gmail.com](mailto:jfcastrillonr@gmail.com) with:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (if available)

### Response Timeline

- Initial response within 48 hours
- Detailed response and remediation plan within 7 days
- Security advisory and fix release as soon as feasible

### What Happens Next

1. We will acknowledge receipt of your report
2. We will investigate the vulnerability
3. We will work on a fix
4. We will coordinate a release with you
5. We will publish a security advisory

## Security Best Practices

This project implements several security measures:

### Dependency Management

- Exact version pinning in package.json
- Lockfile enforcement in CI/CD
- Pre-commit hooks for dependency changes
- Security audits on every push and release

### Post-install Script Protection

The project uses `.npmrc` with `ignore-scripts=true` to block dependency lifecycle scripts during installation, protecting against supply-chain attacks.

### CI/CD Security

- Security audits run on every commit
- Lockfile consistency checks
- Automated vulnerability scanning with npm audit

### Additional Protections

- `.npmrc` pins to the public npm registry
- High-severity vulnerability blocking
- Deterministic installs with npm ci

See [docs/release-plan.md](./docs/release-plan.md) for detailed security documentation.

## Security Audits

Regular security audits are performed:

- Automated: On every push via GitHub Actions
- Manual: Periodic reviews of dependencies

## Disclosure Policy

We follow responsible disclosure:

- Give maintainers time to fix the issue
- Coordinate public disclosure
- Credit the reporter (if desired)
- Publish security advisories for fixed vulnerabilities

## Security Updates

Security updates will be:

- Released as soon as feasible
- Clearly marked in release notes
- Published as security advisories
- Recommended for immediate installation
