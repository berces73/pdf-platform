// ============================================================
// pdf-platform-api — Worker + Durable Object Credit System
//
// wrangler.toml:
//   binding : CREDIT_COUNT
//   class   : CreditCounter
//
// Routes:
//   GET  /api/credits/status
//   POST /api/credits/consume   body: { tool, opId }
//   POST /api/credits/refund    body: { tool, opId }
//   GET  /api/credits/history?days=7
//
// DO internal routes:
//   GET  https://do/status?clientId=...&tier=...
//   POST https://do/consume
//   POST https://do/refund
//   GET  https://do/history?clientId=...&days=...
// ============================================================

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
function corsHeaders(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "").trim();

  const base = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-ID",
    "Access-Control-Expose-Headers":
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (!origin) return base; // server-to-server

  if (!allowed || origin === allowed) {
    return { ...base, "Access-Control-Allow-Origin": origin };
  }

  // Origin var ama izinli değil: CORS header yok -> browser bloklar
  return base;
}

function jsonResp(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// identify (REAL): Authorization Bearer + deviceId + cookie + IP fallback
// ─────────────────────────────────────────────────────────────
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

// pro token cache (env değişirse otomatik yeniler)
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

async function identify(request, env) {
  const authHeader = request.headers.get("Authorization") || "";

  // 1) Bearer token
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      if (isProToken(token, env)) {
        return { clientId: `pro:${await sha256Short(token)}`, tier: "pro" };
      }
      return { clientId: `bearer:${await sha256Short(token)}`, tier: "free" };
    }
  }

  // 2) Device ID: header veya cookie (__did)
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const deviceId = request.headers.get("X-Device-ID") || cookies.__did || null;

  if (deviceId) {
    return { clientId: `dev:${await sha256Short(deviceId)}`, tier: "free" };
  }

  // 3) Fallback: IP
  const ipHdr =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  const ip = String(ipHdr).split(",")[0].trim() || "unknown";
  const hash = await sha256Short(ip);

  return { clientId: `ip:${hash}`, tier: "free" };
}

// ─────────────────────────────────────────────────────────────
// VALID_TOOLS: TOOL_COSTS env'den türetiliyor
// ─────────────────────────────────────────────────────────────
function validToolsFromEnv(env) {
  try {
    const costs = JSON.parse(env.TOOL_COSTS ?? "{}");
    const keys = Object.keys(costs);
    if (keys.length > 0) return new Set(keys);
  } catch {}
  return new Set([
    "merge",
    "compress",
    "split",
    "convert",
    "watermark",
    "rotate",
    "unlock",
    "protect",
    "extract",
    "reorder",
  ]);
}

function safeOpId(opId) {
  if (typeof opId !== "string") return null;
  const v = opId.trim();
  if (!v || v.length > 64 || !/^[\w-]+$/.test(v)) return null;
  return v;
}

// ─────────────────────────────────────────────────────────────
// DO internal secret header
// ─────────────────────────────────────────────────────────────
function makeDoHeaders(env) {
  return {
    "Content-Type": "application/json",
    "X-Internal-Secret": env.INTERNAL_SECRET ?? "",
  };
}

async function proxyDo(doResp, request, env) {
  const body = await doResp.text();
  const h = new Headers(doResp.headers);
  for (const [k, v] of Object.entries(corsHeaders(request, env))) h.set(k, v);
  h.set("Content-Type", "application/json");
  h.set("Cache-Control", "no-store");
  return new Response(body, { status: doResp.status, headers: h });
}

