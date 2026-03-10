import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface AnalyticsEvent {
	category: string;
	action: string;
	label?: string;
	value?: number;
}

// Mock analytics service - replace with real service (GA4, Mixpanel, etc.)
class AnalyticsService {
	private static instance: AnalyticsService;

	static getInstance() {
		if (!AnalyticsService.instance) {
			AnalyticsService.instance = new AnalyticsService();
		}
		return AnalyticsService.instance;
	}

	identify(userId: string, traits?: Record<string, any>) {
		if (import.meta.env.DEV) {
			console.log("[Analytics] Identify:", userId, traits);
		}

		// In production, send to analytics service
		if (window.gtag) {
			window.gtag("set", { user_id: userId });
		}
	}

	track(event: string, properties?: Record<string, any>) {
		if (import.meta.env.DEV) {
			console.log("[Analytics] Track:", event, properties);
		}

		// Send to Google Analytics
		if (window.gtag) {
			window.gtag("event", event, properties);
		}

		// Send to Mixpanel
		if (window.mixpanel) {
			window.mixpanel.track(event, properties);
		}
	}

	page(name: string, properties?: Record<string, any>) {
		if (import.meta.env.DEV) {
			console.log("[Analytics] Page view:", name, properties);
		}

		if (window.gtag) {
			window.gtag("event", "page_view", {
				page_title: name,
				page_location: window.location.href,
				page_path: window.location.pathname,
				...properties,
			});
		}
	}

	revenue(
		amount: number,
		currency: string = "USD",
		properties?: Record<string, any>,
	) {
		this.track("Purchase", {
			value: amount,
			currency,
			...properties,
		});
	}
}

export const useAnalytics = () => {
	const location = useLocation();
	const { user } = useAuth();
	const analytics = AnalyticsService.getInstance();

	// Track page views
	useEffect(() => {
		analytics.page(document.title, {
			path: location.pathname,
			search: location.search,
			hash: location.hash,
		});
	}, [location]);

	// Identify user when they log in
	useEffect(() => {
		if (user) {
			analytics.identify(user.id, {
				email: user.email,
			});
		}
	}, [user]);

	const trackEvent = useCallback((event: AnalyticsEvent) => {
		analytics.track(event.action, {
			event_category: event.category,
			event_label: event.label,
			value: event.value,
		});
	}, []);

	const trackInvoiceCreated = useCallback((invoice: any) => {
		analytics.track("Invoice Created", {
			invoice_id: invoice.id,
			amount: invoice.total,
			currency: invoice.currency || "USD",
			recurring: invoice.recurring_config?.enabled || false,
		});
	}, []);

	const trackPaymentReceived = useCallback((payment: any) => {
		analytics.revenue(payment.amount, payment.currency, {
			payment_id: payment.id,
			invoice_id: payment.invoice_id,
			payment_method: payment.method,
		});
	}, []);

	const trackFeatureUsed = useCallback(
		(feature: string, metadata?: Record<string, any>) => {
			analytics.track("Feature Used", {
				feature_name: feature,
				...metadata,
			});
		},
		[],
	);

	return {
		trackEvent,
		trackInvoiceCreated,
		trackPaymentReceived,
		trackFeatureUsed,
		analytics,
	};
};

// Initialize analytics on app load
export const initAnalytics = () => {
	// Google Analytics 4
	if (import.meta.env.VITE_GA_TRACKING_ID) {
		const script = document.createElement("script");
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_TRACKING_ID}`;
		document.head.appendChild(script);

		window.dataLayer = window.dataLayer || [];
		window.gtag = function () {
			// eslint-disable-next-line prefer-rest-params
			window.dataLayer.push(arguments);
		};
		window.gtag("js", new Date());
		window.gtag("config", import.meta.env.VITE_GA_TRACKING_ID);
	}

	// Mixpanel
	if (import.meta.env.VITE_MIXPANEL_TOKEN) {
		const script = document.createElement("script");
		script.innerHTML = `
      (function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
      for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===f.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\\/\\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);
    `;
		document.head.appendChild(script);

		window.mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN);
	}
};

// Type declarations
declare global {
	interface Window {
		gtag: (...args: any[]) => void;
		dataLayer: any[];
		mixpanel: any;
	}
}
