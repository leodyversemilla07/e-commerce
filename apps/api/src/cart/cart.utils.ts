import { randomUUID } from 'node:crypto';

import type { Request, Response } from 'express';
import type { CartRequestIdentity } from './cart.types';

const GUEST_CART_COOKIE = 'guest_cart_id';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();

  return new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [key, rest.join('=')];
      }),
  );
}

function getOrCreateGuestId(req: Request, res: Response) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const existing = cookies.get(GUEST_CART_COOKIE);

  if (existing) return existing;

  const guestId = randomUUID();
  res.cookie(GUEST_CART_COOKIE, guestId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR_IN_SECONDS * 1000,
    path: '/',
  });

  return guestId;
}

export function getCartIdentity(req: Request, res: Response): CartRequestIdentity {
  // @thallesp/nestjs-better-auth attaches the resolved user to req.user.
  const user = (req as Request & { user?: { id: string } | null }).user;

  return {
    userId: user?.id ?? null,
    guestId: getOrCreateGuestId(req, res),
  };
}
