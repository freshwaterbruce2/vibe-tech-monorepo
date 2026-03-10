export const performanceMonitor = {
  startMeasure: (name: string) => {
    performance.mark(`${name}-start`);
  },
  endMeasure: (name: string) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  },
  log: (name: string) => {
    const entries = performance.getEntriesByName(name);
    if (entries.length > 0) {
      console.log(`${name}: ${entries[entries.length - 1]?.duration}ms`);
    }
  },
};

import { useEffect } from 'react';

export const usePerformanceMeasure = (measureName: string) => {
  useEffect(() => {
    performanceMonitor.startMeasure(measureName);
    return () => {
      performanceMonitor.endMeasure(measureName);
      performanceMonitor.log(measureName);
    };
  }, [measureName]);
};
