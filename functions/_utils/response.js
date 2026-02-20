// FILE: functions/_utils/response.js
import { getCorsHeaders } from "./cors.js";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export function json(data, status = 200, extraHeaders = {}, request = null) {
  const headers = {
    ...BASE_HEADERS,
    ...(request ? getCorsHeaders(request) : {}),
    ...extraHeaders,
  };

  const body =
    data && typeof data === "object" && !Array.isArray(data) && !("ok" in data)
      ? { ok: true, ...data }
      : data;

  return new Response(JSON.stringify(body), { status, headers });
}

export function error(
  code,
  message,
  status = 400,
  extra = {},
  request = null,
  extraHeaders = {}
) {
  const body = { ok: false, error: { code, message }, ...extra };
  return json(body, status, extraHeaders, request);
}
