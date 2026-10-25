import type { Request } from 'express';

import { resolveGuestCartId } from '../guest-cart';
import type { OrdersRequestIdentity } from './orders.types';

export function getOrdersIdentity(req: Request): OrdersRequestIdentity {
  const user = (req as Request & { user?: { id: string } | null }).user;

  return {
    userId: user?.id ?? null,
    guestId: resolveGuestCartId(req),
  };
}
