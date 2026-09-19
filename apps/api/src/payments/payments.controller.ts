import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from "@nestjs/common";
import { Request, Response } from "express";
import { StripeService } from "./stripe.service";
import { WebhooksService } from "./webhooks.service";
import { PublicRoute } from "../auth/decorators/auth.decorators";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @PublicRoute()
  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }

    if (!req.rawBody) {
      throw new BadRequestException("Missing raw body");
    }

    let event;
    try {
      event = this.stripeService.verifyWebhookSignature(
        req.rawBody.toString(),
        signature,
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await this.webhooksService.processEvent(event, req.rawBody.toString());
      res.json({ received: true });
    } catch (err: any) {
      // Return 200 even on processing failure to avoid Stripe disabling the webhook endpoint if it's our internal error.
      // We will track the failure state in the PaymentProviderEvent record for retries.
      return res
        .status(200)
        .send(`Webhook processed with internal errors: ${err.message}`);
    }
  }
}
