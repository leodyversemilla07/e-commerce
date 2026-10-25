import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { apiEnv, prisma } from './prisma';

const apiBaseURL = apiEnv.BETTER_AUTH_URL;
function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] ?? char);
}

async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  const apiKey = apiEnv.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Password-reset email is not configured');
    }
    // Local development only: never print reset tokens in production logs.
    console.log(`[auth] password-reset link for ${email}: ${url}`);
    return;
  }

  const from = apiEnv.RESEND_FROM_EMAIL;
  if (!from && process.env.NODE_ENV === 'production') {
    throw new Error('RESEND_FROM_EMAIL is required in production');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from ?? 'no-reply@leodyversemilla07.com',
      to: [email],
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${escapeAttribute(url)}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
      `.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Password-reset email delivery failed (${response.status})`);
  }
}

export const auth = betterAuth({
  secret: apiEnv.BETTER_AUTH_SECRET,
  baseURL: apiBaseURL,
  database: prismaAdapter(prisma, {
    provider: apiEnv.DB_PROVIDER === 'sqlite' ? 'sqlite' : 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  trustedOrigins: apiEnv.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((s) => s.trim()),
});
