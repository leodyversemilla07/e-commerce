const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4000"

function pretty(value) {
  return JSON.stringify(value, null, 2)
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  })

  const body = await response.text()
  let parsed = null
  try {
    parsed = body ? JSON.parse(body) : null
  } catch {
    parsed = body
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  }
}

async function main() {
  console.log("Running payment endpoint smoke checks against", baseUrl)

  const intent = await request("/payments/intents", {
    method: "POST",
    body: JSON.stringify({ amountInCents: 12345, currency: "PHP", method: "card" }),
  })

  if (!intent.ok) {
    console.error("create intent failed", pretty(intent))
    process.exit(1)
  }

  console.log("create intent OK", pretty(intent.body))

  const confirm = await request(`/payments/intents/${intent.body.id}/confirm`, {
    method: "POST",
    body: JSON.stringify({}),
  })

  if (!confirm.ok) {
    console.error("confirm intent failed", pretty(confirm))
    process.exit(1)
  }

  console.log("confirm intent OK", pretty(confirm.body))

  const webhookMissingSig = await fetch(`${baseUrl}/payments/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "payment_intent.succeeded" }),
  })

  const webhookBody = await webhookMissingSig.text()
  console.log("webhook missing signature status", webhookMissingSig.status, webhookBody)

  if (webhookMissingSig.status !== 400) {
    console.error("expected 400 for missing stripe-signature header")
    process.exit(1)
  }

  console.log("All smoke checks passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
