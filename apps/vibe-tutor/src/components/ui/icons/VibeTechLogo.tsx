import type { FC, ImgHTMLAttributes } from 'react';

export const VibeTechLogo: FC<ImgHTMLAttributes<HTMLImageElement>> = ({
  alt = 'Vibe Tutor',
  className,
  ...props
}) => (
  <img
    src="/icon-512.png"
    alt={alt}
    className={`${className ? `${className} ` : ''}pulse-glow object-contain`}
    draggable={false}
    {...props}
  />
);
