import type { Request, Response } from 'express';

import { getOrCreateGuestCartId, readGuestCartId } from '../guest-cart';
import type { CartRequestIdentity } from './cart.types';

export function getCartIdentity(req: Request, res: Response): CartRequestIdentity {
  // @thallesp/nestjs-better-auth attaches the resolved user to req.user.
  const user = (req as Request & { user?: { id: string } | null }).user;

  if (user?.id) {
    // Authenticated carts are scoped by userId. The guest id is read only so
    // the current request can consume an anonymous guest cart; it is cleared
    // by the controller after the cart operation succeeds.
    return { userId: user.id, guestId: readGuestCartId(req) };
  }

  return {
    userId: null,
    guestId: getOrCreateGuestCartId(req, res),
  };
}
