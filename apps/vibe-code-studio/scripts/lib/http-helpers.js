/**
 * Shared HTTP primitives for the Vibe Code Studio companion backend:
 * cookie parse/serialize and JSON body reading. Extracted from backend-server.js
 * to keep route modules small and the server file under the size cap.
 */

export function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

export function serializeCookie(name, val, options = {}) {
  let str = `${name}=${encodeURIComponent(val)}`;
  if (options.maxAge != null) {
    str += `; Max-Age=${options.maxAge}`;
  }
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.path) str += `; Path=${options.path}`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) str += '; HttpOnly';
  if (options.secure) str += '; Secure';
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}

/**
 * Read and JSON-parse the request body. On invalid JSON, sends a 400 response
 * and returns null so the caller can bail (`if (!body) return;`).
 */
export async function readJsonBody(getBody, res) {
  const bodyStr = await getBody();
  try {
    return JSON.parse(bodyStr);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return null;
  }
}
