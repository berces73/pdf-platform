const ALLOWED_ORIGINS = [
  "https://pdf-platform.pages.dev",
  // "https://yourdomain.com",
];

export function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";

  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Device-ID",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers":
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  };

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;

    // FIX: Vary ezme, ekle (cache correctness)
    headers["Vary"] = headers["Vary"] ? `${headers["Vary"]}, Origin` : "Origin";
  }

  return headers;
}

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}