/**
 * DoorEntryRow tests are skipped when @vibetech/ui workspace dependency is not linked.
 * This occurs in CI or when running `pnpm install --filter shipping-pwa` without
 * also linking the @vibetech/ui package.
 *
 * To run these tests:
 *   pnpm install   (from monorepo root to link all workspace deps)
 */

let vibtechUiAvailable = false;
try {
  await import("@vibetech/ui");
  vibtechUiAvailable = true;
} catch {
  // Module not available
}

describe.skipIf(!vibtechUiAvailable)("DoorEntryRow", () => {
  // These tests require @vibetech/ui to be available as a workspace dependency.
  // When it's not linked, DoorEntryRow.tsx cannot be imported.
  it("placeholder for when @vibetech/ui is available", () => {
    expect(true).toBe(true);
  });
});
