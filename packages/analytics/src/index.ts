export type AnalyticsProperties = Record<string, unknown>;

export interface AnalyticsRuntime {
  location?: {
    href: string;
    pathname: string;
  };
  isDesktop?: boolean;
}

export interface BrowserAnalyticsConfig {
  posthogKey?: string;
  posthogHost?: string;
  gaTrackingId?: string;
  mixpanelToken?: string;
  disableOnDesktop?: boolean;
  runtime?: AnalyticsRuntime;
}

export interface BrowserAnalyticsClient {
  readonly enabled: boolean;
  identify(userId: string, traits?: AnalyticsProperties): void;
  track(event: string, properties?: AnalyticsProperties): void;
  page(name: string, properties?: AnalyticsProperties): void;
  revenue(
    amount: number,
    currency?: string,
    properties?: AnalyticsProperties,
  ): void;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    mixpanel?: {
      track: (event: string, properties?: AnalyticsProperties) => void;
      init: (token: string) => void;
    };
    posthog?: {
      init: (apiKey: string, options?: AnalyticsProperties) => void;
      identify: (userId: string, traits?: AnalyticsProperties) => void;
      capture: (event: string, properties?: AnalyticsProperties) => void;
    };
    __TAURI_INTERNALS__?: unknown;
  }
}

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

const browserRuntime = (): AnalyticsRuntime => ({
  location:
    typeof window !== 'undefined'
      ? {
          href: window.location.href,
          pathname: window.location.pathname,
        }
      : undefined,
  isDesktop:
    typeof window !== 'undefined' &&
    (Boolean(window.__TAURI_INTERNALS__) ||
      navigator.userAgent.toLowerCase().includes('electron')),
});

export const shouldDisableAnalytics = (
  config: Pick<BrowserAnalyticsConfig, 'disableOnDesktop' | 'runtime'>,
): boolean => {
  const disableOnDesktop = config.disableOnDesktop ?? true;
  const runtime = config.runtime ?? browserRuntime();
  return disableOnDesktop && Boolean(runtime.isDesktop);
};

export class BrowserAnalytics implements BrowserAnalyticsClient {
  readonly enabled: boolean;
  private readonly runtime: AnalyticsRuntime;

  constructor(config: BrowserAnalyticsConfig = {}) {
    this.runtime = config.runtime ?? browserRuntime();
    this.enabled = !shouldDisableAnalytics(config);
  }

  identify(userId: string, traits?: AnalyticsProperties): void {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }
    window.gtag?.('set', { user_id: userId, ...traits });
    window.posthog?.identify(userId, traits);
  }

  track(event: string, properties?: AnalyticsProperties): void {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }
    window.gtag?.('event', event, properties);
    window.mixpanel?.track(event, properties);
    window.posthog?.capture(event, properties);
  }

  page(name: string, properties?: AnalyticsProperties): void {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }
    window.gtag?.('event', 'page_view', {
      page_title: name,
      page_location: this.runtime.location?.href,
      page_path: this.runtime.location?.pathname,
      ...properties,
    });
    window.posthog?.capture('$pageview', {
      page_title: name,
      page_location: this.runtime.location?.href,
      page_path: this.runtime.location?.pathname,
      ...properties,
    });
  }

  revenue(
    amount: number,
    currency: string = 'USD',
    properties?: AnalyticsProperties,
  ): void {
    this.track('Purchase', {
      value: amount,
      currency,
      ...properties,
    });
  }
}

const appendScript = (src: string): void => {
  if (typeof document === 'undefined') {
    return;
  }
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return;
  }
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const initGoogleAnalytics = (trackingId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  appendScript(`https://www.googletagmanager.com/gtag/js?id=${trackingId}`);
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function (...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  window.gtag('js', new Date());
  window.gtag('config', trackingId);
};

const initMixpanel = (token: string): void => {
  if (typeof document === 'undefined') {
    return;
  }
  if (window.mixpanel) {
    window.mixpanel.init(token);
    return;
  }
  const script = document.createElement('script');
  script.innerHTML = `
    (function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];i="track".split(" ");for(h=0;h<i.length;h++)g(a,i[h]);b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);
  `;
  document.head.appendChild(script);
};

const initPosthog = (apiKey: string, host: string): void => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }
  if (window.posthog == null) {
    appendScript('https://unpkg.com/posthog-js@latest/dist/module.full.no-external.js');
  }
  window.posthog?.init(apiKey, {
    api_host: host,
    capture_pageview: false,
  });
};

export const initAnalytics = (
  config: BrowserAnalyticsConfig = {},
): BrowserAnalyticsClient => {
  const client = new BrowserAnalytics(config);
  if (!client.enabled) {
    return client;
  }

  if (config.gaTrackingId) {
    initGoogleAnalytics(config.gaTrackingId);
  }
  if (config.mixpanelToken) {
    initMixpanel(config.mixpanelToken);
  }
  if (config.posthogKey) {
    initPosthog(config.posthogKey, config.posthogHost ?? DEFAULT_POSTHOG_HOST);
  }

  return client;
};
