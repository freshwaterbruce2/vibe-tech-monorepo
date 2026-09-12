/**
 * Validates the release-relevant Capacitor server policy without executing the
 * TypeScript config. Keeping this pure lets focused tests exercise unsafe forms.
 */
export function validateCapacitorReleaseServerPolicy(source) {
  const failures = [];

  if (!/androidScheme:\s*'https'/.test(source)) {
    failures.push('Capacitor Android local scheme must be explicitly HTTPS.');
  }
  if (/androidScheme:\s*['"]http['"]/.test(source)) {
    failures.push('Capacitor Android local scheme must not use HTTP.');
  }
  if (/cleartext:\s*true\b/.test(source)) {
    failures.push('Capacitor release config must not opt into cleartext traffic.');
  }
  if (/\burl\s*:/.test(source)) {
    failures.push('Capacitor release config must not define server.url.');
  }
  if (/\ballowNavigation\s*:/.test(source)) {
    failures.push('Capacitor release config must not define allowNavigation.');
  }

  return failures;
}