// ─────────────────────────────────────────────────────────────
// MAIN WORKER ROUTER
// ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const VALID_TOOLS = validToolsFromEnv(env);

    // GET /api/credits/status
    if (request.method === "GET" && url.pathname === "/api/credits/status") {
      const { clientId, tier } = await identify(request, env);
      const stub = env.CREDIT_COUNT.get(env.CREDIT_COUNT.idFromName(clientId));

      const doResp = await stub.fetch(
        `https://do/status?clientId=${encodeURIComponent(clientId)}&tier=${encodeURIComponent(tier)}`,
        { headers: makeDoHeaders(env) }
      );

      return proxyDo(doResp, request, env);
    }

    // POST /api/credits/consume
    if (request.method === "POST" && url.pathname === "/api/credits/consume") {
      const input = await request.json().catch(() => null);
      const tool = input?.tool;
      const opId = safeOpId(input?.opId);

      if (!tool || !VALID_TOOLS.has(tool)) {
        return jsonResp(
          { ok: false, error: { code: "INVALID_TOOL", message: "Unknown or missing tool" } },
          400,
          corsHeaders(request, env)
        );
      }
      if (!opId) {
        return jsonResp(
          { ok: false, error: { code: "INVALID_OP", message: "Missing or invalid opId" } },
          400,
          corsHeaders(request, env)
        );
      }

      const { clientId, tier } = await identify(request, env);
      const stub = env.CREDIT_COUNT.get(env.CREDIT_COUNT.idFromName(clientId));

      const doResp = await stub.fetch("https://do/consume", {
        method: "POST",
        headers: makeDoHeaders(env),
        body: JSON.stringify({ clientId, tier, tool, opId }),
      });

      return proxyDo(doResp, request, env);
    }

    // POST /api/credits/refund
    if (request.method === "POST" && url.pathname === "/api/credits/refund") {
      const input = await request.json().catch(() => null);
      const tool = input?.tool;
      const opId = safeOpId(input?.opId);

      if (!tool || !VALID_TOOLS.has(tool)) {
        return jsonResp(
          { ok: false, error: { code: "INVALID_TOOL", message: "Unknown or missing tool" } },
          400,
          corsHeaders(request, env)
        );
      }
      if (!opId) {
        return jsonResp(
          { ok: false, error: { code: "INVALID_OP", message: "Missing or invalid opId" } },
          400,
          corsHeaders(request, env)
        );
      }

      const { clientId, tier } = await identify(request, env);
      const stub = env.CREDIT_COUNT.get(env.CREDIT_COUNT.idFromName(clientId));

      const doResp = await stub.fetch("https://do/refund", {
        method: "POST",
        headers: makeDoHeaders(env),
        body: JSON.stringify({ clientId, tier, tool, opId }),
      });

      return proxyDo(doResp, request, env);
    }

    // GET /api/credits/history?days=
    if (request.method === "GET" && url.pathname === "/api/credits/history") {
      const { clientId, tier } = await identify(request, env);
      const days = url.searchParams.get("days") ?? "7";

      const stub = env.CREDIT_COUNT.get(env.CREDIT_COUNT.idFromName(clientId));
      const doResp = await stub.fetch(
        `https://do/history?clientId=${encodeURIComponent(clientId)}&days=${encodeURIComponent(days)}`,
        { headers: makeDoHeaders(env) }
      );

      return proxyDo(doResp, request, env);
    }

    return jsonResp(
      { ok: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
      corsHeaders(request, env)
    );
  },
};

