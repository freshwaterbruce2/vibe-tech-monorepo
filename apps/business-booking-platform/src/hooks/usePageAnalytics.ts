/**
 * React Hook for Page-Level Analytics
 * Automatic page tracking and user behavior monitoring
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../utils/analytics';
import { logger } from '../utils/logger';

interface PageAnalyticsOptions {
	trackScrollDepth?: boolean;
	trackTimeOnPage?: boolean;
	trackInteractions?: boolean;
	customProperties?: Record<string, any>;
}

export function usePageAnalytics(
	pageName: string,
	options: PageAnalyticsOptions = {},
) {
	const location = useLocation();
	const startTime = useRef<number>(Date.now());
	const maxScrollDepth = useRef<number>(0);
	const interactionCount = useRef<number>(0);

	const {
		trackScrollDepth = true,
		trackTimeOnPage = true,
		trackInteractions = true,
		customProperties = {},
	} = options;

	useEffect(() => {
		// Track page view
		analytics.pageView(pageName, {
			path: location.pathname,
			search: location.search,
			...customProperties,
		});

		logger.debug('Page analytics initialized', {
			component: 'PageAnalytics',
			page: pageName,
			path: location.pathname,
		});

		// Reset tracking values for new page
		startTime.current = Date.now();
		maxScrollDepth.current = 0;
		interactionCount.current = 0;

		// Set up scroll tracking
		let scrollHandler: (() => void) | undefined;
		if (trackScrollDepth) {
			scrollHandler = () => {
				const scrollPercent = Math.round(
					(window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
						100,
				);

				if (scrollPercent > maxScrollDepth.current) {
					maxScrollDepth.current = scrollPercent;

					// Track milestone scroll depths
					const milestones = [25, 50, 75, 90, 100];
					const milestone = milestones.find(
						(m) => scrollPercent >= m && maxScrollDepth.current < m,
					);

					if (milestone) {
						analytics.track('scroll_depth', {
							page: pageName,
							depth: milestone,
							timestamp: Date.now() - startTime.current,
						});
					}
				}
			};

			window.addEventListener('scroll', scrollHandler, { passive: true });
		}

		// Set up interaction tracking
		let clickHandler: ((event: MouseEvent) => void) | undefined;
		if (trackInteractions) {
			clickHandler = (event: MouseEvent) => {
				interactionCount.current += 1;

				const target = event.target as HTMLElement;
				const elementInfo = {
					tag: target.tagName.toLowerCase(),
					className: target.className,
					id: target.id,
					text: target.textContent?.slice(0, 50) || '',
				};

				analytics.interaction('click', pageName, {
					element: elementInfo,
					position: { x: event.clientX, y: event.clientY },
					timeOnPage: Date.now() - startTime.current,
				});
			};

			document.addEventListener('click', clickHandler);
		}

		// Cleanup and send final metrics on unmount
		return () => {
			if (scrollHandler) {
				window.removeEventListener('scroll', scrollHandler);
			}
			if (clickHandler) {
				document.removeEventListener('click', clickHandler);
			}

			// Send time on page metric
			if (trackTimeOnPage) {
				const timeOnPage = Date.now() - startTime.current;
				analytics.performance({
					name: 'time_on_page',
					value: timeOnPage,
					unit: 'ms',
					metadata: {
						page: pageName,
						maxScrollDepth: maxScrollDepth.current,
						interactions: interactionCount.current,
					},
				});
			}

			logger.debug('Page analytics cleanup', {
				component: 'PageAnalytics',
				page: pageName,
				timeOnPage: Date.now() - startTime.current,
				maxScrollDepth: maxScrollDepth.current,
				interactions: interactionCount.current,
			});
		};
	}, [
		location.pathname,
		pageName,
		trackScrollDepth,
		trackTimeOnPage,
		trackInteractions,
	]);

	// Return analytics functions for manual tracking
	return {
		trackEvent: (eventName: string, properties?: Record<string, any>) => {
			analytics.track(eventName, {
				page: pageName,
				timeOnPage: Date.now() - startTime.current,
				...properties,
			});
		},
		trackConversion: (
			step: string,
			value?: number,
			metadata?: Record<string, any>,
		) => {
			analytics.conversion({
				step,
				funnel: pageName,
				value,
				metadata: {
					timeOnPage: Date.now() - startTime.current,
					...metadata,
				},
			});
		},
		trackPerformance: (name: string, value: number, unit = 'ms') => {
			analytics.performance({
				name,
				value,
				unit,
				metadata: { page: pageName },
			});
		},
	};
}
