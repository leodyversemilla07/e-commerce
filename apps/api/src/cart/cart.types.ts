export type CartRequestIdentity = {
  userId: string | null;
  guestId: string;
};

export type CartItemPayload = {
  productId: string;
  quantity: number;
};
