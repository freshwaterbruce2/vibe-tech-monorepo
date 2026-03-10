import type { LazyExoticComponent } from "react";
import { type ComponentType, createElement, lazy } from "react";

export function lazyLoad<TProps>(
	factory: () => Promise<{ default: ComponentType<TProps> }>,
	minLoadTimeMs = 0,
): LazyExoticComponent<ComponentType<TProps>> {
	return lazy(async () =>
		Promise.all([
			factory(),
			new Promise<void>((resolve) => setTimeout(resolve, minLoadTimeMs)),
		]).then(([moduleExports]) => moduleExports),
	);
}

type LazyLoader<TProps> = () => Promise<{ default: ComponentType<TProps> }>;

interface LazyComponentOptions {
	minDelayMs?: number;
}

async function withMinDelay<T>(promise: Promise<T>, minDelayMs?: number): Promise<T> {
	if (!minDelayMs || minDelayMs <= 0) return promise;
	return Promise.all([
		promise,
		new Promise<void>((resolve) => setTimeout(resolve, minDelayMs)),
	]).then(([value]) => value);
}

export function createLazyComponent<TProps>(
	loader: LazyLoader<TProps>,
	displayName: string,
	options: LazyComponentOptions = {},
): ComponentType<TProps> {
	const Lazy = lazy(async () => withMinDelay(loader(), options.minDelayMs));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Wrapped = (props: TProps) => createElement(Lazy as any, props as any);
	Wrapped.displayName = `Lazy(${displayName})`;
	return Wrapped;
}

export function createLazyHeavyComponent<TProps>(
	loader: LazyLoader<TProps>,
	displayName: string,
	minDelayMs = 250,
): ComponentType<TProps> {
	return createLazyComponent(loader, displayName, { minDelayMs });
}

type RoutePriority = "high" | "medium" | "low";

interface LazyRouteOptions {
	priority?: RoutePriority;
	preload?: boolean;
	dependencies?: string[];
}

interface RouteRegistryEntry {
	name: string;
	loader: () => Promise<unknown>;
	options: LazyRouteOptions;
}

const routeRegistry = new Map<string, RouteRegistryEntry>();
const actionHistory: string[] = [];
const preloadCallbacks = new Map<string, Array<() => void>>();

export const globalPreloader = {
	registerRoute(
		name: string,
		loader: () => Promise<unknown>,
		options: LazyRouteOptions = {},
	) {
		routeRegistry.set(name, { name, loader, options });
		if (options.preload) {
			void loader();
		}
	},

	preload(name: string) {
		const entry = routeRegistry.get(name);
		if (!entry) return;
		void entry.loader();
	},

	recordAction(action: string) {
		actionHistory.push(action);
		if (actionHistory.length > 100) actionHistory.shift();

		// Trigger callbacks registered for this action
		const callbacks = preloadCallbacks.get(action);
		if (callbacks) {
			callbacks.forEach((cb) => cb());
		}
	},

	registerPreloadCallback(action: string, callback: () => void) {
		if (!preloadCallbacks.has(action)) {
			preloadCallbacks.set(action, []);
		}
		preloadCallbacks.get(action)?.push(callback);
	},
};

export function createLazyRoute<TProps>(
	loader: LazyLoader<TProps>,
	routeName: string,
	options: LazyRouteOptions = {},
): ComponentType<TProps> {
	globalPreloader.registerRoute(routeName, async () => loader(), options);
	return createLazyComponent(loader, routeName);
}
