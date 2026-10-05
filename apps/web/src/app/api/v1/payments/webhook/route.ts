import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/payment-settlement";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { message: "Missing Stripe signature", code: "INVALID_SIGNATURE" },
      { status: 400 },
    );
  }

  try {
    const payload = await request.text();
    const result = await handleStripeWebhook(payload, signature);
    return NextResponse.json({ received: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook rejected";
    const invalidSignature = message.toLowerCase().includes("signature");
    return NextResponse.json(
      {
        message: invalidSignature ? "Invalid Stripe signature" : "Webhook processing failed",
        code: invalidSignature ? "INVALID_SIGNATURE" : "WEBHOOK_FAILED",
      },
      { status: invalidSignature ? 400 : 500 },
    );
  }
}
