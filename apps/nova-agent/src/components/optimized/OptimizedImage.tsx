import { BlurImage } from "../../shared/components/LazyImage";
import { usePerformanceMeasure } from "../../shared/utils/performance-monitor";

interface VibeImageProps {
	src: string;
	alt: string;
	className?: string;
	priority?: boolean;
	quality?: number;
	sizes?: string;
	blurAmount?: number;
	variant?: "hero" | "portfolio" | "blog" | "avatar" | "background";
	onLoadComplete?: () => void;
}

// Vibe-Tech specific image component with brand-aware optimizations
export const VibeImage = ({
	src,
	alt,
	className = "",
	priority = false,
	quality = 85,
	sizes,
	blurAmount = 20,
	variant = "portfolio",
	onLoadComplete,
}: VibeImageProps) => {
	usePerformanceMeasure(`image-${variant}`);

	// Vibe-Tech optimized CDN URLs (assuming Cloudinary or similar)
	const getOptimizedSrc = (originalSrc: string, q: number = quality) => {
		if (
			originalSrc.includes("cloudinary.com") ||
			originalSrc.includes("cdn.")
		) {
			return `${originalSrc}?q=${q}&f=auto&c=fill`;
		}
		return originalSrc;
	};

	// Variant-specific configurations
	const variantConfig = {
		hero: {
			quality: 90,
			sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px",
			priority: true,
			className: "object-cover object-center",
		},
		portfolio: {
			quality: 85,
			sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px",
			priority: false,
			className:
				"object-cover hover:scale-105 transition-transform duration-300",
		},
		blog: {
			quality: 80,
			sizes: "(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 800px",
			priority: false,
			className: "object-cover rounded-lg",
		},
		avatar: {
			quality: 90,
			sizes: "(max-width: 640px) 80px, 120px",
			priority: true,
			className: "object-cover rounded-full",
		},
		background: {
			quality: 75,
			sizes: "100vw",
			priority: false,
			className: "object-cover fixed inset-0",
		},
	};

	const config = variantConfig[variant];
	const finalQuality = quality || config.quality;
	const finalSizes = sizes ?? config.sizes;
	const finalPriority = priority || config.priority;

	return (
		<BlurImage
			src={getOptimizedSrc(src, finalQuality)}
			webpSrc={getOptimizedSrc(src, finalQuality).replace("f=auto", "f=webp")}
			avifSrc={getOptimizedSrc(src, finalQuality).replace("f=auto", "f=avif")}
			alt={alt}
			className={`${config.className} ${className}`}
			priority={finalPriority}
			quality={finalQuality}
			sizes={finalSizes}
			blurAmount={blurAmount}
			onLoad={onLoadComplete}
		/>
	);
};

// Hero section optimized image
interface HeroImageProps {
	src: string;
	alt: string;
	className?: string;
}

export const HeroImage = ({ src, alt, className }: HeroImageProps) => (
	<VibeImage
		src={src}
		alt={alt}
		className={className}
		variant="hero"
		priority={true}
	/>
);

// Portfolio project image with hover effects
interface ProjectImageProps {
	src: string;
	alt: string;
	className?: string;
	onLoad?: () => void;
}

export const ProjectImage = ({
	src,
	alt,
	className,
	onLoad,
}: ProjectImageProps) => (
	<VibeImage
		src={src}
		alt={alt}
		className={className}
		variant="portfolio"
		onLoadComplete={onLoad}
	/>
);

// Blog post image
interface BlogImageProps {
	src: string;
	alt: string;
	className?: string;
	caption?: string;
}

export const BlogImage = ({ src, alt, className, caption }: BlogImageProps) => (
	<figure className="space-y-2">
		<VibeImage src={src} alt={alt} className={className} variant="blog" />
		{caption && (
			<figcaption className="text-sm text-gray-600 dark:text-gray-400 text-center italic">
				{caption}
			</figcaption>
		)}
	</figure>
);

// Avatar image with loading state
interface AvatarImageProps {
	src: string;
	alt: string;
	size?: "sm" | "md" | "lg" | "xl";
	className?: string;
}

export const AvatarImage = ({
	src,
	alt,
	size = "md",
	className,
}: AvatarImageProps) => {
	const sizeClasses = {
		sm: "w-8 h-8",
		md: "w-12 h-12",
		lg: "w-16 h-16",
		xl: "w-24 h-24",
	};

	return (
		<div
			className={`${sizeClasses[size]} ${className} relative overflow-hidden rounded-full bg-gray-200`}
		>
			<VibeImage
				src={src}
				alt={alt}
				className="w-full h-full"
				variant="avatar"
				priority={size === "lg" || size === "xl"}
			/>
		</div>
	);
};

// Background image with parallax effect
interface BackgroundImageProps {
	src: string;
	alt: string;
	className?: string;
	overlay?: "light" | "dark" | "gradient" | "none";
	parallax?: boolean;
}

export const BackgroundImage = ({
	src,
	alt,
	className,
	overlay = "none",
	parallax = false,
}: BackgroundImageProps) => {
	const overlayClasses = {
		light: "bg-white bg-opacity-50",
		dark: "bg-black bg-opacity-50",
		gradient:
			"bg-gradient-to-r from-purple-900/50 via-blue-900/50 to-cyan-900/50",
		none: "",
	};

	return (
		<div className={`relative ${className}`}>
			<div className={`absolute inset-0 ${parallax ? "transform-gpu" : ""}`}>
				<VibeImage
					src={src}
					alt={alt}
					className="w-full h-full"
					variant="background"
				/>
			</div>
			{overlay !== "none" && (
				<div className={`absolute inset-0 ${overlayClasses[overlay]}`} />
			)}
		</div>
	);
};

// Image gallery with lazy loading
interface ImageGalleryProps {
	images: { src: string; alt: string; caption?: string }[];
	className?: string;
	columns?: 2 | 3 | 4;
}

export const ImageGallery = ({
	images,
	className,
	columns = 3,
}: ImageGalleryProps) => {
	const gridClasses = {
		2: "grid-cols-1 md:grid-cols-2",
		3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
		4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
	};

	return (
		<div className={`grid gap-4 ${gridClasses[columns]} ${className}`}>
			{images.map((image, index) => (
				<div key={image.src} className="space-y-2">
					<img
						src={image.src}
						alt={image.alt}
						className="w-full aspect-square object-cover" // Added object-cover for consistency
						loading={index < 3 ? "eager" : "lazy"} // Standard lazy loading
					/>
					{image.caption && (
						<p className="text-sm text-gray-600 dark:text-gray-400 text-center">
							{image.caption}
						</p>
					)}
				</div>
			))}
		</div>
	);
};
// @ts-nocheck
