"use client"

import { createContext, useContext, useRef, type ReactNode } from "react"
import { useStore } from "zustand"

import {
  createCheckoutStore,
  defaultCheckoutState,
  type CheckoutStore,
  type CheckoutStoreState,
} from "@/stores/checkout-store"

export type CheckoutStoreApi = ReturnType<typeof createCheckoutStore>

const CheckoutStoreContext = createContext<CheckoutStoreApi | undefined>(undefined)

type CheckoutStoreProviderProps = {
  children: ReactNode
  initialState?: CheckoutStoreState
}

export function CheckoutStoreProvider({ children, initialState }: CheckoutStoreProviderProps) {
  const storeRef = useRef<CheckoutStoreApi | null>(null)

  if (!storeRef.current) {
    storeRef.current = createCheckoutStore(initialState ?? defaultCheckoutState)
  }

  return <CheckoutStoreContext.Provider value={storeRef.current}>{children}</CheckoutStoreContext.Provider>
}

export function useCheckoutStore<T>(selector: (store: CheckoutStore) => T): T {
  const store = useContext(CheckoutStoreContext)

  if (!store) {
    throw new Error("useCheckoutStore must be used within CheckoutStoreProvider")
  }

  return useStore(store, selector)
}
