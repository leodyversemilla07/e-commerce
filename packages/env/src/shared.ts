import { z } from 'zod';

export const secretSchema = z.string().trim().min(32, 'must be at least 32 characters');
export const urlSchema = z.string().trim().url();

export const sharedServerSchema = z.object({
  BETTER_AUTH_SECRET: secretSchema,
  ADMIN_API_SECRET: secretSchema,
});

export function rejectDemoSecrets(
  values: { BETTER_AUTH_SECRET?: string; ADMIN_API_SECRET?: string; ADMIN_PASSWORD?: string },
  context: z.RefinementCtx,
): void {
  const names = ['BETTER_AUTH_SECRET', 'ADMIN_API_SECRET', 'ADMIN_PASSWORD'] as const;
  for (const name of names) {
    const value = values[name];
    if (!value) continue;
    if (/change[-_ ]?me|admin123|dev[-_ ]?only|placeholder/i.test(value)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [name], message: 'must be a secure production value' });
    }
  }
}
