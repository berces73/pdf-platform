function utcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function checkRateLimit(clientId, env) {
  const windowSec = parseInt(env.RATE_LIMIT_WINDOW_SEC || "3600", 10);
  const maxReqs = parseInt(env.RATE_LIMIT_MAX || "120", 10);
  const key = `rl::${clientId}`;

  const raw = await env.USAGE_KV.get(key, { type: "json" });
  const now = Math.floor(Date.now() / 1000);

  let count = 1;
  let windowStart = now;

  if (raw) {
    const { c, s } = raw;
    if (now - s < windowSec) {
      count = c + 1;
      windowStart = s;
    }
  }

  const reset = windowStart + windowSec;
  const limited = count > maxReqs;
  const remaining = Math.max(0, maxReqs - count);

  const writePromise = limited
    ? null
    : env.USAGE_KV.put(key, JSON.stringify({ c: count, s: windowStart }), {
        expirationTtl: windowSec,
      });

  return {
    limited,
    count,
    remaining,
    limit: maxReqs,
    reset,
    headers: {
      "X-RateLimit-Limit": String(maxReqs),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(reset),
    },
    writePromise,
  };
}

export async function getDailyUsage(clientId, env) {
  const dateKey = utcDateKey();
  const key = `credits::${clientId}::${dateKey}`;
  const raw = await env.CREDIT_KV.get(key, { type: "json" });
  return { used: raw?.used ?? 0, key, dateKey };
}

export async function setDailyUsage(key, used, env) {
  await env.CREDIT_KV.put(key, JSON.stringify({ used }), {
    expirationTtl: 172800,
  });
}
