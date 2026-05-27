#!/usr/bin/env node

/**
 * Advanced PWA Build Optimizer
 * Optimizes build output for performance, caching, and offline functionality
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sharp = null;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch (_error) {
  // Sharp is optional
}

class PWABuildOptimizer {
  constructor(options = {}) {
    this.options = {
      buildDir: 'dist',
      publicDir: 'public',
      generateWebP: true,
      generateAVIF: true,
      optimizeImages: true,
      generateCriticalCSS: true,
      createOfflinePages: true,
      updateManifest: true,
      generateSitemap: true,
      ...options
    };

    this.stats = {
      originalSize: 0,
      optimizedSize: 0,
      imagesOptimized: 0,
      filesProcessed: 0
    };
  }

  async optimize() {
    console.log('🚀 Starting PWA Build Optimization...');

    try {
      await this.analyzeBundle();

      if (this.options.optimizeImages) {
        await this.optimizeImages();
      }

      if (this.options.generateCriticalCSS) {
        await this.generateCriticalCSS();
      }

      if (this.options.createOfflinePages) {
        await this.createOfflinePages();
      }

      if (this.options.updateManifest) {
        await this.updateManifest();
      }

      if (this.options.generateSitemap) {
        await this.generateSitemap();
      }

      await this.generateServiceWorkerConfig();
      await this.optimizeAssetCaching();
      await this.generatePerformanceReport();

      this.printStats();

      console.log('✅ PWA optimization completed successfully!');
    } catch (error) {
      console.error('❌ PWA optimization failed:', error);
      process.exit(1);
    }
  }

  async analyzeBundle() {
    console.log('📊 Analyzing bundle...');

    const buildPath = path.resolve(this.options.buildDir);
    const files = await this.getAllFiles(buildPath);

    for (const file of files) {
      const stats = await fs.stat(file);
      this.stats.originalSize += stats.size;
      this.stats.filesProcessed++;
    }

    console.log(`   Found ${this.stats.filesProcessed} files (${this.formatBytes(this.stats.originalSize)})`);
  }

  async optimizeImages() {
    console.log('🖼️  Optimizing images...');

    if (!sharp) {
      console.warn('   Sharp not available, skipping image optimization');
      return;
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const buildPath = path.resolve(this.options.buildDir);
    const imageFiles = await this.getFilesByExtensions(buildPath, imageExtensions);

    for (const imagePath of imageFiles) {
      try {
        await this.optimizeImage(imagePath);
        this.stats.imagesOptimized++;
      } catch (error) {
        console.warn(`   Failed to optimize ${imagePath}:`, error.message);
      }
    }

    console.log(`   Optimized ${this.stats.imagesOptimized} images`);
  }

  async optimizeImage(imagePath) {
    const ext = path.extname(imagePath).toLowerCase();
    const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));

    const sharpInstance = sharp(imagePath);
    const metadata = await sharpInstance.metadata();

    // Skip if image is too small
    if (metadata.width < 100 || metadata.height < 100) {
      return;
    }

    const optimizationTasks = [];

    // Generate WebP version
    if (this.options.generateWebP && ext !== '.webp') {
      optimizationTasks.push(
        sharpInstance
          .webp({ quality: 80, effort: 6 })
          .toFile(`${basePath}.webp`)
      );
    }

    // Generate AVIF version
    if (this.options.generateAVIF && ext !== '.avif') {
      optimizationTasks.push(
        sharpInstance
          .avif({ quality: 70, effort: 9 })
          .toFile(`${basePath}.avif`)
      );
    }

    // Optimize original format
    if (ext === '.jpg' || ext === '.jpeg') {
      optimizationTasks.push(
        sharpInstance
          .jpeg({ quality: 85, progressive: true, mozjpeg: true })
          .toFile(imagePath.replace(ext, `_optimized${  ext}`))
      );
    } else if (ext === '.png') {
      optimizationTasks.push(
        sharpInstance
          .png({ quality: 90, compressionLevel: 9, adaptiveFiltering: true })
          .toFile(imagePath.replace(ext, `_optimized${  ext}`))
      );
    }

    // Generate responsive variants
    const responsiveSizes = [320, 640, 768, 1024, 1280, 1920];
    for (const size of responsiveSizes) {
      if (metadata.width > size) {
        optimizationTasks.push(
          sharpInstance
            .resize(size, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(`${basePath}_${size}w.webp`)
        );
      }
    }

    await Promise.all(optimizationTasks);

    // Replace original with optimized version if it exists
    const optimizedPath = imagePath.replace(ext, `_optimized${  ext}`);
    try {
      await fs.access(optimizedPath);
      await fs.rename(optimizedPath, imagePath);
    } catch (_error) {
      // Optimized version doesn't exist, keep original
    }
  }

  async generateCriticalCSS() {
    console.log('🎨 Generating critical CSS...');

    try {
      const { default: critical } = await import('critical');
      const buildPath = path.resolve(this.options.buildDir);
      const htmlFiles = await this.getFilesByExtensions(buildPath, ['.html']);

      for (const htmlFile of htmlFiles) {
        const relativePath = path.relative(buildPath, htmlFile);
        const outputPath = path.join(buildPath, 'critical', relativePath.replace('.html', '.css'));

        await critical.generate({
          inline: true,
          base: buildPath,
          src: relativePath,
          target: {
            css: outputPath,
            html: htmlFile
          },
          width: 1300,
          height: 900,
          minify: true,
          extract: true,
          ignore: {
            atrule: ['@font-face'],
            rule: [/\.sr-only/]
          }
        });
      }

      console.log(`   Generated critical CSS for ${htmlFiles.length} pages`);
    } catch (error) {
      console.warn('   Critical CSS generation failed:', error.message);
    }
  }

  async createOfflinePages() {
    console.log('📱 Creating offline pages...');

    const buildPath = path.resolve(this.options.buildDir);

    // Enhanced offline page
    const offlineHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - DC8980 Shipping</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #0071CE, #004c8c); color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { text-align: center; max-width: 600px; }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; line-height: 1.6; margin-bottom: 2rem; opacity: 0.9; }
        .features { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 2rem; backdrop-filter: blur(10px); }
        .btn { background: white; color: #0071CE; padding: 12px 24px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📦</div>
        <h1>Working Offline</h1>
        <p>Continue managing doors and tracking pallets. Changes will sync when connected.</p>
        <div class="features">
            <h2>Available Offline:</h2>
            <p>✅ Door Scheduling<br>✅ Pallet Counting<br>✅ Voice Commands<br>✅ Data Export</p>
        </div>
        <a href="/" class="btn">Return to App</a>
    </div>
    <script>
        if (navigator.onLine) { setTimeout(() => location.href = '/', 1000); }
        window.addEventListener('online', () => location.href = '/');
    </script>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'offline.html'), offlineHTML);

    // Generate app shell for instant loading
    const appShellHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading - DC8980 Shipping</title>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .loading { display: flex; align-items: center; justify-content: center; min-height: 100vh; flex-direction: column; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0071CE; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>Loading DC8980 Shipping...</p>
    </div>
</body>
</html>`;

    await fs.writeFile(path.join(buildPath, 'app-shell.html'), appShellHTML);

    console.log('   Created offline.html and app-shell.html');
  }

  async updateManifest() {
    console.log('📋 Updating PWA manifest...');

    const buildPath = path.resolve(this.options.buildDir);
    const manifestPath = path.join(buildPath, 'manifest.json');

    let manifest = {};
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(manifestContent);
    } catch (_error) {
      console.warn('   No existing manifest found, creating new one');
    }

    // Enhanced manifest with advanced PWA features
    const enhancedManifest = {
      name: 'Walmart DC 8980 Shipping Department',
      short_name: 'DC8980 Shipping',
      description: 'Advanced PWA for door scheduling and pallet tracking with offline capabilities',
      start_url: '/',
      display: 'standalone',
      theme_color: '#0071CE',
      background_color: '#ffffff',
      orientation: 'portrait-primary',
      scope: '/',
      categories: ['productivity', 'business'],
      lang: 'en-US',
      dir: 'ltr',
      display_override: ['window-controls-overlay', 'standalone'],
      prefer_related_applications: false,

      // Enhanced features
      launch_handler: {
        client_mode: 'navigate-existing'
      },

      edge_side_panel: {
        preferred_width: 400
      },

      // File handling
      file_handlers: [
        {
          action: '/handle-csv',
          accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls', '.xlsx']
          }
        }
      ],

      // Protocol handlers
      protocol_handlers: [
        {
          protocol: 'web+shipping',
          url: '/handle-protocol?type=%s'
        }
      ],

      // Share target
      share_target: {
        action: '/share-target/',
        method: 'POST',
        enctype: 'multipart/form-data',
        params: {
          title: 'title',
          text: 'text',
          url: 'url'
        }
      },

      // Shortcuts
      shortcuts: [
        {
          name: 'Add Door Entry',
          short_name: 'Add Door',
          description: 'Quickly add a new door entry',
          url: '/?action=add-door',
          icons: [{ src: '/icons/shortcut-add.png', sizes: '96x96' }]
        },
        {
          name: 'Pallet Counter',
          short_name: 'Pallets',
          description: 'Track pallet counts',
          url: '/pallets',
          icons: [{ src: '/icons/shortcut-pallets.png', sizes: '96x96' }]
        }
      ],

      // Enhanced icon set with maskable support
      icons: [
        {
          src: 'icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icons/icon-180x180.png',
          sizes: '180x180',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: 'icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ],

      ...manifest
    };

    await fs.writeFile(manifestPath, JSON.stringify(enhancedManifest, null, 2));
    console.log('   Updated manifest.json with enhanced PWA features');
  }

  async generateSitemap() {
    console.log('🗺️  Generating sitemap...');

    const buildPath = path.resolve(this.options.buildDir);
    const baseUrl = 'https://dc8980-shipping.app'; // Update with actual domain

    const pages = [
      { url: '/', changefreq: 'daily', priority: '1.0' },
      { url: '/pallets', changefreq: 'daily', priority: '0.8' },
      { url: '/notes', changefreq: 'weekly', priority: '0.6' },
      { url: '/settings', changefreq: 'monthly', priority: '0.5' },
      { url: '/offline', changefreq: 'monthly', priority: '0.3' }
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    await fs.writeFile(path.join(buildPath, 'sitemap.xml'), sitemap);

    // Generate robots.txt
    const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;
    await fs.writeFile(path.join(buildPath, 'robots.txt'), robots);

    console.log('   Generated sitemap.xml and robots.txt');
  }

  async generateServiceWorkerConfig() {
    console.log('⚙️  Generating service worker configuration...');

    const buildPath = path.resolve(this.options.buildDir);
    const swConfigPath = path.join(buildPath, 'sw-config.js');

    const config = {
      cacheStrategies: {
        images: {
          strategy: 'CacheFirst',
          cacheName: 'images',
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        },
        api: {
          strategy: 'NetworkFirst',
          cacheName: 'api-cache',
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          networkTimeoutSeconds: 10
        },
        static: {
          strategy: 'StaleWhileRevalidate',
          cacheName: 'static-assets',
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        },
        fonts: {
          strategy: 'CacheFirst',
          cacheName: 'google-fonts',
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      },

      offlineStrategy: {
        navigateFallback: '/offline.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        navigateFallbackDenylist: [/^\/api\//]
      },

      backgroundSync: {
        name: 'offline-actions',
        maxRetentionTime: 24 * 60 // 24 hours
      },

      pushNotifications: {
        vapidPublicKey: process.env.VITE_VAPID_PUBLIC_KEY || '',
        notificationOptions: {
          badge: '/icons/badge-72x72.png',
          icon: '/icons/icon-192x192.png',
          requireInteraction: true,
          renotify: true,
          vibrate: [200, 100, 200]
        }
      }
    };

    const configJs = `// Service Worker Configuration
// Auto-generated by PWA Build Optimizer

self.SW_CONFIG = ${JSON.stringify(config, null, 2)};`;

    await fs.writeFile(swConfigPath, configJs);
    console.log('   Generated service worker configuration');
  }

  async optimizeAssetCaching() {
    console.log('💾 Optimizing asset caching...');

    const buildPath = path.resolve(this.options.buildDir);

    // Generate cache manifest for critical assets
    const criticalAssets = [
      '/offline.html',
      '/app-shell.html',
      '/manifest.json'
    ];

    // Add all CSS and JS files to critical assets
    const cssFiles = await this.getFilesByExtensions(buildPath, ['.css']);
    const jsFiles = await this.getFilesByExtensions(buildPath, ['.js']);

    cssFiles.concat(jsFiles).forEach(file => {
      const relativePath = `/${  path.relative(buildPath, file).replace(/\\/g, '/')}`;
      criticalAssets.push(relativePath);
    });

    const cacheManifest = {
      version: Date.now().toString(),
      critical: criticalAssets,
      optional: [],
      fallbacks: {
        '/': '/offline.html'
      }
    };

    await fs.writeFile(
      path.join(buildPath, 'cache-manifest.json'),
      JSON.stringify(cacheManifest, null, 2)
    );

    console.log('   Generated cache manifest');
  }

  async generatePerformanceReport() {
    console.log('📊 Generating performance report...');

    const buildPath = path.resolve(this.options.buildDir);
    const report = {
      timestamp: new Date().toISOString(),
      buildStats: this.stats,
      recommendations: [],
      files: {}
    };

    // Analyze files for performance recommendations
    const jsFiles = await this.getFilesByExtensions(buildPath, ['.js']);
    const cssFiles = await this.getFilesByExtensions(buildPath, ['.css']);

    for (const file of jsFiles.concat(cssFiles)) {
      const stats = await fs.stat(file);
      const fileName = path.relative(buildPath, file);

      report.files[fileName] = {
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size)
      };

      // Add recommendations for large files
      if (stats.size > 500000) { // 500KB
        report.recommendations.push({
          type: 'large-file',
          file: fileName,
          message: `File is ${this.formatBytes(stats.size)}. Consider code splitting or lazy loading.`
        });
      }
    }

    // Check for missing optimizations
    if (this.stats.imagesOptimized === 0) {
      report.recommendations.push({
        type: 'image-optimization',
        message: 'No images were optimized. Consider enabling image optimization.'
      });
    }

    await fs.writeFile(
      path.join(buildPath, 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('   Generated performance report');
  }

  async getAllFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  async getFilesByExtensions(dir, extensions) {
    const allFiles = await this.getAllFiles(dir);
    return allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return extensions.includes(ext);
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))  } ${  sizes[i]}`;
  }

  printStats() {
    console.log('\n📈 Optimization Results:');
    console.log(`   Files processed: ${this.stats.filesProcessed}`);
    console.log(`   Images optimized: ${this.stats.imagesOptimized}`);
    console.log(`   Original size: ${this.formatBytes(this.stats.originalSize)}`);

    const sizeDiff = this.stats.originalSize - this.stats.optimizedSize;
    const percentSaved = ((sizeDiff / this.stats.originalSize) * 100).toFixed(1);

    if (sizeDiff > 0) {
      console.log(`   Size saved: ${this.formatBytes(sizeDiff)} (${percentSaved}%)`);
    }
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];

    if (value === 'true' || value === 'false') {
      options[key] = value === 'true';
    } else {
      options[key] = value;
    }
  }

  const optimizer = new PWABuildOptimizer(options);
  optimizer.optimize();
}

export default PWABuildOptimizer;
