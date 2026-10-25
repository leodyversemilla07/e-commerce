import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const apiDir = fileURLToPath(new URL('../', import.meta.url))
const dbName = `integration-${process.pid}.sqlite`
const file = resolve(apiDir, dbName)
const url = `file:./${dbName}`
const port = await new Promise((resolvePort, reject) => {
  const listener = createServer()
  listener.once('error', reject)
  listener.listen(0, '127.0.0.1', () => {
    const address = listener.address()
    listener.close(() => resolvePort(address.port))
  })
})
const base = `http://127.0.0.1:${port}`
const adminSecret = 'sqlite-integration-secret-longer-than-32-characters'
const env = {
  ...process.env,
  DB_PROVIDER: 'sqlite', SQLITE_DATABASE_URL: url, DATABASE_URL: url,
  ADMIN_API_SECRET: adminSecret, PORT: String(port), PAYMENT_PROVIDER: 'mock', RESEND_API_KEY: '',
  BETTER_AUTH_SECRET: 'sqlite-integration-secret-for-better-auth-over-32-chars',
  BETTER_AUTH_URL: base,
}

function run(file, args) {
  const result = spawnSync(process.execPath, [resolve(apiDir, file), ...args], {
    cwd: apiDir, env, stdio: 'inherit',
  })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `${file} failed`)
}

async function call(path, options = {}, expected = 200) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
  })
  const body = await response.json().catch(() => null)
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(body)}`)
  return { body, response }
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('SQLite integration is local-only')
  let server
  try {
    rmSync(file, { force: true })
    run('scripts/sqlite.mjs', ['setup'])
    run('scripts/sqlite.mjs', ['seed'])
    run('node_modules/@nestjs/cli/bin/nest.js', ['build'])

    server = spawn(process.execPath, [resolve(apiDir, 'dist/src/main.js')], {
      cwd: apiDir, env, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let logs = ''
    server.stdout.on('data', (data) => { logs += String(data) })
    server.stderr.on('data', (data) => { logs += String(data) })
    let ready = false
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(`API exited early:\n${logs}`)
      try {
        const response = await fetch(`${base}/health`)
        if (response.ok) { ready = true; break }
      } catch { /* waiting for startup */ }
      await sleep(200)
    }
    if (!ready) throw new Error(`API did not start:\n${logs}`)

    const email = `sqlite-${Date.now()}@example.com`
    const signedUp = await call('/api/auth/sign-up/email', {
      method: 'POST', headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ name: 'SQLite User', email, password: 'temporary-test-password-123' }),
    })
    assert.equal(signedUp.body.user.email, email)
    const sessionCookie = signedUp.response.headers.getSetCookie()
      .find((value) => value.includes('session_token='))?.split(';')[0]
    assert.ok(sessionCookie, 'Expected Better Auth to issue a session cookie')
    const session = await call('/api/auth/get-session', { headers: { cookie: sessionCookie } })
    assert.equal(session.body.user.email, email)

    const catalog = await call('/products')
    const product = catalog.body.items.find((item) => item.stock >= 2 && item.priceInCents > 0)
    assert.ok(product, 'Expected a seeded in-stock product')
    await call('/admin/products', {}, 401)

    const added = await call('/cart/items', {
      method: 'POST', body: JSON.stringify({ productId: product.id, quantity: 1 }),
    }, 201)
    const cookie = added.response.headers.getSetCookie().find((value) => value.startsWith('guest_cart_id='))?.split(';')[0]
    assert.ok(cookie, 'Expected a guest-cart cookie')
    const headers = { cookie }
    const signedInHeaders = { cookie: `${cookie}; ${sessionCookie}` }
    const subtotal = product.priceInCents
    const total = subtotal + Math.round(subtotal * 0.05)

    await call('/payments/intents', {
      method: 'POST', headers, body: JSON.stringify({ amountInCents: 1 }),
    }, 400)
    const intent = await call('/payments/intents', {
      method: 'POST', headers, body: JSON.stringify({ amountInCents: total, shippingMethod: 'standard' }),
    }, 201)
    assert.equal(intent.body.cartId, added.body.id)
    const confirmed = await call(`/payments/intents/${intent.body.id}/confirm`, {
      method: 'POST', headers, body: '{}',
    }, 201)
    assert.equal(confirmed.body.status, 'succeeded')

    const payload = {
      customerEmail: 'sqlite-test@example.com', customerName: 'SQLite Buyer',
      shippingAddressLine1: '1 Test Street', city: 'Test City', province: 'Test Province', postalCode: '1000',
      paymentMethod: 'card', paymentIntentId: intent.body.id,
    }
    const order = await call('/checkout/create-order', { method: 'POST', headers, body: JSON.stringify(payload) }, 201)
    assert.equal(order.body.status, 'CONFIRMED')
    assert.equal(order.body.totalInCents, total)
    const catalogAfter = await call(`/products/${product.slug}`)
    assert.equal(catalogAfter.body.stock, product.stock - 1)
    const history = await call('/orders', { headers })
    assert.ok(history.body.items.some((item) => item.id === order.body.id))
    await call(`/orders/${order.body.id}`, {}, 404)
    await call(`/admin/orders/${order.body.id}/status`, {
      method: 'PATCH', headers: { 'x-admin-api-key': adminSecret },
      body: JSON.stringify({ status: 'CANCELLED' }),
    }, 400)

    await call('/cart/items', { method: 'POST', headers: signedInHeaders, body: JSON.stringify({ productId: product.id, quantity: 1 }) }, 201)
    const cod = await call('/checkout/create-order', { method: 'POST', headers: signedInHeaders,
      body: JSON.stringify({ ...payload, paymentMethod: 'cod', paymentIntentId: undefined }),
    }, 201)
    assert.equal(cod.body.status, 'PENDING')
    const accountOrders = await call('/orders', { headers: { cookie: sessionCookie } })
    assert.ok(accountOrders.body.items.some((item) => item.id === cod.body.id), 'Signed-in user should own the order')
    assert.equal((await call(`/products/${product.slug}`)).body.stock, product.stock - 2)
    await call(`/admin/orders/${cod.body.id}/status`, {
      method: 'PATCH', headers: { 'x-admin-api-key': adminSecret },
      body: JSON.stringify({ status: 'CANCELLED' }),
    }, 200)
    assert.equal((await call(`/products/${product.slug}`)).body.stock, product.stock - 1)
    console.log('SQLite HTTP integration passed: sessions, admin guard, cart, payment, checkout, cancellation, stock and ownership')
  } finally {
    if (server) {
      server.kill()
      if (server.exitCode === null) {
        await Promise.race([new Promise((resolve) => server.once('exit', resolve)), sleep(3000)])
      }
    }
    for (const extension of ['', '-shm', '-wal']) rmSync(`${file}${extension}`, { force: true })
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
