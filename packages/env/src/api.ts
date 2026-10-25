import { z } from 'zod';
import { rejectDemoSecrets, sharedServerSchema, urlSchema } from './shared';

export const apiSchema = sharedServerSchema.extend({
  DATABASE_URL: z.string().trim().min(1),
  DB_PROVIDER: z.enum(['postgresql', 'sqlite']).default('postgresql'),
  BETTER_AUTH_URL: urlSchema,
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().trim().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  STRIPE_SECRET_KEY: z.string().trim().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().optional(),
  RESEND_API_KEY: z.string().trim().optional(),
  RESEND_FROM_EMAIL: z.string().trim().email().optional(),
});

export type ApiEnv = z.infer<typeof apiSchema>;

export function parseApiEnv(raw: NodeJS.ProcessEnv, mode = raw.NODE_ENV ?? 'development'): ApiEnv {
  return apiSchema.superRefine((env, context) => {
    if (env.DB_PROVIDER === 'sqlite') {
      if (!env.DATABASE_URL.startsWith('file:')) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'SQLite requires a file: URL' });
      }
      if (mode === 'production') {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['DB_PROVIDER'], message: 'SQLite is local-only' });
      }
    } else if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'PostgreSQL requires a postgres:// or postgresql:// URL' });
    }
    if (env.PAYMENT_PROVIDER === 'stripe') {
      for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const) {
        if (!env[key]) context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'required for Stripe' });
      }
    }
    if (mode === 'production') {
      rejectDemoSecrets(env, context);
      if (env.PAYMENT_PROVIDER === 'mock') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYMENT_PROVIDER'],
          message: 'mock payments are not allowed in production',
        });
      }
      for (const key of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'] as const) {
        if (!env[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'required in production for order and password-reset email',
          });
        }
      }
    }
  }).parse(raw);
}
