/**
 * Custom React Testing Library utilities with common setup
 * Reduces boilerplate in component tests
 */

import { render as rtlRender, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';

interface WrapperProps {
  children: ReactNode;
}

/**
 * Custom render function that wraps components with common providers
 * Usage: const { user, ...renderResult } = render(<MyComponent />)
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();

  return {
    user,
    ...rtlRender(ui, options),
  };
}

/**
 * Creates a wrapper with providers for testing
 * Usage: render(<MyComponent />, { wrapper: createWrapper({ theme: 'dark' }) })
 */
export function createWrapper(_options?: { theme?: string }): (props: WrapperProps) => ReactElement {
  return function Wrapper({ children }: WrapperProps): ReactElement {
    // Add common providers here (Theme, Router, etc.)
    return <>{children}</>;
  };
}

/**
 * Wait for element to be removed with timeout
 */
export async function waitForElementToBeRemoved(
  callback: () => HTMLElement | null,
  options?: { timeout?: number }
): Promise<void> {
  const { timeout = 3000 } = options ?? {};
  const start = Date.now();

  while (callback() !== null) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for element to be removed');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

/**
 * Common test utilities for form testing
 */
export const formUtils = {
  /**
   * Fill out a form with provided values
   */
  async fillForm(
    user: ReturnType<typeof userEvent.setup>,
    values: Record<string, string>
  ): Promise<void> {
    for (const [label, value] of Object.entries(values)) {
      const element = document.querySelector(`[aria-label="${label}"], [name="${label}"]`) as HTMLInputElement;
      if (element) {
        await user.clear(element);
        await user.type(element, value);
      }
    }
  },

  /**
   * Submit a form by clicking submit button
   */
  async submitForm(user: ReturnType<typeof userEvent.setup>, buttonText = 'Submit'): Promise<void> {
    const button = document.querySelector(`button:contains("${buttonText}")`) as HTMLButtonElement;
    if (button) {
      await user.click(button);
    }
  }
};

// Re-export everything from @testing-library/react
// eslint-disable-next-line react-refresh/only-export-components -- Test utility barrel re-export for RTL helpers.
export * from '@testing-library/react';
export { userEvent };
