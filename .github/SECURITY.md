# Security Policy

## Supported Versions

| Version    | Supported             |
| ---------- | --------------------- |
| main       | Yes                   |
| develop    | Yes                   |
| feature/\* | No (development only) |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email: [security contact - configure in GitHub Settings]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix**: Depends on severity (critical: 24h, high: 1 week, medium: 2 weeks)

## Security Measures

This repository enforces:

- Branch protection rulesets on `main`
- Required PR reviews before merge
- Required status checks (CI must pass)
- Signed commits encouraged
- Secret scanning with push protection enabled
- Dependabot security alerts enabled
- All GitHub Actions pinned to full-length commit SHAs
- Least-privilege `GITHUB_TOKEN` permissions
- CODEOWNERS for mandatory review of sensitive paths

## Scope

- All application code in `apps/` and `packages/`
- CI/CD pipelines in `.github/workflows/`
- Infrastructure configuration
- Dependencies (npm, pip, cargo)

## Out of Scope

- Third-party services (Anthropic, OpenRouter, etc.)
- Development-only tools and scripts
- Test fixtures and mock data
