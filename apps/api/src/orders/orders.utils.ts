import type { Request } from 'express';

import { resolveGuestCartId } from '../guest-cart';
import type { OrdersRequestIdentity } from './orders.types';

export function getOrdersIdentity(req: Request): OrdersRequestIdentity {
  const user = (req as Request & { user?: { id: string } | null }).user;

  if (user?.id) {
    // Signed-in users only see orders attached to their account. Guest orders
    // require an explicit support/claim flow rather than a browser cookie.
    return { userId: user.id, guestId: null };
  }

  return {
    userId: null,
    guestId: resolveGuestCartId(req),
  };
}