// ─────────────────────────────────────────────────────────────
// Durable Object: CreditCounter
// ─────────────────────────────────────────────────────────────
export class CreditCounter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this._costs = null;
  }

  _todayKey(offsetHours = 0) {
    const d = new Date(Date.now() + offsetHours * 3600 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  _caps(tier) {
    const freeCap = parseInt(this.env.FREE_DAILY_CREDITS ?? "20", 10);
    const proCap = parseInt(this.env.PRO_DAILY_CREDITS ?? "200", 10);
    return tier === "pro" ? proCap : freeCap;
  }

  _rateCfg() {
    const limit = parseInt(this.env.RATE_LIMIT_PER_MIN ?? "60", 10);
    const windowSec = parseInt(this.env.RATE_LIMIT_WINDOW_SEC ?? "60", 10);
    return { limit, windowSec };
  }

  _getCosts() {
    if (this._costs) return this._costs;
    try {
      this._costs = JSON.parse(this.env.TOOL_COSTS ?? "{}");
    } catch {
      this._costs = {};
    }
    return this._costs;
  }

  _toolCost(tool) {
    const costs = this._getCosts();
    const n = Number(costs?.[tool] ?? 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  _json(body, status = 200, extra = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
    });
  }

  _checkSecret(request) {
    const expected = this.env.INTERNAL_SECRET ?? "";
    if (!expected) return true; // dev
    return request.headers.get("X-Internal-Secret") === expected;
  }

  async fetch(request) {
    if (!this._checkSecret(request)) {
      return this._json({ ok: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, 403);
    }

    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    if (method === "GET" && pathname === "/status") return this._status(url);
    if (method === "POST" && pathname === "/consume") return this._consume(request);
    if (method === "POST" && pathname === "/refund") return this._refund(request);
    if (method === "GET" && pathname === "/history") return this._history(url);

    return this._json({ ok: false, error: { code: "NOT_FOUND" } }, 404);
  }

  async _status(url) {
    const clientId = url.searchParams.get("clientId");
    const tier = url.searchParams.get("tier") ?? "free";
    if (!clientId) {
      return this._json({ ok: false, error: { code: "BAD_REQUEST", message: "clientId required" } }, 400);
    }

    const day = this._todayKey();
    const cap = this._caps(tier);
    const used = (await this.state.storage.get(`used::${clientId}::${day}`)) ?? 0;

    return this._json({ ok: true, remaining: Math.max(0, cap - used), limit: cap, tier, used, day });
  }

  async _consume(request) {
    const { clientId, tier, tool, opId } = await request.json().catch(() => ({}));
    if (!clientId || !opId || !tool) {
      return this._json(
        { ok: false, error: { code: "BAD_REQUEST", message: "clientId, tool, opId required" } },
        400
      );
    }

    const cost = this._toolCost(tool);
    const { limit, windowSec } = this._rateCfg();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSec) * windowSec;
    const rlKey = `rl::${clientId}::${windowStart}`;
    const opKey = `op::${clientId}::${opId}`;

    return await this.state.storage.transaction(async (tx) => {
      // Idempotency first (does not consume RL)
      const seen = await tx.get(opKey);
      if (seen) return this._json(seen.body, seen.status);

      // Rate limit
      const cur = (await tx.get(rlKey)) ?? 0;
      const next = cur + 1;

      const rlHeaders = {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(Math.max(0, limit - next)),
        "X-RateLimit-Reset": String(windowStart + windowSec),
      };

      if (next > limit) {
        rlHeaders["Retry-After"] = String(Math.max(1, windowStart + windowSec - now));
        return this._json(
          { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests" } },
          429,
          rlHeaders
        );
      }

      await tx.put(rlKey, next, { expirationTtl: windowSec + 5 });

      // Daily credits
      const day = this._todayKey();
      const cap = this._caps(tier);
      const usedKey = `used::${clientId}::${day}`;
      const used = (await tx.get(usedKey)) ?? 0;
      const newUsed = used + cost;

      if (newUsed > cap) {
        // CREDIT_EXHAUSTED => opKey write yok (kredi alıp tekrar denenebilsin)
        return this._json(
          {
            ok: false,
            error: { code: "CREDIT_EXHAUSTED", message: "Daily credit limit reached" },
            remaining: Math.max(0, cap - used),
            limit: cap,
            tier,
            tool,
            cost,
          },
          402,
          rlHeaders
        );
      }

      await tx.put(usedKey, newUsed, { expirationTtl: 2 * 86400 });

      const body = { ok: true, remaining: cap - newUsed, limit: cap, tier, tool, cost };
      await tx.put(opKey, { status: 200, body }, { expirationTtl: 2 * 86400 });

      return this._json(body, 200, rlHeaders);
    });
  }

  async _refund(request) {
    const { clientId, tier, tool, opId } = await request.json().catch(() => ({}));
    if (!clientId || !opId || !tool) {
      return this._json(
        { ok: false, error: { code: "BAD_REQUEST", message: "clientId, tool, opId required" } },
        400
      );
    }

    const cost = this._toolCost(tool);

    return await this.state.storage.transaction(async (tx) => {
      const opKey = `op::${clientId}::${opId}`;
      const cached = await tx.get(opKey);

      if (!cached || cached.status !== 200) {
        return this._json(
          { ok: false, error: { code: "NOT_FOUND", message: "No successful operation found for this opId" } },
          404
        );
      }

      const day = this._todayKey();
      const usedKey = `used::${clientId}::${day}`;
      const used = (await tx.get(usedKey)) ?? 0;
      const newUsed = Math.max(0, used - cost);

      await tx.put(usedKey, newUsed, { expirationTtl: 2 * 86400 });
      await tx.delete(opKey);

      return this._json({ ok: true, refunded: cost, tool, tier, newUsed });
    });
  }

  async _history(url) {
    const clientId = url.searchParams.get("clientId");
    const days = Math.min(parseInt(url.searchParams.get("days") ?? "7", 10), 30);

    if (!clientId) {
      return this._json({ ok: false, error: { code: "BAD_REQUEST", message: "clientId required" } }, 400);
    }

    const history = {};
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      const d = new Date(now - i * 86400 * 1000);
      const dayKey = [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, "0"),
        String(d.getUTCDate()).padStart(2, "0"),
      ].join("");

      history[dayKey] = (await this.state.storage.get(`used::${clientId}::${dayKey}`)) ?? 0;
    }

    return this._json({ ok: true, clientId, history });
  }
}
