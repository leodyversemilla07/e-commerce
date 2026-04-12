import { randomUUID } from 'node:crypto';

import type { Request, Response } from 'express';
import type { Session } from 'better-auth';
import type { User } from '../generated/prisma/client';
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
    secure: false,
    maxAge: ONE_YEAR_IN_SECONDS * 1000,
    path: '/',
  });

  return guestId;
}

export function getCartIdentity(req: Request, res: Response): CartRequestIdentity {
  const authPayload = (req as Request & { auth?: { session?: Session | null; user?: User | null } }).auth;

  return {
    userId: authPayload?.user?.id ?? null,
    guestId: getOrCreateGuestId(req, res),
  };
}
