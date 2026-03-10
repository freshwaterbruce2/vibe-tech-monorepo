import { createElement, useState } from 'react';
import { getAppIcon } from '../icons/getAppIcon';

interface AppIconProps {
  name: string;
  /** Image URL for the icon — accepts either `icon` or `src` */
  icon?: string;
  src?: string;
  category?: string;
  size?: number;
  onClick?: () => void;
}

export function AppIcon({ name, icon, src, category, size = 48, onClick }: AppIconProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = icon ?? src;

  return (
    <div className="app-icon" onClick={onClick} title={name} role="img" aria-label={name}>
      <div className="app-icon-image" data-size={size}>
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={name}
            width={size}
            height={size}
            onError={() => setImgFailed(true)}
            draggable={false}
          />
        ) : (
          createElement(getAppIcon(name, category), { size: size * 0.6, stroke: '#e2e8f0' })
        )}
      </div>
      <span className="app-icon-label">{name}</span>
    </div>
  );
}

export default AppIcon;
