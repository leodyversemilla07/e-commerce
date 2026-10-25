import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { Request, Response } from 'express';
import { apiEnv } from './prisma';

const GUEST_CART_COOKIE = 'guest_cart_id';
const GUEST_CART_TTL_SECONDS = 60 * 60 * 24 * 30;
const GUEST_CART_TTL_MS = GUEST_CART_TTL_SECONDS * 1000;

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

function sign(guestId: string, expiresAt: number): string {
  return createHmac('sha256', apiEnv.BETTER_AUTH_SECRET)
    .update(`${guestId}.${expiresAt}`)
    .digest('base64url');
}

function serialize(guestId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + GUEST_CART_TTL_SECONDS;
  return `${guestId}.${expiresAt}.${sign(guestId, expiresAt)}`;
}

function verify(value: string): string | null {
  const [guestId, expiresAtRaw, providedSignature, extra] = value.split('.');
  if (extra !== undefined || !guestId || !expiresAtRaw || !providedSignature) return null;
  if (!/^\d+$/.test(expiresAtRaw)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(sign(guestId, expiresAt));

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  return guestId;
}

/**
 * Reads the guest cart id only when its cookie signature is valid and the
 * server-side expiry has not passed. Unsigned, tampered, or expired cookies
 * are treated as absent.
 */
export function readGuestCartId(req: Request): string | null {
  const value = parseCookieHeader(req.headers.cookie).get(GUEST_CART_COOKIE);
  return value ? verify(value) : null;
}

/**
 * Clears the browser's guest identity. Called after an authenticated cart
 * operation so a later account on the same browser cannot reuse it.
 */
export function clearGuestCartCookie(res: Response): void {
  res.clearCookie(GUEST_CART_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
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
    maxAge: GUEST_CART_TTL_MS,
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
