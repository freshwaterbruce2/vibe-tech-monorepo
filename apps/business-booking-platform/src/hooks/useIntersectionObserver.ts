import { type RefObject, useEffect, useState } from 'react';

interface UseIntersectionObserverOptions {
	threshold?: number | number[];
	root?: Element | null;
	rootMargin?: string;
	freezeOnceVisible?: boolean;
}

interface UseIntersectionObserverResult {
	isIntersecting: boolean;
	entry?: IntersectionObserverEntry;
}

export function useIntersectionObserver(
	elementRef: RefObject<Element | null>,
	options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverResult {
	const {
		threshold = 0,
		root = null,
		rootMargin = '0%',
		freezeOnceVisible = false,
	} = options;

	const [entry, setEntry] = useState<IntersectionObserverEntry>();
	const [isIntersecting, setIsIntersecting] = useState(false);

	const frozen = entry?.isIntersecting && freezeOnceVisible;

	const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
		if (!frozen && entry) {
			setEntry(entry);
			setIsIntersecting(entry.isIntersecting);
		}
	};

	useEffect(() => {
		const node = elementRef?.current;
		const hasIOSupport = !!window.IntersectionObserver;

		if (!hasIOSupport || frozen || !node) {
			return;
		}

		const observerParams = { threshold, root, rootMargin };
		const observer = new IntersectionObserver(updateEntry, observerParams);

		observer.observe(node);

		return () => observer.disconnect();
	}, [elementRef, threshold, root, rootMargin, frozen]);

	return { isIntersecting, entry };
}
