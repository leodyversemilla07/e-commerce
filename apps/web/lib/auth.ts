import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret:
    process.env.BETTER_AUTH_SECRET ??
    'dev-only-change-me-please-32-chars-minimum!',
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
