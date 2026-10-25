import type { Request, Response } from 'express';

import {
  getOrCreateGuestCartId,
  readGuestCartId,
  resolveGuestCartId,
} from './guest-cart';

jest.mock('./prisma', () => ({
  apiEnv: { BETTER_AUTH_SECRET: 'guest-cookie-test-secret-at-least-32-chars' },
}));

function makeRequest(cookie?: string) {
  return { headers: cookie ? { cookie } : {} } as Request;
}

describe('guest cart cookies', () => {
  it('sets a signed cookie and reads the guest id back', () => {
    const cookie = jest.fn();
    const response = { cookie } as unknown as Response;

    const guestId = getOrCreateGuestCartId(makeRequest(), response);

    expect(cookie).toHaveBeenCalledWith(
      'guest_cart_id',
      expect.stringMatching(new RegExp(`^${guestId}\\.[A-Za-z0-9_-]+$`)),
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    const signedValue = cookie.mock.calls[0][1] as string;
    expect(readGuestCartId(makeRequest(`guest_cart_id=${signedValue}`))).toBe(guestId);
  });

  it('rejects unsigned and tampered cookies', () => {
    const guestId = '11111111-1111-4111-8111-111111111111';
    const tampered = '22222222-2222-4222-8222-222222222222';

    expect(readGuestCartId(makeRequest(`guest_cart_id=${guestId}`))).toBeNull();
    expect(
      readGuestCartId(
        makeRequest(`guest_cart_id=${tampered}.invalid-signature`),
      ),
    ).toBeNull();
  });

  it('returns a random id for read-only routes without a valid cookie', () => {
    const first = resolveGuestCartId(makeRequest());
    const second = resolveGuestCartId(makeRequest());

    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });
});
