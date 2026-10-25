import { Body, Controller, Get, Headers, Param, Post, Req, Res } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import type { Request, Response } from "express"
import { getCartIdentity } from '../cart/cart.utils'

import { PaymentsService } from "./payments.service"
import type { ConfirmPaymentIntentPayload, CreatePaymentIntentPayload } from "./payments.types"

type StripeWebhookRequest = Request & {
  rawBody?: Buffer
}

@AllowAnonymous()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('capabilities')
  capabilities() {
    return this.paymentsService.getCapabilities()
  }

  @Post("intents")
  async createIntent(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: CreatePaymentIntentPayload
  ) {
    return this.paymentsService.createCartIntent(getCartIdentity(request, response), body)
  }

  @Post("intents/:paymentIntentId/confirm")
  async confirmIntent(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param("paymentIntentId") paymentIntentId: string,
    @Body() body: ConfirmPaymentIntentPayload
  ) {
    return this.paymentsService.confirmCartIntent(getCartIdentity(request, response), paymentIntentId, body ?? {})
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
