import type { Request } from 'express';

import { resolveGuestCartId } from '../guest-cart';
import type { CheckoutRequestIdentity } from './checkout.types';

export function getCheckoutIdentity(req: Request): CheckoutRequestIdentity {
  const user = (req as Request & { user?: { id: string } | null }).user;

  return {
    userId: user?.id ?? null,
    guestId: resolveGuestCartId(req),
  };
}
