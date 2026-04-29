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

async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    // No email provider configured — log the link so local dev still works.
    console.log(`[auth] password-reset link for ${email}: ${url}`);
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ?? 'no-reply@leodyversemilla07.com';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${url}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
      `.trim(),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[auth] failed to send password-reset email to ${email}: ${response.status} ${body}`);
  }
}

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
      await sendPasswordResetEmail(user.email, url);
    },
  },
  trustedOrigins:
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()) ??
    defaultTrustedOrigins,
});
