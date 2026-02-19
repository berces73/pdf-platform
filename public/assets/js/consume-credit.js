import { openPaywall } from "./paywall.js";

const ENDPOINT = "/api/credits/consume";
const BALANCE_ENDPOINT = "/api/credits/balance"; // yoksa refreshCreditInfo'yu çağırma
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

let isRefreshing = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function fetchWithTimeout(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(t);
    return res;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

function updateCreditDisplay(remaining) {
  const els = document.querySelectorAll("[data-credit-display]");
  els.forEach((el) => {
    el.textContent = String(remaining);
    if (remaining <= 5) el.classList.add("credit-low");
    else el.classList.remove("credit-low");
  });
}

export async function consumeCredit(tool, cost = 1, opId = newOpId()) {
  const deviceId = getOrCreateDeviceId();
  const headers = { "Content-Type": "application/json" };
  if (deviceId) headers["X-Device-ID"] = deviceId;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetchWithTimeout(ENDPOINT, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ tool, cost, opId }),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data?.remainingCredits !== undefined) updateCreditDisplay(data.remainingCredits);
        return true;
      }

      const data = await resp.json().catch(() => ({}));
      const code = data?.error?.code;

      if (resp.status === 402 || code === "CREDIT_EXHAUSTED") {
        window.toast?.("Krediniz bitti.", "warning", 5000);
        openPaywall({ reason: "credits", tier: data?.tier });
        return false;
      }

      if (resp.status === 429 || code === "RATE_LIMITED") {
        const retryAfter = resp.headers.get("Retry-After");
        window.toast?.(`Çok fazla istek. ${retryAfter ? retryAfter + " sn" : "bir süre"} bekleyin.`, "warning", 6000);
        openPaywall({ reason: "rate_limit", retryAfter });
        return false;
      }

      if (resp.status === 409 || code === "OP_PENDING") {
        window.toast?.("İşlem zaten devam ediyor...", "info", 2500);
        return false;
      }

      if (resp.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(600 * (attempt + 1));
        continue;
      }

      console.error("[consume-credit] unexpected", resp.status, data);
      window.toast?.("Bir hata oluştu.", "error", 6000);
      openPaywall({ reason: "error", errorCode: code });
      return false;
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      console.warn("[consume-credit] network/timeout", e);
      window.toast?.("Bağlantı hatası. İnterneti kontrol edin.", "error", 6000);
      openPaywall({ reason: "network" });
      return false;
    }
  }

  openPaywall({ reason: "network" });
  return false;
}

export async function refreshCreditInfo() {
  if (isRefreshing) return null;
  isRefreshing = true;

  try {
    const resp = await fetchWithTimeout(BALANCE_ENDPOINT, { credentials: "include" }, 5000);
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      const credits = data?.credits ?? data?.remainingCredits ?? 0;
      updateCreditDisplay(credits);
      return data;
    }
  } catch (e) {
    console.warn("[consume-credit] refresh failed", e);
  } finally {
    isRefreshing = false;
  }

  return null;
}
