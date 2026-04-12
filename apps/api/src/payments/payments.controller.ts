import { Body, Controller, Headers, Param, Post, Req } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { PaymentsService } from "./payments.service"
import type { ConfirmPaymentIntentPayload, CreatePaymentIntentPayload } from "./payments.types"

type StripeWebhookRequest = Request & {
  rawBody?: Buffer
}

@AllowAnonymous()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("intents")
  async createIntent(@Body() body: CreatePaymentIntentPayload) {
    return this.paymentsService.createIntent(body)
  }

  @Post("intents/:paymentIntentId/confirm")
  async confirmIntent(
    @Param("paymentIntentId") paymentIntentId: string,
    @Body() body: ConfirmPaymentIntentPayload
  ) {
    return this.paymentsService.confirmIntent(paymentIntentId, body ?? {})
  }

  @Post("webhook")
  async webhook(
    @Headers("stripe-signature") stripeSignature: string | undefined,
    @Req() request: StripeWebhookRequest
  ) {
    return this.paymentsService.handleWebhook(
      stripeSignature ?? "",
      request.rawBody ?? Buffer.from("")
    )
  }
}
