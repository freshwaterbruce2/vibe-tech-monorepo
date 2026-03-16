/**
 * Progressive Image Loading Utility
 * Advanced image optimization with WebP conversion, lazy loading, and progressive enhancement
 */

import { analytics } from './analytics';
import { logger } from './logger';

export interface ImageLoadOptions {
	quality?: number;
	format?: 'webp' | 'jpeg' | 'png' | 'auto';
	sizes?: string;
	loading?: 'lazy' | 'eager';
	placeholder?: 'blur' | 'color' | 'skeleton';
	placeholderColor?: string;
	fade?: boolean;
	retries?: number;
	timeout?: number;
}

export interface ImageMetrics {
	loadTime: number;
	fileSize: number;
	format: string;
	dimensions: { width: number; height: number };
	fromCache: boolean;
}

export interface ProgressiveImageData {
	src: string;
	srcSet?: string;
	placeholder?: string;
	loaded: boolean;
	loading: boolean;
	error: boolean;
	metrics?: ImageMetrics;
}

class ProgressiveImageLoader {
	private static instance: ProgressiveImageLoader;
	private imageCache = new Map<string, ProgressiveImageData>();
	private loadingQueue = new Map<string, Promise<ProgressiveImageData>>();
	private webpSupported?: boolean;
	private avifSupported?: boolean;

	constructor() {
		this.checkFormatSupport();
		this.initializeIntersectionObserver();
	}

	static getInstance(): ProgressiveImageLoader {
		if (!ProgressiveImageLoader.instance) {
			ProgressiveImageLoader.instance = new ProgressiveImageLoader();
		}
		return ProgressiveImageLoader.instance;
	}

	/**
	 * Load image with progressive enhancement
	 */
	async loadImage(
		src: string,
		options: ImageLoadOptions = {},
	): Promise<ProgressiveImageData> {
		const cacheKey = this.getCacheKey(src, options);

		// Return cached data if available
		if (this.imageCache.has(cacheKey)) {
			const cached = this.imageCache.get(cacheKey);
			if (cached && (cached.loaded || cached.error)) {
				return cached;
			}
		}

		// Return existing promise if already loading
		if (this.loadingQueue.has(cacheKey)) {
			return this.loadingQueue.get(cacheKey) as Promise<ProgressiveImageData>;
		}

		// Start loading
		const loadPromise = this.performImageLoad(src, options);
		this.loadingQueue.set(cacheKey, loadPromise);

		try {
			const result = await loadPromise;
			this.imageCache.set(cacheKey, result);
			return result;
		} finally {
			this.loadingQueue.delete(cacheKey);
		}
	}

