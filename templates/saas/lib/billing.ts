// Stripe Checkout integration. Requires STRIPE_SECRET_KEY, which is
// production/payment configuration — per docs/security-model.md § Human
// approval gates, this is never generated or set automatically; a human
// must supply it before billing routes can actually be exercised.
import Stripe from "stripe";

let client: Stripe | undefined;

function getClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Billing requires a human to configure production payment credentials.",
    );
  }
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

export async function createCheckoutSession(input: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getClient();
  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
  });
}

/**
 * One-time payment checkout (skills/ecommerce), as opposed to
 * `createCheckoutSession`'s subscription mode. Takes cart line items
 * directly — build them from `@hermes/ecommerce`'s `Cart` (see
 * skills/ecommerce/SKILL.md), converting `unitPrice`/`quantity` into
 * Stripe's cents-based `unit_amount`.
 */
export async function createOneTimeCheckoutSession(input: {
  lineItems: { name: string; unitAmountCents: number; quantity: number }[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  currency?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getClient();
  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: input.lineItems.map((item) => ({
      price_data: {
        currency: input.currency ?? "usd",
        product_data: { name: item.name },
        unit_amount: item.unitAmountCents,
      },
      quantity: item.quantity,
    })),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
  });
}
