import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey =
      this.configService.get<string>("STRIPE_SECRET_KEY") ||
      (process.env.NODE_ENV === "test" ? "sk_test_dummy_key_for_testing" : undefined);
    if (!secretKey) {
      throw new InternalServerErrorException(
        "STRIPE_SECRET_KEY is not defined in environment",
      );
    }

    this.webhookSecret =
      this.configService.get<string>("STRIPE_WEBHOOK_SECRET") || "";

    this.stripe = new Stripe(secretKey, {
      apiVersion: "2024-06-20" as any,
      appInfo: {
        name: "TheQueue",
      },
    });
  }

  async createPaymentIntent(
    amountCents: number,
    connectedAccountId: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    const feeAmount = Math.round(amountCents * 0.15); // 15% platform fee

    return this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      application_fee_amount: feeAmount,
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata,
    });
  }

  public verifyWebhookSignature(
    payload: string,
    signature: string,
  ): Stripe.Event {
    if (!this.webhookSecret) {
      throw new InternalServerErrorException(
        "STRIPE_WEBHOOK_SECRET not configured",
      );
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }
}
