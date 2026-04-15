import React, { FC, SVGProps, useId } from 'react';

export const VibeTechLogo: FC<SVGProps<SVGSVGElement>> = ({ className, ...props }) => {
  const id = useId();
  const gradientId = `logoGradient-${id}`;
  const filterId = `glow-${id}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className ? `${className} ` : ''}pulse-glow`}
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--success-accent)" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* V Shape */}
      <path
        d="M 40 40 L 100 140 L 160 40"
        stroke={`url(#${gradientId})`}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />

      {/* T Shape */}
      <path
        d="M 120 40 L 180 40 M 150 40 L 150 100"
        stroke={`url(#${gradientId})`}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />

      {/* Vibe-Tech Text */}
      <text
        x="100"
        y="170"
        textAnchor="middle"
        fontSize="16"
        fontFamily="Inter, sans-serif"
        fontWeight="600"
        fill={`url(#${gradientId})`}
        filter={`url(#${filterId})`}
      >
        VIBE-TECH
      </text>

      {/* AI Badge */}
      <circle
        cx="100"
        cy="185"
        r="12"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        filter={`url(#${filterId})`}
      />
      <text
        x="100"
        y="190"
        textAnchor="middle"
        fontSize="10"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fill={`url(#${gradientId})`}
      >
        AI
      </text>
    </svg>
  );
};
