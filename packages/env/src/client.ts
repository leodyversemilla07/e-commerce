import { z } from 'zod';

// Browser-only entry: do not import server schemas or read server environment variables here.
export const publicClientSchema = z.object({
  NEXT_PUBLIC_AUTH_BASE_URL: z.string().trim().url(),
});

export function parsePublicEnv(raw: { NEXT_PUBLIC_AUTH_BASE_URL?: string }) {
  return publicClientSchema.parse(raw);
}
