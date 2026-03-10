
export const setupObserverMocks = () => {
  /**
   * Mock Intersection Observer
   * Required for virtual lists and lazy loading components
   */
  global.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: readonly number[] = [];

    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  /**
   * Mock Resize Observer
   * Required for resizable panels and responsive components
   */
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
};
