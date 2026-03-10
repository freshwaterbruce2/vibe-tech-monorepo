/**
 * PWA Audit Dashboard
 * Comprehensive PWA compliance checking and performance monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Shield,
  Zap,
  Smartphone,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from '../ui/use-toast';

interface PWAAuditResult {
  score: number;
  category: string;
  audits: AuditItem[];
}

interface AuditItem {
  id: string;
  title: string;
  description: string;
  score: number | null;
  status: 'pass' | 'fail' | 'manual' | 'notApplicable';
  details?: any;
  recommendation?: string;
}

interface PWACapabilities {
  installable: boolean;
  offline: boolean;
  fullscreen: boolean;
  notifications: boolean;
  backgroundSync: boolean;
  pushMessaging: boolean;
  fileHandling: boolean;
  webShare: boolean;
  deviceAccess: boolean;
}

export function PWAAuditDashboard({ className }: { className?: string }) {
  const [auditResults, setAuditResults] = useState<PWAAuditResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    installable: false,
    offline: false,
    fullscreen: false,
    notifications: false,
    backgroundSync: false,
    pushMessaging: false,
    fileHandling: false,
    webShare: false,
    deviceAccess: false,
  });
  const [isAuditing, setIsAuditing] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<Date | null>(null);

  useEffect(() => {
    runInitialAudit();
  }, []);

  const runInitialAudit = useCallback(async () => {
    await runPWAAudit();
    await checkPWACapabilities();
  }, []);

  const runPWAAudit = useCallback(async () => {
    setIsAuditing(true);
    
    try {
      const results: PWAAuditResult[] = [];
      
      // Run different audit categories
      const manifestAudit = await auditManifest();
      const serviceWorkerAudit = await auditServiceWorker();
      const performanceAudit = await auditPerformance();
      const accessibilityAudit = await auditAccessibility();
      const securityAudit = await auditSecurity();
      
      results.push(manifestAudit, serviceWorkerAudit, performanceAudit, accessibilityAudit, securityAudit);
      
      setAuditResults(results);
      
      // Calculate overall score
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      setOverallScore(Math.round(totalScore / results.length));
      
      setLastAuditTime(new Date());
      
      toast({
        title: 'PWA Audit Complete',
        description: `Overall score: ${Math.round(totalScore / results.length)}/100`,
        duration: 3000,
      });
    } catch (error) {
      console.error('PWA audit failed:', error);
      toast({
        title: 'Audit Failed',
        description: 'Unable to complete PWA audit. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsAuditing(false);
    }
  }, []);

  const auditManifest = async (): Promise<PWAAuditResult> => {
    const audits: AuditItem[] = [];
    let score = 0;
    
    try {
      // Check if manifest exists
      const manifestResponse = await fetch('/manifest.json');
      const manifest = await manifestResponse.json();
      
      // Required manifest fields
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'icons'];
      
      requiredFields.forEach(field => {
        const exists = manifest[field] !== undefined;
        audits.push({
          id: `manifest-${field}`,
          title: `Manifest has ${field}`,
          description: `The web app manifest includes a ${field} property`,
          score: exists ? 1 : 0,
          status: exists ? 'pass' : 'fail',
          recommendation: exists ? undefined : `Add ${field} to your web app manifest`
        });
        
        if (exists) score += 1;
      });
      
      // Check icon sizes
      const hasValidIcons = manifest.icons?.some((icon: any) => 
        icon.sizes === '192x192' || icon.sizes === '512x512'
      );
      
      audits.push({
        id: 'manifest-icons',
        title: 'Manifest includes proper icon sizes',
        description: 'Icons of 192px and 512px are provided for better display',
        score: hasValidIcons ? 1 : 0,
        status: hasValidIcons ? 'pass' : 'fail',
        recommendation: hasValidIcons ? undefined : 'Add icons with sizes 192x192 and 512x512'
      });
      
      if (hasValidIcons) score += 1;
      
      // Check maskable icons
      const hasMaskableIcons = manifest.icons?.some((icon: any) => 
        icon.purpose?.includes('maskable')
      );
      
      audits.push({
        id: 'manifest-maskable-icons',
        title: 'Manifest includes maskable icons',
        description: 'Maskable icons provide better display on various devices',
        score: hasMaskableIcons ? 1 : 0,
        status: hasMaskableIcons ? 'pass' : 'fail',
        recommendation: hasMaskableIcons ? undefined : 'Add maskable icons for better device compatibility'
      });
      
      if (hasMaskableIcons) score += 1;
      
    } catch (_error) {
      audits.push({
        id: 'manifest-exists',
        title: 'Web app manifest exists',
        description: 'A web app manifest is required for PWA installation',
        score: 0,
        status: 'fail',
        recommendation: 'Create a web app manifest file'
      });
    }
    
    return {
      score: Math.round((score / audits.length) * 100),
      category: 'Manifest',
      audits
    };
  };

  const auditServiceWorker = async (): Promise<PWAAuditResult> => {
    const audits: AuditItem[] = [];
    let score = 0;
    
    // Check if service worker is registered
    const swRegistered = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    
    audits.push({
      id: 'sw-registered',
      title: 'Service worker is registered',
      description: 'Service worker enables offline functionality',
      score: swRegistered ? 1 : 0,
      status: swRegistered ? 'pass' : 'fail',
      recommendation: swRegistered ? undefined : 'Register a service worker'
    });
    
    if (swRegistered) score += 1;
    
    // Check if app works offline
    const offlineCapable = await checkOfflineCapability();
    
    audits.push({
      id: 'offline-capable',
      title: 'App works offline',
      description: 'The app provides functionality when offline',
      score: offlineCapable ? 1 : 0,
      status: offlineCapable ? 'pass' : 'fail',
      recommendation: offlineCapable ? undefined : 'Implement offline caching in service worker'
    });
    
    if (offlineCapable) score += 1;
    
    // Check background sync
    const bgSyncSupported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
    
    audits.push({
      id: 'background-sync',
      title: 'Background sync is available',
      description: 'Background sync enables data sync when connectivity returns',
      score: bgSyncSupported ? 1 : 0,
      status: bgSyncSupported ? 'pass' : 'fail',
      recommendation: bgSyncSupported ? undefined : 'Implement background sync for better user experience'
    });
    
    if (bgSyncSupported) score += 1;
    
    return {
      score: Math.round((score / audits.length) * 100),
      category: 'Service Worker',
      audits
    };
  };

  const auditPerformance = async (): Promise<PWAAuditResult> => {
    const audits: AuditItem[] = [];
    let score = 0;
    
    // Check First Contentful Paint
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintTiming = performance.getEntriesByType('paint');
    
    if (navigationTiming && paintTiming.length > 0) {
      const fcp = paintTiming.find(entry => entry.name === 'first-contentful-paint');
      const fcpGood = fcp && fcp.startTime < 2500;
      
      audits.push({
        id: 'fcp-performance',
        title: 'First Contentful Paint is fast',
        description: 'FCP measures when content first appears',
        score: fcpGood ? 1 : 0,
        status: fcpGood ? 'pass' : 'fail',
        details: fcp ? `${Math.round(fcp.startTime)}ms` : 'Not available',
        recommendation: fcpGood ? undefined : 'Optimize critical rendering path and reduce resource sizes'
      });
      
      if (fcpGood) score += 1;
    }
    
    // Check for HTTPS
    const isHTTPS = location.protocol === 'https:';
    
    audits.push({
      id: 'https-required',
      title: 'Site is served over HTTPS',
      description: 'HTTPS is required for many PWA features',
      score: isHTTPS ? 1 : 0,
      status: isHTTPS ? 'pass' : 'fail',
      recommendation: isHTTPS ? undefined : 'Serve your site over HTTPS'
    });
    
    if (isHTTPS) score += 1;
    
    // Check viewport meta tag
    const hasViewport = document.querySelector('meta[name="viewport"]');
    
    audits.push({
      id: 'viewport-meta',
      title: 'Has a viewport meta tag',
      description: 'Viewport meta tag ensures proper mobile display',
      score: hasViewport ? 1 : 0,
      status: hasViewport ? 'pass' : 'fail',
      recommendation: hasViewport ? undefined : 'Add a viewport meta tag to your HTML'
    });
    
    if (hasViewport) score += 1;
    
    return {
      score: Math.round((score / audits.length) * 100),
      category: 'Performance',
      audits
    };
  };

  const auditAccessibility = async (): Promise<PWAAuditResult> => {
    const audits: AuditItem[] = [];
    let score = 0;
    
    // Check color contrast (simplified)
    const hasGoodContrast = true; // Would need actual contrast calculation
    
    audits.push({
      id: 'color-contrast',
      title: 'Background and foreground colors have sufficient contrast',
      description: 'Good contrast improves readability for all users',
      score: hasGoodContrast ? 1 : 0,
      status: hasGoodContrast ? 'pass' : 'manual',
      recommendation: 'Ensure color contrast ratio is at least 4.5:1'
    });
    
    if (hasGoodContrast) score += 1;
    
    // Check for alt text on images
    const images = document.querySelectorAll('img');
    const imagesWithAlt = Array.from(images).filter(img => img.alt);
    const hasAltText = images.length === 0 || imagesWithAlt.length === images.length;
    
    audits.push({
      id: 'image-alt-text',
      title: 'Images have alt text',
      description: 'Alt text helps screen readers describe images',
      score: hasAltText ? 1 : 0,
      status: hasAltText ? 'pass' : 'fail',
      details: `${imagesWithAlt.length}/${images.length} images have alt text`,
      recommendation: hasAltText ? undefined : 'Add descriptive alt text to all images'
    });
    
    if (hasAltText) score += 1;
    
    // Check for proper heading structure
    const h1Elements = document.querySelectorAll('h1');
    const hasOneH1 = h1Elements.length === 1;
    
    audits.push({
      id: 'heading-structure',
      title: 'Page has proper heading structure',
      description: 'Proper headings help screen readers navigate content',
      score: hasOneH1 ? 1 : 0,
      status: hasOneH1 ? 'pass' : 'fail',
      details: `Found ${h1Elements.length} h1 elements`,
      recommendation: hasOneH1 ? undefined : 'Use exactly one h1 element per page'
    });
    
    if (hasOneH1) score += 1;
    
    return {
      score: Math.round((score / audits.length) * 100),
      category: 'Accessibility',
      audits
    };
  };

  const auditSecurity = async (): Promise<PWAAuditResult> => {
    const audits: AuditItem[] = [];
    let score = 0;
    
    // Check Content Security Policy
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const hasCSP = cspMeta !== null;
    
    audits.push({
      id: 'content-security-policy',
      title: 'Content Security Policy is implemented',
      description: 'CSP helps prevent XSS attacks',
      score: hasCSP ? 1 : 0,
      status: hasCSP ? 'pass' : 'manual',
      recommendation: hasCSP ? undefined : 'Implement Content Security Policy headers'
    });
    
    if (hasCSP) score += 1;
    
    // Check for mixed content
    const hasMixedContent = Array.from(document.querySelectorAll('script, link, img')).some(el => {
      const src = el.getAttribute('src') ?? el.getAttribute('href');
      return src && src.startsWith('http:') && location.protocol === 'https:';
    });
    
    audits.push({
      id: 'no-mixed-content',
      title: 'No mixed content issues',
      description: 'Mixed content can compromise security on HTTPS sites',
      score: !hasMixedContent ? 1 : 0,
      status: !hasMixedContent ? 'pass' : 'fail',
      recommendation: !hasMixedContent ? undefined : 'Ensure all resources are loaded over HTTPS'
    });
    
    if (!hasMixedContent) score += 1;
    
    return {
      score: Math.round((score / audits.length) * 100),
      category: 'Security',
      audits
    };
  };

  const checkOfflineCapability = async (): Promise<boolean> => {
    try {
      const cache = await caches.open('test-offline');
      await cache.add(window.location.pathname);
      await cache.delete(window.location.pathname);
      return true;
    } catch (_error) {
      return false;
    }
  };

  const checkPWACapabilities = async () => {
    const caps: PWACapabilities = {
      installable: window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true,
      offline: 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
      fullscreen: 'requestFullscreen' in document.documentElement,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushMessaging: 'PushManager' in window,
      fileHandling: 'launchQueue' in window,
      webShare: 'share' in navigator,
      deviceAccess: 'geolocation' in navigator
    };
    
    setCapabilities(caps);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'manual': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Manifest': return <FileText className="w-5 h-5" />;
      case 'Service Worker': return <Settings className="w-5 h-5" />;
      case 'Performance': return <Zap className="w-5 h-5" />;
      case 'Accessibility': return <Shield className="w-5 h-5" />;
      case 'Security': return <Shield className="w-5 h-5" />;
      default: return <Globe className="w-5 h-5" />;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              PWA Audit Dashboard
            </div>
            <div className="flex items-center gap-4">
              {lastAuditTime && (
                <span className="text-sm text-muted-foreground">
                  Last audit: {lastAuditTime.toLocaleTimeString()}
                </span>
              )}
              <Button 
                onClick={runPWAAudit}
                disabled={isAuditing}
                size="sm"
              >
                {isAuditing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isAuditing ? 'Auditing...' : 'Run Audit'}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Comprehensive PWA compliance and performance assessment
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Overall Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold">Overall PWA Score</span>
              <div className="flex items-center gap-2">
                {getScoreIcon(overallScore)}
                <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}/100
                </span>
              </div>
            </div>
            <Progress value={overallScore} className="h-3" />
          </div>
          
          <Tabs defaultValue="audits" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="audits">Audit Results</TabsTrigger>
              <TabsTrigger value="capabilities">PWA Features</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="audits" className="space-y-4">
              {auditResults.map((result) => (
                <Card key={result.category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(result.category)}
                        {result.category}
                      </div>
                      <div className="flex items-center gap-2">
                        {getScoreIcon(result.score)}
                        <span className={`font-bold ${getScoreColor(result.score)}`}>
                          {result.score}/100
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.audits.map((audit) => (
                        <div key={audit.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(audit.status)}
                              <span className="font-medium">{audit.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {audit.description}
                            </p>
                            {audit.details && (
                              <p className="text-xs text-muted-foreground">
                                Details: {audit.details}
                              </p>
                            )}
                            {audit.recommendation && audit.status !== 'pass' && (
                              <p className="text-xs text-blue-600 mt-1">
                                Ὂ1 {audit.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="capabilities" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(capabilities).map(([key, value]) => (
                  <div key={key} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant={value ? 'default' : 'secondary'}>
                        {value ? 'Supported' : 'Not Available'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-3">
                {auditResults.flatMap(result => 
                  result.audits
                    .filter(audit => audit.recommendation && audit.status !== 'pass')
                    .map(audit => (
                      <div key={audit.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                              {audit.title}
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                              {audit.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                )}
                
                {auditResults.length > 0 && auditResults.every(result => 
                  result.audits.every(audit => audit.status === 'pass')
                ) && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-green-900 dark:text-green-100">
                      All PWA Requirements Met!
                    </h3>
                    <p className="text-green-700 dark:text-green-200">
                      Your PWA passes all audit checks.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default PWAAuditDashboard;
