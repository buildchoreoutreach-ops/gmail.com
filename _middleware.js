/**
 * Optional Cloudflare Pages password gate.
 * Set SITE_PASSWORD as a Production secret in Cloudflare Pages settings.
 * The browser's built-in HTTP Basic Auth prompt is used; the username is ignored.
 * Do not deploy the site publicly without setting SITE_PASSWORD.
 */
function constantTimeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}

export async function onRequest({ request, env, next }) {
  const expectedPassword = env.SITE_PASSWORD;
  if (!expectedPassword) {
    return new Response(
      'Site password is not configured. Set SITE_PASSWORD before publishing.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }
    );
  }

  const header = request.headers.get('Authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const raw = atob(header.slice(6).trim());
      const decoded = new TextDecoder().decode(Uint8Array.from(raw, char => char.charCodeAt(0)));
      const separator = decoded.indexOf(':');
      const suppliedPassword = separator >= 0 ? decoded.slice(separator + 1) : '';
      if (separator >= 0 && constantTimeEqual(suppliedPassword, expectedPassword)) {
        const response = await next();
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'private, no-store');
        headers.set('Vary', 'Authorization');
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      }
    } catch (_) {
      // Malformed credentials are treated as an authentication failure.
    }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Gmail", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
