export type CheckoutRequestIdentity = {
  userId: string | null;
  guestId: string;
};

export type CheckoutPayload = {
  customerEmail: string;
  customerName: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string | null;
  city: string;
  province: string;
  postalCode: string;
  phone?: string | null;
  notes?: string | null;
  shippingMethod?: 'standard' | 'express';
  deliveryOption?: 'anytime' | 'morning' | 'afternoon';
  paymentMethod?: 'cod' | 'card';
  paymentIntentId?: string | null;
};
