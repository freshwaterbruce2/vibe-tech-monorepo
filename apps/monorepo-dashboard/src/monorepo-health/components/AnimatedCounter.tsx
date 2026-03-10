import { useEffect, useState } from "react";

export function AnimatedCounter({
	value,
	duration = 1000,
	suffix = "",
}: {
	value: number;
	duration?: number;
	suffix?: string;
}) {
	const [count, setCount] = useState(0);

	useEffect(() => {
		let current = 0;
		const increment = value / (duration / 16);

		const timer = window.setInterval(() => {
			current += increment;
			if (current >= value) {
				setCount(value);
				window.clearInterval(timer);
			} else {
				setCount(Math.floor(current));
			}
		}, 16);

		return () => window.clearInterval(timer);
	}, [value, duration]);

	return (
		<span>
			{count}
			{suffix}
		</span>
	);
}
