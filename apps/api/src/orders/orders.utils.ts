import { randomUUID } from 'node:crypto';

import type { Session } from 'better-auth';
import type { Request } from 'express';

import type { User } from '../generated/prisma/client';
import type { OrdersRequestIdentity } from './orders.types';

const GUEST_CART_COOKIE = 'guest_cart_id';

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

function getOrCreateGuestId(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const existing = cookies.get(GUEST_CART_COOKIE);

  return existing ?? randomUUID();
}

export function getOrdersIdentity(req: Request): OrdersRequestIdentity {
  const authPayload = (req as Request & { auth?: { session?: Session | null; user?: User | null } }).auth;

  return {
    userId: authPayload?.user?.id ?? null,
    guestId: getOrCreateGuestId(req),
  };
}
