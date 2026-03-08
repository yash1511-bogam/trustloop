import Stripe from "stripe";

const globalForStripe = globalThis as unknown as {
  stripeClient?: Stripe;
};

function requiredValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Stripe billing.`);
  }
  return value;
}

export function stripeClient(): Stripe {
  if (globalForStripe.stripeClient) {
    return globalForStripe.stripeClient;
  }

  const client = new Stripe(requiredValue("STRIPE_SECRET_KEY"));
  if (process.env.NODE_ENV !== "production") {
    globalForStripe.stripeClient = client;
  }

  return client;
}

export function stripePriceIdForPlan(plan: string): string {
  if (plan === "starter") {
    return requiredValue("STRIPE_PRICE_ID_STARTER");
  }
  if (plan === "enterprise") {
    return requiredValue("STRIPE_PRICE_ID_ENTERPRISE");
  }
  return requiredValue("STRIPE_PRICE_ID_PRO");
}

export function verifyStripeWebhookEvent(input: {
  rawBody: string;
  signature: string | null;
}): Stripe.Event {
  if (!input.signature) {
    throw new Error("Missing Stripe-Signature header.");
  }

  const webhookSecret = requiredValue("STRIPE_WEBHOOK_SECRET");
  return stripeClient().webhooks.constructEvent(
    input.rawBody,
    input.signature,
    webhookSecret,
  );
}
