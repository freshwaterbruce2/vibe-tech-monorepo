export interface ApiRootMetadata {
  ok: true;
  app: 'prior-auth-pro';
  service: 'prior-auth-pro-api';
  frontendUrl: string;
  health: '/api/health';
  checkout: '/api/billing/demo-checkout';
}

/** Builds the API root payload shown when the Railway service host is opened directly. */
export function buildApiRootMetadata(frontendUrl: string): ApiRootMetadata {
  return {
    ok: true,
    app: 'prior-auth-pro',
    service: 'prior-auth-pro-api',
    frontendUrl,
    health: '/api/health',
    checkout: '/api/billing/demo-checkout',
  };
}
