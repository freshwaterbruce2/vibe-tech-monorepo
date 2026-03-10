import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { DoorSchedule } from '@/types/shipping';

// Common test data generator
export const createTestDoor = (overrides?: Partial<DoorSchedule>): DoorSchedule => ({
  id: `test-door-${Math.random().toString(36).substr(2, 9)}`,
  doorNumber: 342,
  destinationDC: "6024",
  freightType: "23/43",
  trailerStatus: "empty",
  palletCount: 0,
  timestamp: new Date().toISOString(),
  createdBy: "test-user",
  tcrPresent: false,
  notes: "",
  ...overrides
});

// Custom render with providers if needed
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  return rtlRender(ui, { ...options });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Common test data
export const validDoorNumbers = [332, 400, 454];
export const invalidDoorNumbers = [331, 455, 0, -1];
export const validDestinationDCs = ["6024", "6070", "6039", "6040", "7045"];
export const validFreightTypes = ["23/43", "28", "XD"];
export const validTrailerStatuses = ["empty", "25%", "50%", "75%", "partial", "shipload"];

// Common test expectations
export const expectValidationError = (container: HTMLElement, message: string) => {
  const error = container.querySelector('[role="alert"]');
  expect(error).toHaveTextContent(message);
};

// Common accessibility checks
export const expectNoAccessibilityViolations = async (container: HTMLElement) => {
  const { axe } = await import('jest-axe');
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}; 