import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { Request, Response } from 'express';
import { apiEnv } from './prisma';

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
        const rawValue = rest.join('=');
        try {
          return [key, decodeURIComponent(rawValue)];
        } catch {
          return [key, rawValue];
        }
      }),
  );
}

function sign(guestId: string): string {
  return createHmac('sha256', apiEnv.BETTER_AUTH_SECRET).update(guestId).digest('base64url');
}

function serialize(guestId: string): string {
  return `${guestId}.${sign(guestId)}`;
}

function verify(value: string): string | null {
  const separator = value.lastIndexOf('.');
  if (separator <= 0 || separator === value.length - 1) return null;

  const guestId = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(guestId));

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  return guestId;
}

/**
 * Reads the guest cart id only when its cookie signature is valid.
 * Unsigned or tampered cookies are treated as absent.
 */
export function readGuestCartId(req: Request): string | null {
  const value = parseCookieHeader(req.headers.cookie).get(GUEST_CART_COOKIE);
  return value ? verify(value) : null;
}

/**
 * Returns the guest cart id, setting a fresh signed cookie when the request
 * has no valid one. Only use this when the response can set cookies.
 */
export function getOrCreateGuestCartId(req: Request, res: Response): string {
  const existing = readGuestCartId(req);
  if (existing) return existing;

  const guestId = randomUUID();
  res.cookie(GUEST_CART_COOKIE, serialize(guestId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR_IN_SECONDS * 1000,
    path: '/',
  });

  return guestId;
}

/**
 * Returns a guest cart id for read-only routes that cannot set cookies.
 * A random id is used when the request has no valid cookie, which simply
 * results in no matching cart/orders for that guest.
 */
export function resolveGuestCartId(req: Request): string {
  return readGuestCartId(req) ?? randomUUID();
}
