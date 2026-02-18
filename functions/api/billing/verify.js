import Stripe from "stripe";
import { json, error } from "../../_utils/response.js";

export async function onRequestGet({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return error("CONFIG_MISSING", "STRIPE_SECRET_KEY is not set", 500, {}, request);
  }
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return error("BAD_REQUEST", "Missing session_id", 400, {}, request);
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    return error("STRIPE_RETRIEVE_FAILED", "Could not retrieve session", 502, {}, request);
  }

  // subscription checkout için beklenen: status=complete (ve/veya payment_status)
  const ok =
    session?.status === "complete" ||
    session?.payment_status === "paid";

  return json(
    {
      ok: true,
      verified: Boolean(ok),
      status: session?.status,
      payment_status: session?.payment_status,
      customer: session?.customer,
      subscription: session?.subscription,
      metadata: session?.metadata || {},
    },
    200,
    {},
    request
  );
}
