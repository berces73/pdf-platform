// FILE: functions/_utils/auth.js

async function sha256Short(str) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(String(str)));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseCookies(cookieHeader = "") {
  const out = {};
  for (const part of String(cookieHeader).split(";")) {
    const p = part.trim();
    if (!p) continue;
    const i = p.indexOf("=");
    const k = (i === -1 ? p : p.slice(0, i)).trim();
    if (!k) continue;
    const v = i === -1 ? "" : p.slice(i + 1).trim();
    out[k] = safeDecode(v);
  }
  return out;
}

// Cache pro token set (safe: invalidates if env string changes)
let _proTokenCacheKey = null;
let _proTokenCacheSet = null;

function getProTokenSet(env) {
  const key = String(env.PRO_BEARER_TOKENS || "");
  if (_proTokenCacheSet && _proTokenCacheKey === key) return _proTokenCacheSet;

  _proTokenCacheKey = key;
  _proTokenCacheSet = new Set(
    key.split(",").map((t) => t.trim()).filter(Boolean)
  );
  return _proTokenCacheSet;
}

function isProToken(token, env) {
  return getProTokenSet(env).has(token);
}

export async function identify(request, env) {
  const authHeader = request.headers.get("Authorization") || "";

  // 1) Bearer token
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && isProToken(token, env)) {
      return { clientId: `pro:${await sha256Short(token)}`, tier: "pro" };
    }
    if (token) {
      // Unknown bearer is still a stable identity, but NOT pro.
      return { clientId: `bearer:${await sha256Short(token)}`, tier: "free" };
    }
  }

  // 2) Device ID (header or cookie)
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const deviceId = request.headers.get("X-Device-ID") || cookies.__did || null;

  if (deviceId) {
    return { clientId: `dev:${await sha256Short(deviceId)}`, tier: "free" };
  }

  // 3) fallback IP + UA (UA adds stability against NAT collisions)
  const ipHdr =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  const ip = String(ipHdr).split(",")[0].trim() || "unknown";
  const ua = request.headers.get("User-Agent") || "unknown";

  const hash = await sha256Short(`${ip}|${ua}`);
  return { clientId: `ip:${hash}`, tier: "free" };
}
