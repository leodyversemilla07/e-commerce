export type CartRequestIdentity = {
  userId: string | null;
  guestId: string | null;
};

export type CartItemPayload = {
  productId: string;
  quantity: number;
};
