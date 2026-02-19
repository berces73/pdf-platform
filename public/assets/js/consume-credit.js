import { openPaywall } from "./paywall.js";

const ENDPOINT = "/api/credits/consume";

function getOrCreateDeviceId() {
  try {
    let did = localStorage.getItem("__did");
    if (!did) {
      did = crypto.randomUUID();
      localStorage.setItem("__did", did);
    }
    return did;
  } catch {
    return null;
  }
}

export function newOpId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export async function consumeCredit(tool, cost = 1, opId = newOpId()) {
  const deviceId = getOrCreateDeviceId();
  const headers = { "Content-Type": "application/json" };
  if (deviceId) headers["X-Device-ID"] = deviceId;

  let resp;
  try {
    resp = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ tool, cost, opId }),
    });
  } catch (err) {
    console.warn("[consumeCredit] network error:", err);
    openPaywall({ reason: "network" });
    return false;
  }

  if (resp.ok) return true;

  const data = await resp.json().catch(() => ({}));
  const code = data?.error?.code;

  if (resp.status === 402 || code === "CREDIT_EXHAUSTED") {
    openPaywall({ reason: "credits", tier: data.tier });
    return false;
  }

  if (resp.status === 429 || code === "RATE_LIMITED") {
    openPaywall({ reason: "rate_limit" });
    return false;
  }

  if (resp.status === 409 || code === "OP_PENDING") {
    // sessiz false: kullanıcı tekrar denesin / UI "işleniyor" gösterebilir
    console.warn("[consumeCredit] duplicate op ignored");
    return false;
  }

  console.error("[consumeCredit] unexpected error", resp.status, data);
  openPaywall({ reason: "error" });
  return false;
}