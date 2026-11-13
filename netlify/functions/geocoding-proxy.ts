import type { Handler } from '@netlify/functions';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT =
  'ThereYetApp/1.1 (https://thereyetapp.com; family location app)';

// Nominatim public API policy: max 1 request per second.
const MIN_INTERVAL_MS = 1000;
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;
const CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOWED_ENDPOINTS = ['/search', '/reverse', '/status.php'];

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const responseCache = new Map<
  string,
  { status: number; body: string; contentType: string; expires: number }
>();

let lastNominatimRequestAt = 0;
let requestChain: Promise<void> = Promise.resolve();

function getClientIp(event: {
  headers: Record<string, string | undefined>;
}): string {
  const forwarded = event.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return event.headers['x-real-ip'] || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
  };
}

async function waitForNominatimSlot(): Promise<void> {
  const run = requestChain.then(async () => {
    const wait = lastNominatimRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastNominatimRequestAt = Date.now();
  });
  // Keep the chain going even if a waiter fails
  requestChain = run.then(
    () => undefined,
    () => undefined
  );
  await run;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const ip = getClientIp(event);
  if (!checkRateLimit(ip)) {
    return jsonResponse(
      429,
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: 60,
      },
      { 'Retry-After': '60' }
    );
  }

  const path = event.path
    .replace('/.netlify/functions/geocoding-proxy', '')
    .replace('/api/geocoding', '');

  const endpoint = path.split('?')[0];
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return jsonResponse(400, { error: 'Invalid endpoint' });
  }

  const cacheKey = `${path}?${event.rawQuery || ''}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return {
      statusCode: cached.status,
      body: cached.body,
      headers: {
        'Content-Type': cached.contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300',
        'X-Geocoding-Cache': 'HIT',
      },
    };
  }

  try {
    await waitForNominatimSlot();

    const nominatimUrl = `${NOMINATIM_BASE_URL}${path}${
      event.rawQuery ? `?${event.rawQuery}` : ''
    }`;

    const response = await fetch(nominatimUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });

    const data = await response.text();
    const contentType =
      response.headers.get('content-type') || 'application/json';

    if (response.status === 200) {
      responseCache.set(cacheKey, {
        status: response.status,
        body: data,
        contentType,
        expires: Date.now() + CACHE_TTL_MS,
      });
    }

    return {
      statusCode: response.status,
      body: data,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control':
          response.status === 200 ? 'public, max-age=300' : 'no-cache',
        'X-Geocoding-Cache': 'MISS',
      },
    };
  } catch (error) {
    console.error('Proxy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, {
      error: 'Failed to fetch geocoding data',
      message,
    });
  }
};
