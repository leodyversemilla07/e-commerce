"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
  type CartResponse,
} from "@/lib/cart"

const cartQueryKey = ["cart"] as const

export function useCartQuery() {
  return useQuery<CartResponse>({
    queryKey: cartQueryKey,
    queryFn: getCart,
  })
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => addToCart(productId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartQueryKey })
    },
  })
}

export function useUpdateCartItemQuantityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => updateCartItemQuantity(itemId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartQueryKey })
    },
  })
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => removeCartItem(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartQueryKey })
    },
  })
}
