import type { Handler } from '@netlify/functions';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'AreWeThereYetApp/1.0 (https://thereyetapp.com)';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 1 request per second on average
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(ip: string): string {
  return `rate-limit:${ip}`;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = getRateLimitKey(ip);
  const record = requestCounts.get(key);

  if (!record || now > record.resetTime) {
    requestCounts.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

export const handler: Handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  // Extract IP for rate limiting
  const ip =
    event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';

  // Check rate limit
  if (!checkRateLimit(ip)) {
    return {
      statusCode: 429,
      body: JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: 60,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': '60',
      },
    };
  }

  // Extract the path after /api/geocoding/
  const path = event.path
    .replace('/.netlify/functions/geocoding-proxy', '')
    .replace('/api/geocoding', '');

  // Validate the endpoint
  const allowedEndpoints = ['/search', '/reverse', '/status.php'];
  const endpoint = path.split('?')[0];

  if (!allowedEndpoints.includes(endpoint)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid endpoint' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  try {
    // Build the Nominatim URL
    const nominatimUrl = `${NOMINATIM_BASE_URL}${path}${event.rawQuery ? `?${event.rawQuery}` : ''}`;

    // Make the request to Nominatim
    const response = await fetch(nominatimUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    });

    // Get the response body
    const data = await response.text();

    // Return the response with CORS headers
    return {
      statusCode: response.status,
      body: data,
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control':
          response.status === 200 ? 'public, max-age=300' : 'no-cache',
      },
    };
  } catch (error) {
    console.error('Proxy error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch geocoding data',
        message: error.message,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};
