/**
 * Performance Optimization Service for Vibe Tutor
 * Monitors and optimizes app performance, memory usage, and bundle size
 */

import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  bundleSize?: number;
  fps: number;
  networkRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface OptimizationSuggestion {
  type: 'memory' | 'network' | 'rendering' | 'bundle';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

interface PerformanceExtended extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

export class PerformanceOptimizationService {
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    memoryUsage: 0,
    fps: 60,
    networkRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  private observers: PerformanceObserver[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private memoryIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    // Monitor page load performance
    this.measureLoadTime();

    // Monitor memory usage
    this.monitorMemory();

    // Monitor FPS
    this.monitorFPS();

    // Monitor network activity
    this.monitorNetwork();

    // Set up performance observer
    this.setupPerformanceObserver();
  }

  /**
   * Measure initial page load time
   */
  private measureLoadTime(): void {
    if (window.performance?.timing) {
      const timing = window.performance.timing;
      this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemory(): void {
    if ('memory' in performance) {
      this.memoryIntervalId = setInterval(() => {
        const memory = (performance as unknown as PerformanceExtended).memory;
        if (memory) {
          this.metrics.memoryUsage = memory.usedJSHeapSize / 1048576; // Convert to MB
        }
      }, 5000);
    }
  }

  /**
   * Monitor frames per second
   */
  private monitorFPS(): void {
    const measureFPS = (timestamp: number) => {
      if (this.lastFrameTime) {
        const delta = timestamp - this.lastFrameTime;
        const fps = 1000 / delta;
        this.metrics.fps = Math.round(fps);
      }
      this.lastFrameTime = timestamp;
      this.frameCount++;

      if (this.frameCount < 100) {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitor network requests via PerformanceObserver (no fetch override)
   */
  private monitorNetwork(): void {
    if (!('PerformanceObserver' in window)) return;
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        this.metrics.networkRequests += list.getEntries().length;
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.push(resourceObserver);
    } catch {
      // resource observer not supported
    }
  }

  /**
   * Set up performance observer for detailed metrics
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      // Observe long tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              logger.warn('Long task detected:', {
                duration: entry.duration,
                name: entry.name,
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch {
        // Long task observer not supported
      }

      // Observe layout shifts
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Check if entry is LayoutShift (has value property)
            if ('value' in entry) {
              const shift = entry as unknown as LayoutShift;
              if (shift.value > 0.1) {
                logger.warn('Layout shift detected:', shift.value);
              }
            }
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      } catch {
        // Layout shift observer not supported
      }
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Analyze performance and provide suggestions
   */
  analyzePerformance(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check memory usage
    if (this.metrics.memoryUsage > 100) {
      suggestions.push({
        type: 'memory',
        severity: 'high',
        description: `Memory usage is high (${Math.round(this.metrics.memoryUsage)}MB)`,
        recommendation: 'Consider clearing unused data and optimizing component renders',
      });
    } else if (this.metrics.memoryUsage > 50) {
      suggestions.push({
        type: 'memory',
        severity: 'medium',
        description: `Memory usage is moderate (${Math.round(this.metrics.memoryUsage)}MB)`,
        recommendation: 'Monitor for memory leaks in long-running sessions',
      });
    }

    // Check FPS
    if (this.metrics.fps < 30) {
      suggestions.push({
        type: 'rendering',
        severity: 'high',
        description: `Low frame rate detected (${this.metrics.fps} FPS)`,
        recommendation: 'Reduce animations or optimize render-heavy components',
      });
    } else if (this.metrics.fps < 50) {
      suggestions.push({
        type: 'rendering',
        severity: 'medium',
        description: `Frame rate below optimal (${this.metrics.fps} FPS)`,
        recommendation: 'Consider using React.memo and useCallback for optimization',
      });
    }

    // Check network requests
    if (this.metrics.networkRequests > 50) {
      suggestions.push({
        type: 'network',
        severity: 'medium',
        description: `High number of network requests (${this.metrics.networkRequests})`,
        recommendation: 'Implement request batching or caching strategies',
      });
    }

    // Check load time
    if (this.metrics.loadTime > 3000) {
      suggestions.push({
        type: 'bundle',
        severity: 'high',
        description: `Slow initial load time (${(this.metrics.loadTime / 1000).toFixed(2)}s)`,
        recommendation: 'Split code, lazy load components, and optimize bundle size',
      });
    }

    return suggestions;
  }

  /**
   * Optimize images for better performance
   */
  optimizeImages(): void {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      // Add loading="lazy" if not present
      if (!img.loading) {
        img.loading = 'lazy';
      }

      // Add decoding="async" for better performance
      if (!img.decoding) {
        img.decoding = 'async';
      }
    });
  }

  /**
   * Cached fetch — use this instead of window.cachedFetch.
   * Call via performanceService.cachedFetch(url, options).
   */
  private readonly _fetchCache = new Map<string, { data: unknown; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async cachedFetch(url: string, options?: RequestInit): Promise<Response> {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    const cached = this._fetchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < PerformanceOptimizationService.CACHE_DURATION) {
      this.metrics.cacheHits++;
      return Promise.resolve(cached.data as Response);
    }

    this.metrics.cacheMisses++;
    const response = await fetch(url, options);
    return response;
  }

  /**
   * Debounce function for optimizing frequent calls
   */
  debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for limiting call frequency
   */
  throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number,
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Cleanup observers and intervals
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    if (this.memoryIntervalId !== null) {
      clearInterval(this.memoryIntervalId);
      this.memoryIntervalId = null;
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const suggestions = this.analyzePerformance();

    const report = `
=== Vibe Tutor Performance Report ===

Metrics:
- Load Time: ${(metrics.loadTime / 1000).toFixed(2)}s
- Memory Usage: ${Math.round(metrics.memoryUsage)}MB
- Frame Rate: ${metrics.fps} FPS
- Network Requests: ${metrics.networkRequests}
- Cache Hit Rate: ${(metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 || 0}%

Optimization Suggestions:
${suggestions
  .map(
    (s) => `
[${s.severity.toUpperCase()}] ${s.type}
- ${s.description}
- Recommendation: ${s.recommendation}
`,
  )
  .join('\n')}

Generated: ${new Date().toISOString()}
    `;

    return report;
  }
}

// Export singleton instance
export const performanceService = new PerformanceOptimizationService();

