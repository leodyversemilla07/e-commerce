import { parseWebServerEnv } from '@workspace/env/web'

export function adminApiBase(): string {
  return parseWebServerEnv(process.env).BETTER_AUTH_URL
}

export function adminApiHeaders(): Record<string, string> {
  return { 'x-admin-api-key': parseWebServerEnv(process.env).ADMIN_API_SECRET }
}

// Server components use this helper; browser components use the authenticated BFF route.
export async function adminServerFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('x-admin-api-key', adminApiHeaders()['x-admin-api-key'] ?? '')
  return fetch(`${adminApiBase()}/admin/${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  })
}
