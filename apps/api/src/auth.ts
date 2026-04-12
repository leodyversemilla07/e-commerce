import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { prisma } from './prisma';

const apiBaseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:4000';
const apiURL = new URL(apiBaseURL);
const defaultTrustedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  `${apiURL.protocol}//${apiURL.hostname}:3000`,
];

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ??
    'dev-only-change-me-please-32-chars-minimum!',
  baseURL: apiBaseURL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: replace with your actual email provider (Resend/SES/etc.)
      console.log(`[better-auth] password reset for ${user.email}: ${url}`);
    },
  },
  trustedOrigins:
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()) ??
    defaultTrustedOrigins,
});
