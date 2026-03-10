import { type ImgHTMLAttributes, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
	src: string;
	webpSrc?: string;
	avifSrc?: string;
	alt: string;
	className?: string;
	priority?: boolean;
	quality?: number;
	blurAmount?: number;
	variant?: "default" | "background" | "portfolio";
}

export const LazyImage = ({
	src,
	alt,
	className,
	priority,
	blurAmount: _blurAmount = 10,
	variant: _variant = "default",
	...props
}: LazyImageProps) => {
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		if (priority) {
			const img = new Image();
			img.src = src;
			img.onload = () => setIsLoaded(true);
		}
	}, [src, priority]);

	return (
		<img
			src={src}
			alt={alt}
			className={cn(
				"transition-opacity duration-300",
				isLoaded ? "opacity-100" : "opacity-0",
				className,
			)}
			onLoad={() => setIsLoaded(true)}
			{...props}
		/>
	);
};

// Alias ensuring backward compatibility
export const BlurImage = LazyImage;
