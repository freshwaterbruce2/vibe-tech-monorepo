import { type RefObject, useCallback, useEffect, useState } from 'react';

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

	const updateEntry = useCallback(
		([nextEntry]: IntersectionObserverEntry[]): void => {
			if (!frozen || !nextEntry) {
				if (nextEntry) {
					setEntry(nextEntry);
					setIsIntersecting(nextEntry.isIntersecting);
				}
				return;
			}

			setEntry(nextEntry);
			setIsIntersecting(nextEntry.isIntersecting);
		},
		[frozen],
	);

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
	}, [elementRef, threshold, root, rootMargin, frozen, updateEntry]);

	return { isIntersecting, entry };
}
