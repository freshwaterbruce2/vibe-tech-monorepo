/**
 * Verifies Bearer vibe_sk_<app>_<token> API keys.
 * In production, keys can be listed in VIBE_GATEWAY_CLIENT_KEYS (comma-separated),
 * or MASTER_GATEWAY_KEY for internal service-to-service calls.
 */
export function createAuthMiddleware({
  allowedKeys = process.env.VIBE_GATEWAY_CLIENT_KEYS ? process.env.VIBE_GATEWAY_CLIENT_KEYS.split(',').map((k) => k.trim()) : [],
  masterKey = process.env.MASTER_GATEWAY_KEY || '',
} = {}) {
  const keysSet = new Set(allowedKeys.filter(Boolean));
  if (masterKey) {
    keysSet.add(masterKey);
  }

  return function authenticate(req, res, next) {
    // Exclude health/probe routes from auth
    if (req.path === '/health' || req.path === '/api/health' || req.path === '/') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({
        error: {
          message: 'Missing Authorization header. Expected Bearer vibe_sk_...',
          type: 'authentication_error',
        },
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        error: {
          message: 'Invalid Authorization header format. Expected Bearer token.',
          type: 'authentication_error',
        },
      });
    }

    const token = parts[1].trim();

    // If no keys configured in local dev, allow vibe_sk_dev* tokens
    if (keysSet.size === 0) {
      if (token.startsWith('vibe_sk_') || token.startsWith('sk-')) {
        req.clientId = token.split('_')[2] || 'default-dev';
        return next();
      }
      return res.status(401).json({
        error: {
          message: 'Invalid API key format. Must start with vibe_sk_.',
          type: 'authentication_error',
        },
      });
    }

    if (!keysSet.has(token)) {
      return res.status(401).json({
        error: {
          message: 'Invalid or unauthorized Vibe Gateway API key.',
          type: 'authentication_error',
        },
      });
    }

    // Extract client name if token is vibe_sk_<client>_<random>
    const match = token.match(/^vibe_sk_([a-zA-Z0-9]+)_/);
    req.clientId = match ? match[1] : 'vibe-authorized-client';
    return next();
  };
}
