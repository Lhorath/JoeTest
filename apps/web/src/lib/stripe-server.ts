import Stripe from "stripe";
import { isDevFixturesEnabled } from "./runtime-mode";

export function allowMockPayments(): boolean {
  return isDevFixturesEnabled() && !process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (process.env.NODE_ENV === "production" && !secretKey.startsWith("sk_live_")) {
    throw new Error("Production requires a live Stripe secret key");
  }
  return new Stripe(secretKey, {
    apiVersion: "2024-06-20" as any,
    appInfo: { name: "TheQueue" },
  });
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (process.env.NODE_ENV === "production") {
    if (!secret.startsWith("whsec_") || secret.length < 20) {
      throw new Error("A rotated Stripe webhook signing secret is required");
    }
  }
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

/** Server-authoritative price. The client never supplies the amount. */
export async function createPriorityPaymentIntent(input: {
  amountCents: number;
  connectedAccountId: string;
  submissionId: string;
  liveSessionId: string;
  tierSnapshotId: string;
  userId: string;
}): Promise<{ paymentIntentId: string; clientSecret: string }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50) {
    throw new Error("Station tier price is not payable");
  }
  if (!input.connectedAccountId.startsWith("acct_")) {
    throw new Error("Host Stripe account is not connected");
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: "usd",
    application_fee_amount: Math.round(input.amountCents * 0.15),
    transfer_data: { destination: input.connectedAccountId },
    metadata: {
      submissionId: input.submissionId,
      liveSessionId: input.liveSessionId,
      tierSnapshotId: input.tierSnapshotId,
      userId: input.userId,
    },
  });

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a payment client secret");
  }
  return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
}

export async function createConnectOnboardingLink(input: {
  email: string;
  userId: string;
  existingAccountId?: string | null;
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ accountId: string; url: string; expiresAt: string }> {
  const stripe = getStripe();
  let accountId = input.existingAccountId || "";
  const reusable =
    accountId.startsWith("acct_") &&
    !accountId.startsWith("acct_live_") &&
    !accountId.startsWith("acct_test_") &&
    !accountId.includes("kvibe") &&
    !accountId.includes("aura") &&
    !accountId.includes("metro");

  if (!reusable) {
    const account = await stripe.accounts.create({
      type: "express",
      email: input.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { userId: input.userId },
    });
    accountId = account.id;
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: input.refreshUrl,
    return_url: input.returnUrl,
    type: "account_onboarding",
  });

  return {
    accountId,
    url: link.url,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}
