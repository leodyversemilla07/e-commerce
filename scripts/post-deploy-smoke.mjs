const webBase = process.env.WEB_BASE_URL || "http://127.0.0.1:3000";
const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:4000";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

function log(...args) {
  console.log("[smoke]", ...args);
}

async function assertFetch(url, options = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  return { ok: response.ok, status: response.status, body, headers: response.headers };
}

function expect(condition, message, payload) {
  if (!condition) {
    console.error("[smoke][FAIL]", message);
    if (payload !== undefined) {
      console.error(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
    }
    process.exit(1);
  }
  log("PASS", message);
}

async function checkApiHealth() {
  const res = await assertFetch(`${apiBase}/health`, { method: "GET" });
  expect(res.status === 200, "API /health returns 200", res);
  expect(res.body?.status === "ok", "API /health payload has status=ok", res.body);
}

async function checkCatalog() {
  const products = await assertFetch(`${apiBase}/products`, { method: "GET" });
  expect(products.status === 200, "API /products returns 200", products);
  expect(Array.isArray(products.body?.items), "API /products body.items is an array", products.body);
  expect(products.body.items.length > 0, "API /products has at least one seeded product", products.body);
}

async function checkWebRoutes() {
  const home = await assertFetch(`${webBase}/`, { method: "GET", headers: { accept: "text/html" } });
  expect(home.status === 200, "Web / returns 200", home.status);

  const products = await assertFetch(`${webBase}/products`, { method: "GET", headers: { accept: "text/html" } });
  expect(products.status === 200, "Web /products returns 200", products.status);

  const adminRedirect = await assertFetch(`${webBase}/admin`, { method: "GET", headers: { accept: "text/html" } });
  expect(
    adminRedirect.status === 307 || adminRedirect.status === 308,
    "Web /admin redirects to login when unauthenticated",
    adminRedirect,
  );
}

async function checkAdminAuthEndpoint() {
  const bad = await assertFetch(`${webBase}/api/admin/auth`, {
    method: "POST",
    body: JSON.stringify({ password: "wrong-password" }),
  });
  expect(bad.status === 401, "Admin auth rejects invalid password", bad);

  const good = await assertFetch(`${webBase}/api/admin/auth`, {
    method: "POST",
    body: JSON.stringify({ password: adminPassword }),
  });
  expect(good.status === 200, "Admin auth accepts configured password", good);
  expect(good.body?.success === true, "Admin auth response indicates success", good.body);
}

async function checkOrdersProxy() {
  const orders = await assertFetch(`${webBase}/api/orders`, { method: "GET" });
  expect(
    orders.status === 200 || orders.status === 401,
    "Web /api/orders returns 200 (guest/fallback) or 401 (strict auth)",
    orders,
  );
}

async function main() {
  log(`Using WEB_BASE_URL=${webBase}`);
  log(`Using API_BASE_URL=${apiBase}`);

  await checkApiHealth();
  await checkCatalog();
  await checkWebRoutes();
  await checkAdminAuthEndpoint();
  await checkOrdersProxy();

  log("All post-deploy smoke checks passed.");
}

main().catch((error) => {
  console.error("[smoke][ERROR]", error);
  process.exit(1);
});
