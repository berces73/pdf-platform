import { CreditCounter } from "./src/CreditCounter.js";
export { CreditCounter };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return handleOptions(request, env);

    if (request.method === "POST" && url.pathname === "/api/credits/consume") {
      return handleConsume(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/credits/status") {
      return handleStatus(request, env);
    }

    return jsonErr("NOT_FOUND", "Not found", 404, request, env);
  },
};

// POST /api/credits/consume
async function handleConsume(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return jsonErr("BAD_REQUEST", "Invalid JSON", 400, request, env); }

  const tool = normalizeTool(body?.tool);
  const cost = Number.isInteger(body?.cost) ? body.cost : 1;
  const opId = safeOpId(body?.opId);

  if (!tool) return jsonErr("INVALID_TOOL", "Unknown or missing tool", 400, request, env);
  if (!Number.isInteger(cost) || cost < 1 || cost > 10)
    return jsonErr("INVALID_COST", "Cost must be an integer 1-10", 400, request, env);
  if (!opId) return jsonErr("INVALID_OP", "opId must be 10-64 [a-zA-Z0-9_-]", 400, request, env);

  const ident = await identify(request, env);
  if (!ident) return jsonErr("MISCONFIGURED", "CLIENT_ID_SECRET not set", 500, request, env);

  const { clientId, tier, setCookie } = ident;

  const doId = env.CREDIT_COUNTER.idFromName(clientId);
  const stub = env.CREDIT_COUNTER.get(doId);

  const doResp = await stub.fetch("https://internal/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, cost, opId, tier }),
  });

  const data = await doResp.json();
  return json(data, doResp.status, request, env, setCookie ? { "Set-Cookie": setCookie } : null);
}

// GET /api/credits/status
async function handleStatus(request, env) {
  const ident = await identify(request, env);
  if (!ident) return jsonErr("MISCONFIGURED", "CLIENT_ID_SECRET not set", 500, request, env);

  const { clientId, tier, setCookie } = ident;

  const freeCap = parseInt(env.FREE_DAILY_CREDITS || "20", 10);
  const proCap = parseInt(env.PRO_DAILY_CREDITS || "9999", 10);
  const limit = tier === "pro" ? proCap : freeCap;

  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  const resetAt = d.getTime();

  const doId = env.CREDIT_COUNTER.idFromName(clientId);
  const stub = env.CREDIT_COUNTER.get(doId);

  let used = 0;
  try { used = Number((await (await stub.fetch("https://internal/status")).json())?.used ?? 0) || 0; }
  catch { return jsonErr("INTERNAL_ERROR", "Status check failed", 500, request, env); }

  const data = { ok: true, tier, used, remaining: Math.max(0, limit - used), limit, resetAt };
  return json(data, 200, request, env, setCookie ? { "Set-Cookie": setCookie } : null);
}

// identify: single signed cookie + pro bearer key
async function identify(request, env) {
  if (!env.CLIENT_ID_SECRET) return null;

  const auth = (request.headers.get("Authorization") ?? "").trim();
  const isPro = env.PRO_API_KEY && auth.startsWith("Bearer ") && timingSafeEqual(auth.slice(7), env.PRO_API_KEY);
  const tier = isPro ? "pro" : "free";

  const cookies = parseCookies(request.headers.get("Cookie") ?? "");
  const packed = cookies["__cid"] ?? null;

  if (packed) {
    const dot = packed.indexOf(".");
    if (dot > 0) {
      const cid = packed.slice(0, dot);
      const sig = packed.slice(dot + 1);
      const valid = await verifyHmac(cid, sig, env.CLIENT_ID_SECRET);
      if (valid) return { clientId: cid, tier, setCookie: null };
    }
  }

  const cid = crypto.randomUUID();
  const sig = await signHmac(cid, env.CLIENT_ID_SECRET);

  const cookieOpts = "Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=None";
  const setCookie = `__cid=${cid}.${sig}; ${cookieOpts}`;
  return { clientId: cid, tier, setCookie };
}

// CORS (cookies used, so no "*")
function getAllowOrigin(request, env) {
  const allowed = (env.ALLOWED_ORIGIN ?? "").trim();
  if (!allowed) return null;
  const origin = request.headers.get("Origin") ?? "";
  const list = allowed.split(",").map((s) => s.trim()).filter(Boolean);
  if (list.includes(origin)) return origin;
  return list[0] || null;
}

function corsHeaders(request, env, extra = {}) {
  const allow = getAllowOrigin(request, env);
  const base = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...extra,
  };
  if (allow) base["Access-Control-Allow-Origin"] = allow;
  return base;
}

function handleOptions(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function json(obj, status, request, env, extraHeaders = null) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: corsHeaders(request, env, {
      "Content-Type": "application/json",
      ...(extraHeaders ?? {}),
    }),
  });
}

function jsonErr(code, message, status, request, env) {
  return json({ ok: false, error: { code, message } }, status, request, env);
}

// Crypto helpers
async function signHmac(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64url(new Uint8Array(buf));
}

async function verifyHmac(message, signature, secret) {
  try {
    const expected = await signHmac(message, secret);
    return timingSafeEqual(expected, signature);
  } catch {
    return false;
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Validation helpers
const VALID_TOOLS = new Set([
  "merge","compress","split","convert","watermark",
  "rotate","unlock","protect","extract","reorder",
]);

const TOOL_MAP = {
  "pdf-birlestir":"merge",
  "pdf-sikistir":"compress",
  "pdf-bol":"split",
  "pdf-to-jpg":"convert",
  "jpg-to-pdf":"convert",
  "pdf-dondur":"rotate",
  "sayfa-sil":"extract",
  "sayfa-sirala":"reorder",
  "pdf-kilitle":"protect",
  "qr-kod-ekle":"watermark",
};

function normalizeTool(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim().toLowerCase();
  const canonical = TOOL_MAP[v] ?? v;
  return VALID_TOOLS.has(canonical) ? canonical : null;
}

function safeOpId(opId) {
  if (typeof opId !== "string") return null;
  const v = opId.trim();
  if (v.length < 10 || v.length > 64) return null;
  if (!/^[a-zA-Z0-9\-_]+$/.test(v)) return null;
  return v;
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}
