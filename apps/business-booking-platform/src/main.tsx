import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { logger } from './utils/logger';
import { phase2Integration } from './utils/phase2Integration';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime, now gcTime in v5)
			retry: 2,
		},
	},
});

// Initialize Phase 2 optimizations and service worker
const initializeApp = async () => {
	try {
		// Initialize Phase 2 optimizations
		await phase2Integration.initialize({
			analytics: {
				enabled: true,
				userId: localStorage.getItem('user-id') || undefined,
			},
			cache: {
				enabled: true,
				preloadCritical: true,
			},
			websocket: {
				enabled: import.meta.env.MODE === 'production',
				url: import.meta.env.VITE_WEBSOCKET_URL,
			},
			images: {
				progressive: true,
				preload: [
					'/images/hero-bg.jpg',
					'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
					'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
				],
			},
			security: {
				enabled: true,
				strictMode: import.meta.env.MODE === 'production',
			},
			seo: {
				enabled: true,
				autoUpdate: true,
			},
		});

		logger.info('Phase 2 optimizations initialized', {
			component: 'MainApp',
			performance: await phase2Integration.getPerformanceMetrics(),
		});
	} catch (error) {
		logger.error(
			'Phase 2 initialization failed, continuing with basic functionality',
			{
				component: 'MainApp',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
		);
	}
};

// Register service worker for offline support and caching
if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		// Initialize Phase 2 optimizations first
		await initializeApp();

		try {
			const registration = await navigator.serviceWorker.register('/sw.js', {
				scope: '/',
			});

			logger.info('Service Worker registered successfully', {
				component: 'ServiceWorker',
				scope: registration.scope,
				state:
					registration.installing?.state ||
					registration.waiting?.state ||
					registration.active?.state,
			});

			// Handle service worker updates
			registration.addEventListener('updatefound', () => {
				const newWorker = registration.installing;
				if (newWorker) {
					newWorker.addEventListener('statechange', () => {
						if (
							newWorker.state === 'installed' &&
							navigator.serviceWorker.controller
						) {
							logger.info(
								'New service worker available, will update on next visit',
								{
									component: 'ServiceWorker',
								},
							);
						}
					});
				}
			});
		} catch (error) {
			logger.warn('Service Worker registration failed', {
				component: 'ServiceWorker',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	});
} else {
	// Initialize Phase 2 even without service worker
	window.addEventListener('DOMContentLoaded', initializeApp);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</QueryClientProvider>
	</React.StrictMode>,
);
