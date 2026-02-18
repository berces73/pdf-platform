import Stripe from "stripe";
import { json, error } from "../../_utils/response.js";
import { identify } from "../../_utils/auth.js";

// Basit plan seçici (ileride genişlet)
// body.plan: "pro_monthly" | "pro_yearly"
function resolvePriceId(env, plan) {
  // Yeni env yapısı önerisi:
  // STRIPE_PRICE_ID_PRO_MONTHLY, STRIPE_PRICE_ID_PRO_YEARLY
  if (plan === "pro_yearly") return env.STRIPE_PRICE_ID_PRO_YEARLY || env.STRIPE_PRICE_ID;
  return env.STRIPE_PRICE_ID_PRO_MONTHLY || env.STRIPE_PRICE_ID; // default monthly
}

function safePlan(plan) {
  if (plan === "pro_yearly") return "pro_yearly";
  return "pro_monthly";
}

function safeStripeErr(err) {
  // StripeError tipleri (card_error, invalid_request_error, auth_error vb.)
  const type = err?.type || "stripe_error";
  const code = err?.code || "STRIPE_ERROR";
  const msg = err?.message || "Stripe request failed";
  // kullanıcıya sızdırılabilir hataları sınırlı tut
  return { type, code, message: msg };
}

export async function onRequestPost({ request, env }) {
  // Config checks
  if (!env.BILLING_KV) {
    return error("CONFIG_MISSING", "BILLING_KV binding is not set", 500, {}, request);
  }
  if (!env.STRIPE_SECRET_KEY) {
    return error("CONFIG_MISSING", "STRIPE_SECRET_KEY is not set", 500, {}, request);
  }
  if (!env.STRIPE_PRICE_ID && !env.STRIPE_PRICE_ID_PRO_MONTHLY && !env.STRIPE_PRICE_ID_PRO_YEARLY) {
    return error("CONFIG_MISSING", "Stripe price id is not set", 500, {}, request);
  }

  // Body (plan seçimi için)
  let body = {};
  try {
    // boş body gelirse patlamasın
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const plan = safePlan(body?.plan);
  const priceId = resolvePriceId(env, plan);
  if (!priceId) {
    return error("CONFIG_MISSING", "PriceId could not be resolved", 500, {}, request);
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  // Identity
  const ident = await identify(request, env);
  const clientId = ident?.clientId;

  if (!clientId || typeof clientId !== "string" || clientId.length < 5) {
    return error("NO_CLIENT", "Could not identify client", 400, {}, request);
  }

  // (Opsiyonel) zaten pro ise checkout açma:
  // Eğer ileride webhook ile pro::clientId yazacaksan burada kontrol edebilirsin.
  // const isPro = await env.BILLING_KV.get(`pro::${clientId}`);
  // if (isPro) return json({ ok: true, alreadyPro: true }, 200, {}, request);

  const appUrl = env.APP_URL || "https://pdf-platform.pages.dev";

  // Customer resolution with lock to reduce race
  const custKey = `stripeCustomer::${clientId}`;
  const lockKey = `lock::stripeCustomer::${clientId}`;

  let customerId = await env.BILLING_KV.get(custKey);

  if (!customerId) {
    // acquire short lock (best-effort)
    const existingLock = await env.BILLING_KV.get(lockKey);
    if (existingLock) {
      // başka bir request customer oluşturuyor → kısa bekleme yerine hızlı retry mesajı
      return error("BUSY", "Please retry in a moment", 409, {}, request);
    }

    await env.BILLING_KV.put(lockKey, "1", { expirationTtl: 30 });

    try {
      // double-check after lock
      customerId = await env.BILLING_KV.get(custKey);
      if (!customerId) {
        let customer;
        try {
          customer = await stripe.customers.create({
            metadata: { clientId },
          });
        } catch (err) {
          const se = safeStripeErr(err);
          return error("STRIPE_CUSTOMER_CREATE_FAILED", se.message, 502, { stripe: { type: se.type, code: se.code } }, request);
        }

        customerId = customer.id;
        await env.BILLING_KV.put(custKey, customerId);
      }
    } finally {
      // lock TTL ile zaten düşer; delete best-effort
      try { await env.BILLING_KV.delete(lockKey); } catch {}
    }
  }

  // Create checkout session
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel.html`,
      metadata: { clientId, plan },
      subscription_data: { metadata: { clientId, plan } },
    });
  } catch (err) {
    const se = safeStripeErr(err);
    return error("STRIPE_CHECKOUT_FAILED", se.message, 502, { stripe: { type: se.type, code: se.code } }, request);
  }

  return json(
    { ok: true, url: session.url, plan },
    200,
    {},
    request
  );
}
