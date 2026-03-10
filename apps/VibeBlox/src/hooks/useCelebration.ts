import { useCallback, useState } from "react";

interface CelebrationData {
	type: "quest" | "achievement" | "levelup" | "purchase";
	title: string;
	description?: string;
	icon?: string;
	coins?: number;
	level?: number;
}

export function useCelebration() {
	const [celebration, setCelebration] = useState<CelebrationData | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const celebrate = useCallback((data: CelebrationData) => {
		setCelebration(data);
		setIsOpen(true);
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
		setTimeout(() => setCelebration(null), 300); // Wait for exit animation
	}, []);

	return {
		celebration,
		isOpen,
		celebrate,
		close,
	};
}
