import { handleOptions } from "../../_utils/cors.js";
import { json, error } from "../../_utils/response.js";
import { identify } from "../../_utils/auth.js";
import { checkRateLimit, getDailyUsage, setDailyUsage } from "../../_utils/usage.js";

const VALID_TOOLS = new Set([
  "merge", "compress", "split", "convert", "watermark",
  "rotate", "unlock", "protect", "extract", "reorder",
]);

function safeOpId(opId) {
  if (typeof opId !== "string") return null;
  const v = opId.trim();
  if (!v || v.length > 64) return null;
  return v;
}

export async function onRequestPost({ request, env, ctx }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body", 400, {}, request);
  }

  const tool = body?.tool;
  const cost = Number(body?.cost ?? 1);
  const opId = safeOpId(body?.opId);

  if (!tool || !VALID_TOOLS.has(tool)) {
    return error("INVALID_TOOL", "Unknown or missing tool", 400, {}, request);
  }
  if (!Number.isInteger(cost) || cost < 1 || cost > 10) {
    return error("INVALID_COST", "Cost must be an integer between 1 and 10", 400, {}, request);
  }
  if (!opId) {
    return error("INVALID_OP", "Missing or invalid opId", 400, {}, request);
  }

  const { clientId, tier } = await identify(request, env);

  const rl = await checkRateLimit(clientId, env);
  if (rl.writePromise) ctx.waitUntil(rl.writePromise);

  if (rl.limited) {
    return error("RATE_LIMITED", "Too many requests", 429, {}, request, rl.headers);
  }

  const opKey = `op::${clientId}::${opId}`;
  const seen = await env.CREDIT_KV.get(opKey, { type: "json" });

  if (seen) {
    if (seen.pending === true) {
      return error("OP_PENDING", "Operation already in progress", 409, {}, request, rl.headers);
    }
    if (seen.ok === true) {
      const { _status, ...cleanBody } = seen;
      return json(cleanBody, 200, rl.headers, request);
    }
    if (seen.ok === false) {
      const { _status, ...cleanBody } = seen;
      return json(cleanBody, _status ?? 402, rl.headers, request);
    }
  }

  await env.CREDIT_KV.put(opKey, JSON.stringify({ pending: true }), {
    expirationTtl: 30,
  });

  const freeCap = parseInt(env.FREE_DAILY_CREDITS ?? "3", 10);
  const proCap = parseInt(env.PRO_DAILY_CREDITS ?? "9999", 10);
  const limit = tier === "pro" ? proCap : freeCap;

  const { used, key: usageKey } = await getDailyUsage(clientId, env);
  const newUsed = used + cost;

  if (newUsed > limit) {
    const failBody = {
      ok: false,
      error: { code: "CREDIT_EXHAUSTED", message: "Daily credit limit reached" },
      remaining: 0,
      limit,
      tier,
      tool,
      cost,
    };

    await env.CREDIT_KV.put(opKey, JSON.stringify({ _status: 402, ...failBody }), {
      expirationTtl: 86400,
    });

    return json(failBody, 402, rl.headers, request);
  }

  const okBody = {
    ok: true,
    remaining: limit - newUsed,
    limit,
    tier,
    tool,
    cost,
  };

  // opKey sonucu await (409 false-positive azaltır)
  await env.CREDIT_KV.put(opKey, JSON.stringify(okBody), { expirationTtl: 86400 });

  // sayaç yazımı async
  ctx.waitUntil(setDailyUsage(usageKey, newUsed, env));

  return json(okBody, 200, rl.headers, request);
}

export async function onRequestOptions({ request }) {
  return handleOptions(request);
}