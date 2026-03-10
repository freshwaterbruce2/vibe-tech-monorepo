// Animated counter component with smooth transitions
import { useEffect, useState } from "react";

interface AnimatedCounterProps {
	value: number;
	duration?: number; // Animation duration in ms
	decimals?: number;
	prefix?: string;
	suffix?: string;
	className?: string;
}

export function AnimatedCounter({
	value,
	duration = 1000,
	decimals = 0,
	prefix = "",
	suffix = "",
	className = "",
}: AnimatedCounterProps) {
	const [displayValue, setDisplayValue] = useState(value);

	useEffect(() => {
		const startValue = displayValue;
		const endValue = value;
		const startTime = Date.now();

		const animate = () => {
			const now = Date.now();
			const progress = Math.min((now - startTime) / duration, 1);

			// Easing function (ease-out)
			const eased = 1 - (1 - progress) ** 3;

			const current = startValue + (endValue - startValue) * eased;
			setDisplayValue(current);

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				setDisplayValue(endValue);
			}
		};

		animate();
	}, [value, duration, displayValue]);

	const formatted = displayValue.toFixed(decimals);

	return (
		<span className={className}>
			{prefix}
			{formatted}
			{suffix}
		</span>
	);
}
