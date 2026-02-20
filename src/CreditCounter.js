export class CreditCounter {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/consume") return this.#consume(request);
    if (request.method === "GET"  && url.pathname === "/status")  return this.#status();

    return this.#json({ ok: false, error: { code: "NOT_FOUND", message: "Not found" } }, 404);
  }

  async #consume(request) {
    let body;
    try { body = await request.json(); }
    catch { return this.#json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, 400); }

    const { tool, cost, opId, tier } = body ?? {};

    if (typeof tool !== "string" || !tool)
      return this.#json({ ok: false, error: { code: "INVALID_TOOL", message: "Missing tool" } }, 400);

    if (!Number.isInteger(cost) || cost < 1 || cost > 10)
      return this.#json({ ok: false, error: { code: "INVALID_COST", message: "Cost must be 1-10" } }, 400);

    if (typeof opId !== "string" || opId.length < 10 || opId.length > 64 || !/^[a-zA-Z0-9\-_]+$/.test(opId))
      return this.#json({ ok: false, error: { code: "INVALID_OP", message: "Invalid opId" } }, 400);

    if (tier !== "free" && tier !== "pro")
      return this.#json({ ok: false, error: { code: "INVALID_TIER", message: "Invalid tier" } }, 400);

    const today = this.#todayUTC();
    const yesterday = this.#daysAgoUTC(1);

    const freeCap = parseInt(this.env.FREE_DAILY_CREDITS || "20", 10);
    const proCap  = parseInt(this.env.PRO_DAILY_CREDITS  || "9999", 10);
    const limit = tier === "pro" ? proCap : freeCap;
    const resetAt = this.#nextMidnightUTC();

    const opKey = `op::${today}::${opId}`;
    const usageKey = `usage::${today}`;

    let result = null;
    let status = 200;

    await this.state.storage.transaction(async (txn) => {
      // Bounded cleanup: delete some of yesterday keys once per day
      const cleanedKey = `cleanup::${today}`;
      const cleaned = await txn.get(cleanedKey);
      if (!cleaned) {
        await txn.put(cleanedKey, 1);
        const prefix = `op::${yesterday}::`;
        const keys = await txn.list({ prefix, limit: 256 });
        if (keys.size) await txn.delete([...keys.keys()]);
        await txn.delete([`usage::${yesterday}`, `cleanup::${yesterday}`]);
      }

      const seen = await txn.get(opKey);
      if (seen) {
        if ((seen.tool && seen.tool !== tool) || (seen.cost && seen.cost !== cost)) {
          result = { ok: false, error: { code: "OP_MISMATCH", message: "opId reused with different params" } };
          status = 409;
          return;
        }
        result = this.#strip(seen);
        status = seen.ok ? 200 : (seen._status ?? 402);
        return;
      }

      const used = (await txn.get(usageKey)) ?? 0;
      const newUsed = used + cost;

      if (newUsed > limit) {
        const fail = {
          ok: false,
          error: { code: "CREDIT_EXHAUSTED", message: "Daily credit limit reached" },
          used,
          remaining: 0,
          limit, tier, tool, cost,
          resetAt,
          timestamp: Date.now(),
          _status: 402,
        };
        await txn.put(opKey, fail);
        result = this.#strip(fail);
        status = 402;
        return;
      }

      const ok = {
        ok: true,
        used: newUsed,
        remaining: limit - newUsed,
        limit, tier, tool, cost,
        resetAt,
        timestamp: Date.now(),
      };

      await txn.put(usageKey, newUsed);
      await txn.put(opKey, ok);

      result = ok;
      status = 200;
    });

    return this.#json(result, status);
  }

  async #status() {
    const today = this.#todayUTC();
    const used = (await this.state.storage.get(`usage::${today}`)) ?? 0;
    return this.#json({ ok: true, used }, 200);
  }

  #strip(obj) {
    if (obj && typeof obj === "object" && "_status" in obj) {
      const { _status, ...clean } = obj;
      return clean;
    }
    return obj;
  }

  #todayUTC() { return new Date().toISOString().slice(0, 10); }
  #daysAgoUTC(n) { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
  #nextMidnightUTC() { const d = new Date(); d.setUTCHours(24,0,0,0); return d.getTime(); }

  #json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  }
}
