// Type definitions for Jest DOM matchers
import '@testing-library/jest-dom';

// Type definitions for jest-axe
declare module 'jest-axe' {
  export interface AxeResults {
    violations: any[];
    passes: any[];
    incomplete: any[];
    inapplicable: any[];
  }

  export function axe(element?: Element | Document, options?: any): Promise<AxeResults>;
  export function toHaveNoViolations(results: AxeResults): any;
  export const configureAxe: (options?: any) => typeof axe;
  export default axe;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      // Jest DOM matchers
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: any): R;
      toHaveClass(...classNames: string[]): R;
      toHaveFocus(): R;
      toHaveTextContent(text: string | RegExp): R;
      toContainHTML(htmlText: string): R;
      toHaveValue(value?: string | string[] | number): R;
      toBeChecked(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmptyDOMElement(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toBeVisible(): R;
      toHaveDescription(text?: string | RegExp): R;
      toHaveDisplayValue(value: string | RegExp | string[] | RegExp[]): R;
      toHaveErrorMessage(text?: string | RegExp): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toHaveAccessibleDescription(text?: string | RegExp): R;
      toHaveAccessibleName(text?: string | RegExp): R;

      // Jest Axe matchers
      toHaveNoViolations(): R;
    }
  }
}