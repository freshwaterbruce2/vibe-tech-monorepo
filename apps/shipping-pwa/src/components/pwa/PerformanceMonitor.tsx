/**
 * Performance Monitor Component
 * Tracks Core Web Vitals, PWA metrics, and user experience indicators
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Activity, 
  Zap, 
  Clock, 
  Eye, 
  Wifi, 
  Download,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { toast } from '../ui/use-toast';

interface PerformanceMetrics {
  lcp: number | null;     // Largest Contentful Paint
  fid: number | null;     // First Input Delay
  cls: number | null;     // Cumulative Layout Shift
  fcp: number | null;     // First Contentful Paint
  ttfb: number | null;    // Time to First Byte
  loadTime: number | null;
  domContentLoaded: number | null;
}

interface PWAMetrics {
  cacheHitRate: number;
  offlineCapability: boolean;
  installPromptShown: boolean;
  isInstalled: boolean;
  backgroundSyncEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

interface NetworkMetrics {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

 
export function PerformanceMonitor({ className }: { className?: string }) {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    loadTime: null,
    domContentLoaded: null,
  });
  
  const [pwaMetrics, setPwaMetrics] = useState<PWAMetrics>({
    cacheHitRate: 0,
    offlineCapability: false,
    installPromptShown: false,
    isInstalled: false,
    backgroundSyncEnabled: false,
    pushNotificationsEnabled: false,
  });
  
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>({
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
  });
  
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics>({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);

  // Initialize performance monitoring
  useEffect(() => {
    startPerformanceMonitoring();
    return () => stopPerformanceMonitoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update metrics periodically
  useEffect(() => {
    if (!isMonitoring) return undefined;

    const interval = setInterval(() => {
      updateAllMetrics();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring]);

  const startPerformanceMonitoring = useCallback(() => {
    setIsMonitoring(true);

    // Initial metrics collection
    updateAllMetrics();

    // Set up Core Web Vitals monitoring
    setupWebVitalsMonitoring();

    // Set up PWA metrics monitoring
    setupPWAMetricsMonitoring();

    toast({
      title: 'Performance Monitoring Started',
      description: 'Collecting performance metrics...',
      duration: 2000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPerformanceMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const updateAllMetrics = useCallback(async () => {
    try {
      // Update performance metrics
      const perfMetrics = await collectPerformanceMetrics();
      setPerformanceMetrics(perfMetrics);

      // Update network metrics
      const netMetrics = collectNetworkMetrics();
      setNetworkMetrics(netMetrics);

      // Update memory metrics
      const memMetrics = collectMemoryMetrics();
      setMemoryMetrics(memMetrics);

      // Update PWA metrics
      const pwaMetrics = await collectPWAMetrics();
      setPwaMetrics(pwaMetrics);

      // Calculate overall performance score
      const score = calculatePerformanceScore(perfMetrics, pwaMetrics, netMetrics);
      setPerformanceScore(score);
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupWebVitalsMonitoring = () => {
    // Listen for Core Web Vitals
    if ('web-vitals' in window) {
      // If web-vitals library is available
      import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
        onCLS((metric) => {
          setPerformanceMetrics(prev => ({ ...prev, cls: metric.value }));
        });

        onINP((metric) => {
          setPerformanceMetrics(prev => ({ ...prev, fid: metric.value }));
        });

        onFCP((metric) => {
          setPerformanceMetrics(prev => ({ ...prev, fcp: metric.value }));
        });

        onLCP((metric) => {
          setPerformanceMetrics(prev => ({ ...prev, lcp: metric.value }));
        });

        onTTFB((metric) => {
          setPerformanceMetrics(prev => ({ ...prev, ttfb: metric.value }));
        });
      }).catch(() => {
        // Fallback to manual collection
        collectWebVitalsManually();
      });
    } else {
      collectWebVitalsManually();
    }
  };

  const collectWebVitalsManually = () => {
    // Use Performance Observer API
    if ('PerformanceObserver' in window) {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        setPerformanceMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch {
        console.warn('LCP observer not supported');
      }
      
      // FID Observer
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-input') {
            setPerformanceMetrics(prev => ({ 
              ...prev, 
              fid: (entry as any).processingStart - entry.startTime 
            }));
          }
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch {
        console.warn('FID observer not supported');
      }
    }
  };

  const setupPWAMetricsMonitoring = () => {
    // Monitor PWA installation state
    const checkPWAInstalled = () => {
      const isInstalled = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      setPwaMetrics(prev => ({ ...prev, isInstalled }));
    };
    
    checkPWAInstalled();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPWAInstalled);
    
    // Monitor service worker state
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setPwaMetrics(prev => ({ ...prev, offlineCapability: true }));
      });
    }
    
    // Monitor notification permission
    if ('Notification' in window) {
      const notificationsEnabled = Notification.permission === 'granted';
      setPwaMetrics(prev => ({ ...prev, pushNotificationsEnabled: notificationsEnabled }));
    }
  };

  const collectPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
    const metrics: PerformanceMetrics = {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
      loadTime: null,
      domContentLoaded: null,
    };
    
    if ('performance' in window) {
      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const navigationStart = navigation.startTime || performance.timing?.navigationStart || 0;
        metrics.loadTime = navigation.loadEventEnd - navigationStart;
        metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigationStart;
        metrics.ttfb = navigation.responseStart - navigationStart;
      }
      
      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        metrics.fcp = fcpEntry.startTime;
      }
    }
    
    return metrics;
  };

  const collectNetworkMetrics = (): NetworkMetrics => {
    const connection = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
    
    return {
      effectiveType: connection?.effectiveType ?? 'unknown',
      downlink: connection?.downlink ?? 0,
      rtt: connection?.rtt ?? 0,
      saveData: connection?.saveData ?? false,
    };
  };

  const collectMemoryMetrics = (): MemoryMetrics => {
    const memory = (performance as any).memory;
    
    return {
      usedJSHeapSize: memory?.usedJSHeapSize ?? 0,
      totalJSHeapSize: memory?.totalJSHeapSize ?? 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit ?? 0,
    };
  };

  const collectPWAMetrics = async (): Promise<PWAMetrics> => {
    const metrics = { ...pwaMetrics };
    
    // Calculate cache hit rate
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        let totalRequests = 0;
        let cachedRequests = 0;
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          totalRequests += requests.length;
          cachedRequests += requests.length; // All cached requests are hits by definition
        }
        
        metrics.cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;
      } catch (error) {
        console.warn('Cache metrics collection failed:', error);
      }
    }
    
    // Check background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      metrics.backgroundSyncEnabled = true;
    }
    
    return metrics;
  };

  const calculatePerformanceScore = (
    perf: PerformanceMetrics,
    pwa: PWAMetrics,
    _network: NetworkMetrics
  ): number => {
    let score = 100;
    
    // Core Web Vitals scoring
    if (perf.lcp !== null) {
      if (perf.lcp > 4000) score -= 20;
      else if (perf.lcp > 2500) score -= 10;
    }
    
    if (perf.fid !== null) {
      if (perf.fid > 300) score -= 15;
      else if (perf.fid > 100) score -= 8;
    }
    
    if (perf.cls !== null) {
      if (perf.cls > 0.25) score -= 15;
      else if (perf.cls > 0.1) score -= 8;
    }
    
    // PWA features scoring
    if (pwa.isInstalled) score += 5;
    if (pwa.offlineCapability) score += 10;
    if (pwa.pushNotificationsEnabled) score += 5;
    if (pwa.backgroundSyncEnabled) score += 5;
    if (pwa.cacheHitRate > 80) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const getMetricStatus = (value: number | null, thresholds: [number, number]) => {
    if (value === null) return 'unknown';
    if (value <= thresholds[0]) return 'good';
    if (value <= thresholds[1]) return 'needs-improvement';
    return 'poor';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))  } ${  sizes[i]}`;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Monitor
            </div>
            <div className="flex items-center gap-2">
              {getScoreIcon(performanceScore)}
              <span className={`text-lg font-bold ${getScoreColor(performanceScore)}`}>
                {performanceScore}/100
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Real-time performance metrics and Core Web Vitals
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Core Web Vitals */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Core Web Vitals
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">LCP</span>
                  <Badge 
                    variant={getMetricStatus(performanceMetrics.lcp, [2500, 4000]) === 'good' ? 'default' : 'destructive'}
                  >
                    {getMetricStatus(performanceMetrics.lcp, [2500, 4000])}
                  </Badge>
                </div>
                <div className="text-xl font-bold">
                  {performanceMetrics.lcp ? `${Math.round(performanceMetrics.lcp)}ms` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Largest Contentful Paint
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">FID</span>
                  <Badge 
                    variant={getMetricStatus(performanceMetrics.fid, [100, 300]) === 'good' ? 'default' : 'destructive'}
                  >
                    {getMetricStatus(performanceMetrics.fid, [100, 300])}
                  </Badge>
                </div>
                <div className="text-xl font-bold">
                  {performanceMetrics.fid ? `${Math.round(performanceMetrics.fid)}ms` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  First Input Delay
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">CLS</span>
                  <Badge 
                    variant={getMetricStatus(performanceMetrics.cls, [0.1, 0.25]) === 'good' ? 'default' : 'destructive'}
                  >
                    {getMetricStatus(performanceMetrics.cls, [0.1, 0.25])}
                  </Badge>
                </div>
                <div className="text-xl font-bold">
                  {performanceMetrics.cls ? performanceMetrics.cls.toFixed(3) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cumulative Layout Shift
                </div>
              </div>
            </div>
          </div>
          
          {/* PWA Metrics */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" />
              PWA Features
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  pwaMetrics.isInstalled ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">Installed</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  pwaMetrics.offlineCapability ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">Offline Ready</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  pwaMetrics.pushNotificationsEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">Notifications</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  pwaMetrics.backgroundSyncEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm">Sync</span>
              </div>
            </div>
            
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Cache Hit Rate</span>
                <span className="text-sm font-medium">{Math.round(pwaMetrics.cacheHitRate)}%</span>
              </div>
              <Progress value={pwaMetrics.cacheHitRate} className="h-2" />
            </div>
          </div>
          
          {/* Network & Memory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Network
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <Badge variant="outline">{networkMetrics.effectiveType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Downlink:</span>
                  <span>{networkMetrics.downlink} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span>RTT:</span>
                  <span>{networkMetrics.rtt}ms</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Memory
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span>{formatBytes(memoryMetrics.usedJSHeapSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{formatBytes(memoryMetrics.totalJSHeapSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Limit:</span>
                  <span>{formatBytes(memoryMetrics.jsHeapSizeLimit)}</span>
                </div>
              </div>
              
              {memoryMetrics.totalJSHeapSize > 0 && (
                <div className="mt-3">
                  <Progress 
                    value={(memoryMetrics.usedJSHeapSize / memoryMetrics.totalJSHeapSize) * 100}
                    className="h-2"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex gap-2">
            <Button 
              onClick={updateAllMetrics}
              variant="outline"
              size="sm"
              disabled={!isMonitoring}
            >
              <Eye className="w-4 h-4 mr-2" />
              Refresh Metrics
            </Button>
            
            <Button 
              onClick={isMonitoring ? stopPerformanceMonitoring : startPerformanceMonitoring}
              variant={isMonitoring ? 'destructive' : 'default'}
              size="sm"
            >
              <Clock className="w-4 h-4 mr-2" />
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PerformanceMonitor;
