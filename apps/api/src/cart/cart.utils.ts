import type { Request, Response } from 'express';

import { getOrCreateGuestCartId } from '../guest-cart';
import type { CartRequestIdentity } from './cart.types';

export function getCartIdentity(req: Request, res: Response): CartRequestIdentity {
  // @thallesp/nestjs-better-auth attaches the resolved user to req.user.
  const user = (req as Request & { user?: { id: string } | null }).user;

  return {
    userId: user?.id ?? null,
    guestId: getOrCreateGuestCartId(req, res),
  };
}
