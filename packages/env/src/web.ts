import { z } from 'zod';
import { rejectDemoSecrets, secretSchema, sharedServerSchema, urlSchema } from './shared';

export const webServerSchema = sharedServerSchema.extend({
  BETTER_AUTH_URL: urlSchema,
  NEXT_PUBLIC_AUTH_BASE_URL: urlSchema,
  ADMIN_PASSWORD: secretSchema,
});

export type WebServerEnv = z.infer<typeof webServerSchema>;

export function parseWebServerEnv(raw: NodeJS.ProcessEnv, mode = raw.NODE_ENV ?? 'development'): WebServerEnv {
  return webServerSchema.superRefine((env, context) => {
    if (mode === 'production') rejectDemoSecrets(env, context);
  }).parse(raw);
}
