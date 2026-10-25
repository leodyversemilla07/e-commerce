import type { Request } from 'express';

import { resolveGuestCartId } from '../guest-cart';
import type { CheckoutRequestIdentity } from './checkout.types';

export function getCheckoutIdentity(req: Request): CheckoutRequestIdentity {
  const user = (req as Request & { user?: { id: string } | null }).user;

  if (user?.id) {
    // Checkout for a signed-in user must never read a guest cart. This keeps a
    // stale browser cookie from another account out of the order path.
    return { userId: user.id, guestId: null };
  }

  return {
    userId: null,
    guestId: resolveGuestCartId(req),
  };
}
