export type ShippingMethod = 'standard' | 'express';

export const TAX_RATE = 0.05;

export const SHIPPING_FEES_IN_CENTS: Record<ShippingMethod, number> = {
  standard: 0,
  express: 19900,
};

export function getShippingFeeInCents(method: ShippingMethod): number {
  return SHIPPING_FEES_IN_CENTS[method];
}

export function getTaxInCents(subtotalInCents: number): number {
  return Math.round(subtotalInCents * TAX_RATE);
}

export function calculateOrderTotals(subtotalInCents: number, method: ShippingMethod) {
  const shippingFeeInCents = getShippingFeeInCents(method);
  const taxInCents = getTaxInCents(subtotalInCents);

  return {
    subtotalInCents,
    shippingFeeInCents,
    taxInCents,
    totalInCents: subtotalInCents + shippingFeeInCents + taxInCents,
  };
}
