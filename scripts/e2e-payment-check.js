// Mock-provider smoke test. Requires at least one active, in-stock product.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4000"

if (process.env.PAYMENT_PROVIDER === 'stripe') {
  console.error('This mock payment smoke script cannot safely test live Stripe charges.')
  process.exit(1)
}

let cookie = ''

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  })
  const guestCookie = response.headers.getSetCookie().find((value) => value.startsWith('guest_cart_id='))
  if (guestCookie) cookie = guestCookie.split(';')[0]
  const text = await response.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { ok: response.ok, status: response.status, body }
}

async function main() {
  const catalog = await request('/products')
  if (!catalog.ok) throw new Error(`Catalog failed: ${catalog.status}`)
  const product = catalog.body.items?.find((item) => item.stock > 0 && item.priceInCents > 0)
  if (!product) throw new Error('No in-stock product available for smoke test')

  const cart = await request('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
  })
  if (!cart.ok) throw new Error(`Add to cart failed: ${JSON.stringify(cart)}`)
  const subtotal = product.priceInCents
  const total = subtotal + Math.round(subtotal * 0.05)

  const intent = await request('/payments/intents', {
    method: 'POST',
    body: JSON.stringify({ amountInCents: total, currency: 'PHP', method: 'card', shippingMethod: 'standard' }),
  })
  if (!intent.ok) throw new Error(`Create intent failed: ${JSON.stringify(intent)}`)
  if (intent.body.amountInCents !== total || intent.body.cartId !== cart.body.id) {
    throw new Error('Intent is not bound to the priced cart')
  }

  const confirm = await request(`/payments/intents/${encodeURIComponent(intent.body.id)}/confirm`, {
    method: 'POST', body: '{}',
  })
  if (!confirm.ok || confirm.body.status !== 'succeeded') {
    throw new Error(`Confirm intent failed: ${JSON.stringify(confirm)}`)
  }

  const webhook = await request('/payments/webhook', {
    method: 'POST', body: JSON.stringify({ type: 'payment_intent.succeeded' }),
  })
  if (webhook.status !== 400) throw new Error(`Expected missing webhook signature to fail: ${JSON.stringify(webhook)}`)
  console.log('Mock payment smoke checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
