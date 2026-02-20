// FILE: functions/_utils/cors.js

const ALLOWED_ORIGINS = [
  "https://pdf-platform.pages.dev",
  // "https://yourdomain.com",
];

export function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";

  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Device-ID",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers":
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    "Vary": "Origin",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
