/**
 * Sparkline — lightweight SVG trend chart for healing data.
 * No external dependencies. Renders a polyline with gradient fill.
 */

interface SparklineProps {
  /** Data points (y values) — rendered left to right */
  data: number[];
  /** Chart width in px */
  width?: number;
  /** Chart height in px */
  height?: number;
  /** Stroke color */
  color?: string;
  /** Label shown below the chart */
  label?: string;
}

export function Sparkline({
  data,
  width = 260,
  height = 48,
  color = '#06b6d4',
  label,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <div className="sparkline-empty" style={{ width, height }}>
        <span>Insufficient data</span>
      </div>
    );
  }

  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * w;
    const y = padding + h - ((val - min) / range) * h;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Fill area: close the path along the bottom
  const fillPath =
    `M${points[0]} ` +
    points.map((p) => `L${p}`).join(' ') +
    ` L${padding + w},${padding + h} L${padding},${padding + h} Z`;

  const gradientId = `spark-grad-${color.replace('#', '')}`;

  return (
    <div className="sparkline-container">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="sparkline-svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradientId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Latest value dot */}
        <circle
          cx={padding + w}
          cy={padding + h - ((data[data.length - 1] - min) / range) * h}
          r={3}
          fill={color}
        />
      </svg>
      {label && <span className="sparkline-label">{label}</span>}
    </div>
  );
}
