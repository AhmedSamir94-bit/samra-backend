/**
 * Shared CORS options for Nest (local + Vercel serverless).
 *
 * CORS_ORIGIN:
 * - unset or "*"  → reflect any Origin (recommended for multi-env)
 * - comma list    → allow only those origins
 */
function parseCorsOrigins() {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  if (!raw || raw === '*') {
    return true;
  }

  const list = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return list.length > 0 ? list : true;
}

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Origin',
  'X-Requested-With',
  'x-admin-setup-key',
];

function getCorsOptions() {
  return {
    origin: parseCorsOrigins(),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: ['Content-Disposition'],
    optionsSuccessStatus: 204,
    preflightContinue: false,
  };
}

/**
 * Apply CORS headers immediately (Vercel cold-start / error paths).
 * Reflects the request Origin when possible so credentials stay valid.
 */
function applyCorsHeaders(req, res) {
  const requestOrigin = req.headers && req.headers.origin;
  const configured = parseCorsOrigins();

  let allowOrigin = null;
  if (requestOrigin) {
    if (configured === true) {
      allowOrigin = requestOrigin;
    } else if (Array.isArray(configured) && configured.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    }
  } else if (configured === true) {
    allowOrigin = '*';
  }

  if (!allowOrigin) {
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

module.exports = {
  getCorsOptions,
  applyCorsHeaders,
  ALLOWED_HEADERS,
};
