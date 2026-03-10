/**
 * Browser-mode tests for use-mobile hooks.
 *
 * These run in a real Chromium browser via Playwright — no matchMedia mocking needed.
 * The real browser's media query engine handles viewport changes natively.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useDeviceType, useIsMobile, useIsPortrait } from './use-mobile';

// Test component that exposes hook values to the DOM
function MobileStatus() {
  const isMobile = useIsMobile();
  return <div data-testid="is-mobile">{String(isMobile)}</div>;
}

function PortraitStatus() {
  const isPortrait = useIsPortrait();
  return <div data-testid="is-portrait">{String(isPortrait)}</div>;
}

function DeviceStatus() {
  const device = useDeviceType();
  return (
    <div>
      <span data-testid="dt-mobile">{String(device.isMobile)}</span>
      <span data-testid="dt-desktop">{String(device.isDesktop)}</span>
      <span data-testid="dt-portrait">{String(device.isPortrait)}</span>
      <span data-testid="dt-landscape">{String(device.isLandscape)}</span>
    </div>
  );
}

describe('useIsMobile (real browser)', () => {
  it('should return false on a wide viewport', async () => {
    await page.viewport(1024, 768);
    const screen = await render(<MobileStatus />);
    await expect.element(screen.getByTestId('is-mobile')).toHaveTextContent('false');
  });

  it('should return true on a narrow viewport', async () => {
    await page.viewport(375, 667);
    const screen = await render(<MobileStatus />);
    await expect.element(screen.getByTestId('is-mobile')).toHaveTextContent('true');
  });

  it('should respond to viewport resize', async () => {
    await page.viewport(1024, 768);
    const screen = await render(<MobileStatus />);
    await expect.element(screen.getByTestId('is-mobile')).toHaveTextContent('false');

    // Resize to mobile
    await page.viewport(375, 667);
    await expect.element(screen.getByTestId('is-mobile')).toHaveTextContent('true');

    // Resize back to desktop
    await page.viewport(1024, 768);
    await expect.element(screen.getByTestId('is-mobile')).toHaveTextContent('false');
  });
});

describe('useIsPortrait (real browser)', () => {
  it('should detect landscape orientation', async () => {
    await page.viewport(1024, 768);
    const screen = await render(<PortraitStatus />);
    await expect.element(screen.getByTestId('is-portrait')).toHaveTextContent('false');
  });

  it('should detect portrait orientation', async () => {
    await page.viewport(400, 800);
    const screen = await render(<PortraitStatus />);
    await expect.element(screen.getByTestId('is-portrait')).toHaveTextContent('true');
  });
});

describe('useDeviceType (real browser)', () => {
  it('should report desktop landscape', async () => {
    await page.viewport(1280, 720);
    const screen = await render(<DeviceStatus />);
    await expect.element(screen.getByTestId('dt-mobile')).toHaveTextContent('false');
    await expect.element(screen.getByTestId('dt-desktop')).toHaveTextContent('true');
    await expect.element(screen.getByTestId('dt-landscape')).toHaveTextContent('true');
  });

  it('should report mobile portrait', async () => {
    await page.viewport(375, 812);
    const screen = await render(<DeviceStatus />);
    await expect.element(screen.getByTestId('dt-mobile')).toHaveTextContent('true');
    await expect.element(screen.getByTestId('dt-desktop')).toHaveTextContent('false');
    await expect.element(screen.getByTestId('dt-portrait')).toHaveTextContent('true');
  });
});
