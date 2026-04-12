import { createStore } from "zustand/vanilla"

export type ShippingMethod = "standard" | "express"
export type PaymentMethod = "cod" | "card"
export type DeliveryOption = "anytime" | "morning" | "afternoon"

export type CheckoutStoreState = {
  shippingMethod: ShippingMethod
  paymentMethod: PaymentMethod
  deliveryOption: DeliveryOption
}

export type CheckoutStoreActions = {
  setShippingMethod: (method: ShippingMethod) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setDeliveryOption: (option: DeliveryOption) => void
  reset: () => void
}

export type CheckoutStore = CheckoutStoreState & CheckoutStoreActions

export const defaultCheckoutState: CheckoutStoreState = {
  shippingMethod: "standard",
  paymentMethod: "cod",
  deliveryOption: "anytime",
}

export const createCheckoutStore = (initState: CheckoutStoreState = defaultCheckoutState) => {
  return createStore<CheckoutStore>()((set) => ({
    ...initState,
    setShippingMethod: (method) => set(() => ({ shippingMethod: method })),
    setPaymentMethod: (method) => set(() => ({ paymentMethod: method })),
    setDeliveryOption: (option) => set(() => ({ deliveryOption: option })),
    reset: () => set(() => ({ ...defaultCheckoutState })),
  }))
}
