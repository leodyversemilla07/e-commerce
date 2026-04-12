-- Add durable payment intent linkage to orders
ALTER TABLE "Order"
  ADD COLUMN "paymentIntentId" TEXT;

-- Unique index allows many NULLs but enforces unique non-null payment intent IDs
CREATE UNIQUE INDEX "Order_paymentIntentId_key" ON "Order"("paymentIntentId");
CREATE INDEX "Order_paymentIntentId_idx" ON "Order"("paymentIntentId");

-- Idempotency/event log table for payment webhooks
CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "processing" BOOLEAN NOT NULL DEFAULT false,
  "processingAt" TIMESTAMP(3),
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");
CREATE INDEX "PaymentWebhookEvent_provider_idx" ON "PaymentWebhookEvent"("provider");
CREATE INDEX "PaymentWebhookEvent_eventType_idx" ON "PaymentWebhookEvent"("eventType");
CREATE INDEX "PaymentWebhookEvent_processing_idx" ON "PaymentWebhookEvent"("processing");
