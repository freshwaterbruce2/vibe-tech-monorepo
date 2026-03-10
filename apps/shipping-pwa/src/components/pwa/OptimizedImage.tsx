/**
 * Optimized Image Component with WebP/AVIF support
 * Features: Format detection, lazy loading, responsive images, error fallback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  lazy?: boolean;
  responsive?: boolean;
  sizes?: string;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  fallbackSrc?: string;
  quality?: number;
}

interface ImageFormats {
  avif?: string;
  webp?: string;
  original: string;
}

export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  lazy = true,
  responsive = false,
  sizes = '100vw',
  onLoad,
  onError,
  fallbackSrc,
  quality = 75,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [formats, setFormats] = useState<ImageFormats>({ original: src });

  // Detect supported image formats
  useEffect(() => {
    const detectFormats = async () => {
      const supportedFormats = await getSupportedImageFormats();
      const imageFormats = generateImageFormats(src, supportedFormats, quality);
      setFormats(imageFormats);
    };

    detectFormats();
  }, [src, quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, isInView]);

  // Handle image loading with format fallback
  useEffect(() => {
    if (!isInView) return;

    const loadImage = async () => {
      const imageSrc = await selectOptimalImageFormat(formats);
      setCurrentSrc(imageSrc);
    };

    loadImage();
  }, [isInView, formats]);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoaded(true);
      setHasError(false);
      onLoad?.(event);
    },
    [onLoad]
  );

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setHasError(true);
      
      // Try fallback formats
      if (currentSrc === formats.avif && formats.webp) {
        setCurrentSrc(formats.webp);
        return;
      }
      
      if (currentSrc === formats.webp && formats.original) {
        setCurrentSrc(formats.original);
        return;
      }
      
      // Use fallback src if available
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        return;
      }

      onError?.(event);
    },
    [currentSrc, formats, fallbackSrc, onError]
  );

  const generateSrcSet = (baseSrc: string): string => {
    if (!responsive || !width) return '';

    const sizes = [1, 1.5, 2, 3];
    const srcSet = sizes
      .map((scale) => {
        const scaledWidth = Math.round(width * scale);
        const scaledSrc = addImageParams(baseSrc, { w: scaledWidth, q: quality });
        return `${scaledSrc} ${scale}x`;
      })
      .join(', ');

    return srcSet;
  };

  const imageClasses = cn(
    'transition-all duration-300',
    {
      'opacity-0': !isLoaded && !hasError,
      'opacity-100': isLoaded,
      'filter blur-sm': !isLoaded && !hasError,
      'filter blur-none': isLoaded,
    },
    className
  );

  const placeholderClasses = cn(
    'absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse',
    {
      'opacity-100': !isLoaded && !hasError,
      'opacity-0': isLoaded || hasError,
    }
  );

  const errorClasses = cn(
    'absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400',
    {
      'opacity-0': !hasError,
      'opacity-100': hasError && !currentSrc,
    }
  );

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={cn('bg-gray-200 dark:bg-gray-700 animate-pulse', className)}
        style={{ width, height }}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      {currentSrc && (
        <picture>
          {formats.avif && (
            <source
              srcSet={responsive ? generateSrcSet(formats.avif) : formats.avif}
              sizes={responsive ? sizes : undefined}
              type="image/avif"
            />
          )}
          {formats.webp && (
            <source
              srcSet={responsive ? generateSrcSet(formats.webp) : formats.webp}
              sizes={responsive ? sizes : undefined}
              type="image/webp"
            />
          )}
          <img
            ref={imgRef}
            src={currentSrc}
            srcSet={responsive ? generateSrcSet(currentSrc) : undefined}
            sizes={responsive ? sizes : undefined}
            alt={alt}
            width={width}
            height={height}
            className={imageClasses}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </picture>
      )}
      
      <div className={placeholderClasses} />
      
      <div className={errorClasses}>
        <div className="text-center">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">Image not available</div>
        </div>
      </div>
    </div>
  );
}

// Helper functions

async function getSupportedImageFormats(): Promise<{ avif: boolean; webp: boolean }> {
  const formats = { avif: false, webp: false };

  try {
    // Check AVIF support
    const avifCanvas = document.createElement('canvas');
    avifCanvas.width = avifCanvas.height = 1;
    const avifDataUrl = avifCanvas.toDataURL('image/avif');
    formats.avif = avifDataUrl.indexOf('data:image/avif') === 0;

    // Check WebP support
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = webpCanvas.height = 1;
    const webpDataUrl = webpCanvas.toDataURL('image/webp');
    formats.webp = webpDataUrl.indexOf('data:image/webp') === 0;
  } catch (error) {
    console.warn('Format detection failed:', error);
  }

  // Fallback: Check with feature detection
  if (!formats.avif) {
    formats.avif = CSS.supports('(image-rendering: pixelated) and (background-image: url("data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAABAA0ABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A="))');
  }

  if (!formats.webp) {
    formats.webp = CSS.supports('background-image', 'url("data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==")');
  }

  return formats;
}

function generateImageFormats(
  src: string,
  supportedFormats: { avif: boolean; webp: boolean },
  quality: number
): ImageFormats {
  const formats: ImageFormats = { original: src };

  // Only generate format variants if we have a service/CDN that supports it
  const hasImageService = src.includes('cloudinary') || src.includes('imagekit') || src.includes('/api/images');

  if (hasImageService) {
    if (supportedFormats.avif) {
      formats.avif = convertImageFormat(src, 'avif', quality);
    }
    if (supportedFormats.webp) {
      formats.webp = convertImageFormat(src, 'webp', quality);
    }
  } else {
    // For local images, try to find pre-generated variants
    const basePath = src.substring(0, src.lastIndexOf('.'));
    const extension = src.substring(src.lastIndexOf('.'));
    
    if (supportedFormats.avif) {
      formats.avif = `${basePath}.avif`;
    }
    if (supportedFormats.webp) {
      formats.webp = `${basePath}.webp`;
    }
  }

  return formats;
}

function convertImageFormat(src: string, format: 'avif' | 'webp', quality: number): string {
  // Cloudinary transformation
  if (src.includes('cloudinary')) {
    return src.replace('/upload/', `/upload/f_${format},q_${quality}/`);
  }

  // ImageKit transformation
  if (src.includes('imagekit')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}format=${format}&quality=${quality}`;
  }

  // Custom API
  if (src.includes('/api/images')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}format=${format}&quality=${quality}`;
  }

  return src;
}

function addImageParams(src: string, params: Record<string, string | number>): string {
  const url = new URL(src, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value.toString());
  });
  
  return url.toString();
}

async function selectOptimalImageFormat(formats: ImageFormats): Promise<string> {
  // Try formats in order of preference: AVIF > WebP > Original
  const formatOrder = [formats.avif, formats.webp, formats.original].filter(Boolean);
  
  for (const format of formatOrder) {
    if (format && await canLoadImage(format)) {
      return format;
    }
  }
  
  return formats.original;
}

async function canLoadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export default OptimizedImage;
