// public/assets/js/consume-credit.js
import { openPaywall } from "./paywall.js";

// ================================
// API Configuration
// ================================
const PRIMARY_API_BASE = "https://api.pdf-platform.com";
const FALLBACK_API_BASE = "https://pdf-platform-api.mehmetkant217.workers.dev";

const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

let isRefreshing = false;

// ================================
// Helper Functions
// ================================
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function newOpId() {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
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

// ✅ TLS/Network detection (CORS removed)
function isNetworkOrTlsError(err) {
  const msg = String(err?.message || err || "");
  return (
    /failed to fetch|networkerror|network request failed/i.test(msg) ||
    /certificate|ssl|tls|sni/i.test(msg)
  );
}

function updateCreditDisplay(remaining) {
  const els = document.querySelectorAll("[data-credit-display]");
  els.forEach((el) => {
    el.textContent = String(remaining);
    if (remaining <= 5) el.classList.add("credit-low");
    else el.classList.remove("credit-low");
  });
}

// ================================
// API Base Manager
// ================================
class ApiBaseManager {
  constructor() {
    this.override = this.getStoredBase();
    this.current = this.override || PRIMARY_API_BASE;
    this.checked = false;
    this.lastCheckTime = 0;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
  }

  getStoredBase() {
    try {
      const v = localStorage.getItem("API_BASE");
      if (v && /^https:\/\/[a-z0-9.-]+/i.test(v)) return v.replace(/\/+$/, "");
    } catch {}
    return null;
  }

  isUserOverridden() {
    return !!this.override;
  }

  shouldRecheck() {
    return !this.checked || (Date.now() - this.lastCheckTime > this.checkInterval);
  }

  // ✅ Always probe PRIMARY to recover from fallback
  async ensureReady() {
    // Refresh override (user may change it at runtime)
    this.override = this.getStoredBase();
    if (this.override) {
      this.current = this.override;
      this.checked = true;
      return this.current;
    }

    if (!this.shouldRecheck()) return this.current;

    // ✅ Probe PRIMARY WITHOUT credentials (avoid silent cookie identity side effects)
    const probe = async () => {
      const resp = await fetchWithTimeout(
        `${PRIMARY_API_BASE}/api/credits/status`,
        {
          method: "GET",
          credentials: "omit", // 🔴 important
          headers: { "Accept": "application/json" },
        },
        4000
      );
      void resp; // any response means TLS/DNS works
    };

    try {
      await probe();
      this.current = PRIMARY_API_BASE;
      this.checked = true;
      this.lastCheckTime = Date.now();
      return this.current;
    } catch (e) {
      if (isNetworkOrTlsError(e)) {
        console.warn("[API] PRIMARY unreachable. Using fallback.");
        this.current = FALLBACK_API_BASE;
        this.checked = true;
        this.lastCheckTime = Date.now();
      }
      return this.current;
    }
  }

  switchToFallback() {
    if (this.current !== FALLBACK_API_BASE && !this.isUserOverridden()) {
      console.warn("[API] Switching to fallback");
      this.current = FALLBACK_API_BASE;
      this.checked = true;
      this.lastCheckTime = Date.now();
    }
  }

  getCurrent() {
    return this.current;
  }

  getEndpoints() {
    return {
      consume: `${this.current}/api/credits/consume`,
      status: `${this.current}/api/credits/status`,
    };
  }
}

const apiManager = new ApiBaseManager();

// ================================
// Main API Functions
// ================================
export async function consumeCredit(tool, cost = 1, opId = newOpId()) {
  await apiManager.ensureReady();

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { consume } = apiManager.getEndpoints();

      const resp = await fetchWithTimeout(
        consume,
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ tool, cost, opId }),
        },
        TIMEOUT_MS
      );

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data?.remaining !== undefined) updateCreditDisplay(data.remaining);
        return true;
      }

      const data = await resp.json().catch(() => ({}));
      const code = data?.error?.code;
      const message = data?.error?.message;

      if (resp.status === 402 || code === "CREDIT_EXHAUSTED") {
        window.toast?.("Krediniz bitti.", "warning", 5000);
        openPaywall({ reason: "credits", tier: data?.tier, resetAt: data?.resetAt });
        return false;
      }

      if (resp.status === 429 || code === "RATE_LIMITED") {
        const retryAfter = resp.headers.get("Retry-After");
        const waitTime = retryAfter ? `${retryAfter} saniye` : "bir süre";
        window.toast?.(`Çok fazla istek. ${waitTime} bekleyin.`, "warning", 6000);
        openPaywall({ reason: "rate_limit", retryAfter });
        return false;
      }

      if (resp.status === 409) {
        if (code === "OP_PENDING") {
          window.toast?.("İşlem devam ediyor...", "info", 3000);
          return false;
        }
        if (code === "OP_MISMATCH") {
          window.toast?.("İşlem kimliği uyumsuz.", "error", 6000);
          openPaywall({ reason: "op_mismatch" });
          return false;
        }
      }

      if (resp.status === 401) {
        window.toast?.("Oturum süresi dolmuş. Lütfen giriş yapın.", "error", 5000);
        setTimeout(() => {
          window.location.href =
            "/login.html?redirect=" + encodeURIComponent(window.location.pathname);
        }, 1500);
        return false;
      }

      if (resp.status >= 500 && attempt < MAX_RETRIES) {
        console.warn(`[consume-credit] 5xx error, retrying (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(1000 * (attempt + 1));
        continue;
      }

      console.error("[consume-credit] Unexpected error:", resp.status, data);
      window.toast?.(message || "Bir hata oluştu.", "error", 6000);
      openPaywall({ reason: "error", errorCode: code });
      return false;
    } catch (e) {
      if (isNetworkOrTlsError(e)) {
        console.warn("[consume-credit] Network/TLS error:", e.message);

        if (apiManager.getCurrent() === PRIMARY_API_BASE && attempt === 0) {
          console.warn("[consume-credit] Switching to fallback");
          apiManager.switchToFallback();
          continue;
        }
      }

      if (attempt < MAX_RETRIES) {
        console.warn(`[consume-credit] Retrying (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(1000 * (attempt + 1));
        continue;
      }

      console.error("[consume-credit] All retries failed:", e);
      window.toast?.("Bağlantı hatası. İnternet bağlantınızı kontrol edin.", "error", 6000);
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
    await apiManager.ensureReady();
    const { status } = apiManager.getEndpoints();

    const resp = await fetchWithTimeout(
      status,
      {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" },
      },
      5000
    );

    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      const credits = data?.remaining ?? 0;
      updateCreditDisplay(credits);
      return data;
    }

    if (resp.status === 401) return null;

    console.warn("[consume-credit] Refresh failed:", resp.status);
  } catch (e) {
    if (isNetworkOrTlsError(e)) {
      console.warn("[consume-credit] Refresh TLS/Network error");
      if (apiManager.getCurrent() === PRIMARY_API_BASE) {
        apiManager.switchToFallback();

        try {
          const { status } = apiManager.getEndpoints();
          const resp = await fetchWithTimeout(
            status,
            { method: "GET", credentials: "include" },
            5000
          );

          if (resp.ok) {
            const data = await resp.json().catch(() => ({}));
            const credits = data?.remaining ?? 0;
            updateCreditDisplay(credits);
            return data;
          }
        } catch (retryErr) {
          console.warn("[consume-credit] Fallback refresh failed:", retryErr);
        }
      }
    } else {
      console.warn("[consume-credit] Refresh error:", e);
    }
  } finally {
    isRefreshing = false;
  }

  return null;
}

// Auto-refresh on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", refreshCreditInfo, { once: true });
} else {
  refreshCreditInfo();
}