	/**
	 * Preload critical images
	 */
	async preloadImages(
		urls: string[],
		options: ImageLoadOptions = {},
	): Promise<void> {
		logger.info('Preloading critical images', {
			component: 'ProgressiveImageLoader',
			count: urls.length,
		});

		const preloadPromises = urls.map(async (url, index) => {
			// Stagger preloading to avoid overwhelming the browser
			await this.delay(index * 50);
			return this.loadImage(url, { ...options, loading: 'eager' });
		});

		try {
			await Promise.allSettled(preloadPromises);

			analytics.performance({
				name: 'image_preload_completed',
				value: urls.length,
				unit: 'count',
				metadata: { urls: urls.slice(0, 3) }, // Log first 3 URLs
			});
		} catch (error) {
			logger.warn('Image preloading failed', {
				component: 'ProgressiveImageLoader',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Generate optimized image URL with format conversion
	 */
	getOptimizedUrl(src: string, options: ImageLoadOptions = {}): string {
		const { quality = 85, format = 'auto' } = options;

		// Use the extracted values to avoid TypeScript unused variable errors
		if (quality < 1 || quality > 100) {
			throw new Error('Quality must be between 1 and 100');
		}
		if (!['auto', 'webp', 'jpeg', 'png'].includes(format)) {
			throw new Error('Invalid format specified');
		}

		// If it's a local image, return as-is
		if (src.startsWith('/') || src.startsWith('./')) {
			return src;
		}

		// For external images (Unsplash, etc.), apply optimizations
		if (src.includes('unsplash.com')) {
			return this.optimizeUnsplashUrl(src, options);
		}

		// For other URLs, apply basic optimizations if possible
		return this.applyBasicOptimizations(src, options);
	}

	/**
	 * Generate responsive srcSet
	 */
	generateSrcSet(baseSrc: string, options: ImageLoadOptions = {}): string {
		const widths = [400, 800, 1200, 1600, 2000];

		return widths
			.map((width) => {
				const optimizedUrl = this.getOptimizedUrl(baseSrc, {
					...options,
					// Add width parameter for responsive images
				});
				return `${this.addWidthParam(optimizedUrl, width)} ${width}w`;
			})
			.join(', ');
	}

	/**
	 * Create placeholder image
	 */
	createPlaceholder(
		width: number,
		height: number,
		options: ImageLoadOptions = {},
	): string {
		const { placeholder = 'color', placeholderColor = '#f3f4f6' } = options;

		switch (placeholder) {
			case 'blur':
				return this.createBlurPlaceholder(width, height);
			case 'skeleton':
				return this.createSkeletonPlaceholder(width, height);
			case 'color':
			default:
				return this.createColorPlaceholder(width, height, placeholderColor);
		}
	}

	private async performImageLoad(
		src: string,
		options: ImageLoadOptions,
	): Promise<ProgressiveImageData> {
		const startTime = Date.now();
		const optimizedSrc = this.getOptimizedUrl(src, options);

		const imageData: ProgressiveImageData = {
			src: optimizedSrc,
			srcSet: this.generateSrcSet(src, options),
			placeholder: this.createPlaceholder(400, 300, options),
			loaded: false,
			loading: true,
			error: false,
		};

		try {
			// Create image element for loading
			const img = new Image();

			// Set up loading promise
			const loadPromise = new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error('Image failed to load'));
			});

			// Apply timeout if specified
			const { timeout = 10000 } = options;
			const timeoutPromise = new Promise<void>((_, reject) => {
				setTimeout(() => reject(new Error('Image load timeout')), timeout);
			});

			// Start loading
			img.src = optimizedSrc;

			// Wait for load or timeout
			await Promise.race([loadPromise, timeoutPromise]);

			// Calculate metrics
			const loadTime = Date.now() - startTime;
			const metrics: ImageMetrics = {
				loadTime,
				fileSize: this.estimateFileSize(img),
				format: this.detectFormat(optimizedSrc),
				dimensions: { width: img.naturalWidth, height: img.naturalHeight },
				fromCache: loadTime < 50, // Assume cached if very fast
			};

			imageData.loaded = true;
			imageData.loading = false;
			imageData.metrics = metrics;

			// Track analytics
			analytics.performance({
				name: 'image_load_time',
				value: loadTime,
				unit: 'ms',
				metadata: {
					src: src.slice(0, 100), // Truncate URL
					format: metrics.format,
					fromCache: metrics.fromCache,
				},
			});

			logger.debug('Image loaded successfully', {
				component: 'ProgressiveImageLoader',
				src: src.slice(0, 100),
				loadTime,
				format: metrics.format,
				dimensions: metrics.dimensions,
			});
		} catch (error) {
			imageData.loaded = false;
			imageData.loading = false;
			imageData.error = true;

			logger.warn('Image loading failed', {
				component: 'ProgressiveImageLoader',
				src: src.slice(0, 100),
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			// Track error analytics
			analytics.error(
				'image_load_failed',
				error instanceof Error ? error.message : 'Unknown error',
				{
					src: src.slice(0, 100),
				},
			);
		}

		return imageData;
	}

	private async checkFormatSupport(): Promise<void> {
		// Check WebP support
		this.webpSupported = await this.canPlayFormat('webp');

		// Check AVIF support
		this.avifSupported = await this.canPlayFormat('avif');

		logger.debug('Image format support detected', {
			component: 'ProgressiveImageLoader',
			webp: this.webpSupported,
			avif: this.avifSupported,
		});
	}

	private canPlayFormat(format: string): Promise<boolean> {
		return new Promise((resolve) => {
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;

			canvas.toBlob((blob) => resolve(blob !== null), `image/${format}`, 0.5);
		});
	}

	private optimizeUnsplashUrl(src: string, options: ImageLoadOptions): string {
		const url = new URL(src);
		const { quality = 85 } = options;

		// Add Unsplash optimization parameters
		url.searchParams.set('q', quality.toString());

		// Set format based on browser support
		if (options.format === 'auto') {
			if (this.avifSupported) {
				url.searchParams.set('fm', 'avif');
			} else if (this.webpSupported) {
				url.searchParams.set('fm', 'webp');
			} else {
				url.searchParams.set('fm', 'jpg');
			}
		} else if (options.format) {
			url.searchParams.set('fm', options.format);
		}

		return url.toString();
	}

	private applyBasicOptimizations(
		src: string,
		_options: ImageLoadOptions,
	): string {
		// For non-Unsplash URLs, return original
		// In production, this could integrate with CDN services
		return src;
	}

	private addWidthParam(url: string, width: number): string {
		try {
			const urlObj = new URL(url);
			urlObj.searchParams.set('w', width.toString());
			return urlObj.toString();
		} catch {
			return url;
		}
	}

	private createColorPlaceholder(
		width: number,
		height: number,
		color: string,
	): string {
		return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
      </svg>
    `)}`;
	}

	private createBlurPlaceholder(width: number, height: number): string {
		return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <circle cx="50%" cy="50%" r="20" fill="#d1d5db" opacity="0.5"/>
      </svg>
    `)}`;
	}

	private createSkeletonPlaceholder(width: number, height: number): string {
		return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect x="10%" y="10%" width="80%" height="20%" fill="#e5e7eb" rx="4"/>
        <rect x="10%" y="40%" width="60%" height="20%" fill="#e5e7eb" rx="4"/>
        <rect x="10%" y="70%" width="40%" height="20%" fill="#e5e7eb" rx="4"/>
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
      </svg>
    `)}`;
	}

	private initializeIntersectionObserver(): void {
		if ('IntersectionObserver' in window) {
			// IntersectionObserver for lazy loading (future implementation)
			new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							const img = entry.target as HTMLImageElement;
							const {src} = img.dataset;
							if (src) {
								this.loadImage(src, { loading: 'lazy' });
							}
						}
					});
				},
				{
					threshold: 0.1,
					rootMargin: '100px',
				},
			);
		}
	}

	private getCacheKey(src: string, options: ImageLoadOptions): string {
		return `${src}_${JSON.stringify(options)}`;
	}

	private estimateFileSize(img: HTMLImageElement): number {
		// Rough estimation based on dimensions
		return img.naturalWidth * img.naturalHeight * 0.3; // Rough bytes estimate
	}

	private detectFormat(src: string): string {
		if (src.includes('fm=avif') || src.endsWith('.avif')) {
return 'avif';
}
		if (src.includes('fm=webp') || src.endsWith('.webp')) {
return 'webp';
}
		if (src.includes('fm=png') || src.endsWith('.png')) {
return 'png';
}
		return 'jpeg';
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

export const progressiveImageLoader = ProgressiveImageLoader.getInstance();

// React hook for progressive image loading
export const useProgressiveImage = () => {
	return {
		loadImage: progressiveImageLoader.loadImage.bind(progressiveImageLoader),
		preloadImages: progressiveImageLoader.preloadImages.bind(
			progressiveImageLoader,
		),
		getOptimizedUrl: progressiveImageLoader.getOptimizedUrl.bind(
			progressiveImageLoader,
		),
		generateSrcSet: progressiveImageLoader.generateSrcSet.bind(
			progressiveImageLoader,
		),
		createPlaceholder: progressiveImageLoader.createPlaceholder.bind(
			progressiveImageLoader,
		),
	};
};
