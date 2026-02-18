async function sha256Short(str) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k.trim(), v.join("=").trim()])
  );
}

export async function identify(request, env) {
  const authHeader = request.headers.get("Authorization") || "";

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && isProToken(token, env)) {
      return { clientId: `pro:${await sha256Short(token)}`, tier: "pro" };
    }
    return { clientId: `bearer:${await sha256Short(token)}`, tier: "free" };
  }

  const deviceId =
    request.headers.get("X-Device-ID") ||
    parseCookies(request.headers.get("Cookie") || "").__did ||
    null;

  if (deviceId) {
    return { clientId: `dev:${await sha256Short(deviceId)}`, tier: "free" };
  }

  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";
  const ua = request.headers.get("User-Agent") || "unknown";
  const hash = await sha256Short(`${ip}|${ua}`);
  return { clientId: `ip:${hash}`, tier: "free" };
}

function isProToken(token, env) {
  return (env.PRO_BEARER_TOKENS || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .includes(token);
}
