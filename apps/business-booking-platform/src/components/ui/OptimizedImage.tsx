import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { logger } from '../../utils/logger';

interface OptimizedImageProps {
	src: string;
	alt: string;
	className?: string;
	width?: number;
	height?: number;
	fallbackSrc?: string;
	priority?: boolean;
	onLoad?: () => void;
	onError?: (error: Event) => void;
	loading?: 'lazy' | 'eager';
	sizes?: string;
	srcSet?: string;
	aspectRatio?: string;
	objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
	src,
	alt,
	className = '',
	width,
	height,
	fallbackSrc = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
	priority = false,
	onLoad,
	onError,
	loading = 'lazy',
	sizes,
	srcSet,
	aspectRatio,
	objectFit = 'cover',
}) => {
	const [imageSrc, setImageSrc] = useState<string>(priority ? src : '');
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [loadStartTime, setLoadStartTime] = useState<number>(0);
	const imgRef = useRef<HTMLImageElement>(null);

	// Use intersection observer for lazy loading
	const { isIntersecting } = useIntersectionObserver(imgRef, {
		threshold: 0.1,
		rootMargin: '50px',
	});

	// Start loading image when it becomes visible or if priority is set
	useEffect(() => {
		if ((isIntersecting || priority) && !imageSrc && !imageError) {
			setLoadStartTime(Date.now());
			setImageSrc(src);
			logger.debug('Image loading started', {
				component: 'OptimizedImage',
				src,
				priority,
				isIntersecting,
			});
		}
	}, [isIntersecting, priority, src, imageSrc, imageError]);

	const handleLoad = (_event: React.SyntheticEvent<HTMLImageElement>) => {
		setImageLoaded(true);
		const loadTime = Date.now() - loadStartTime;

		logger.debug('Image loaded successfully', {
			component: 'OptimizedImage',
			src: imageSrc,
			loadTime: `${loadTime}ms`,
		});

		onLoad?.();
	};

	const handleError = (_event: React.SyntheticEvent<HTMLImageElement>) => {
		setImageError(true);
		const loadTime = Date.now() - loadStartTime;

		logger.warn('Image failed to load, using fallback', {
			component: 'OptimizedImage',
			originalSrc: src,
			fallbackSrc,
			loadTime: `${loadTime}ms`,
		});

		if (imageSrc !== fallbackSrc && fallbackSrc) {
			setImageSrc(fallbackSrc);
			setImageError(false);
		}

		onError?.(_event.nativeEvent);
	};

	const containerStyle: React.CSSProperties = {
		aspectRatio:
			aspectRatio || (width && height ? `${width}/${height}` : undefined),
		width: width ? `${width}px` : undefined,
		height: height ? `${height}px` : undefined,
	};

	const imageStyle: React.CSSProperties = {
		objectFit,
		transition: 'opacity 0.3s ease-in-out',
		opacity: imageLoaded ? 1 : 0,
	};

	return (
		<div
			className={`relative overflow-hidden bg-gray-100 ${className}`}
			style={containerStyle}
		>
			{/* Placeholder/Loading state */}
			{!imageLoaded && (
				<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
					<div className="flex flex-col items-center text-gray-400">
						<svg
							className="w-8 h-8 animate-pulse"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="text-xs mt-1">Loading...</span>
					</div>
				</div>
			)}

			{/* Actual image */}
			{imageSrc && (
				<img
					ref={imgRef}
					src={imageSrc}
					alt={alt}
					width={width}
					height={height}
					loading={loading}
					sizes={sizes}
					srcSet={srcSet}
					style={imageStyle}
					className="w-full h-full"
					onLoad={handleLoad}
					onError={handleError}
					decoding="async"
				/>
			)}

			{/* Error state */}
			{imageError && imageSrc === fallbackSrc && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-200">
					<div className="flex flex-col items-center text-gray-500">
						<svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="text-xs mt-1">Failed to load</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default OptimizedImage;
