import { useState } from 'react';
import type { CSSProperties } from 'react';

interface AvatarImageProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function AvatarImage({ src, alt, size = 40, className, style }: AvatarImageProps) {
  const [imgError, setImgError] = useState(false);

  if (src.startsWith('/') && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'cover', borderRadius: '4px', ...style }}
        onError={() => { setImgError(true); }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={alt}
      className={className}
      style={{ fontSize: size * 0.7, lineHeight: 1, display: 'inline-block', ...style }}
    >
      {imgError ? '🎭' : src}
    </span>
  );
}
