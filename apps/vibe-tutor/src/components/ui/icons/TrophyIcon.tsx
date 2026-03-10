import React, { FC, SVGProps } from 'react';

export const TrophyIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
    {/* FIX: Replaced multiple incorrect SVG paths with a single, clean path for a trophy icon. */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 019 0zM18.375 16.5c-1.423 0-2.734.764-3.563 1.95-1.1-1.596-2.836-2.7-4.812-2.7-1.976 0-3.712 1.104-4.813 2.7-.83-1.186-2.14-1.95-3.563-1.95-2.576 0-4.665 2.09-4.665 4.665h19.33c0-2.575-2.09-4.665-4.665-4.665zM12 3v5.25m0 0l3 1.5m-3-1.5l-3 1.5m-3-1.5V3m3 1.5V3" />
 </svg>
);