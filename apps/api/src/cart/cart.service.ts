import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../prisma';
import type { CartItemPayload, CartRequestIdentity } from './cart.types';

@Injectable()
export class CartService {
  private async ensureCart(identity: CartRequestIdentity) {
    if (!identity.userId) {
      if (!identity.guestId) {
        throw new BadRequestException('Guest cart identity is unavailable');
      }

      const guestCart = await prisma.cart.findFirst({
        where: {
          status: 'active',
          guestId: identity.guestId,
          userId: null,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (guestCart) return guestCart;

      return prisma.cart.create({
        data: {
          userId: null,
          guestId: identity.guestId,
          status: 'active',
        },
      });
    }

    const userCart = await prisma.cart.findFirst({
      where: {
        status: 'active',
        userId: identity.userId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Only anonymous carts may be merged or adopted. Authenticated carts from
    // another account must never be reachable through a browser cookie.
    const guestCart = identity.guestId
      ? await prisma.cart.findFirst({
          where: {
            status: 'active',
            guestId: identity.guestId,
            userId: null,
          },
          orderBy: { updatedAt: 'desc' },
        })
      : null;

    if (userCart && guestCart && userCart.id !== guestCart.id) {
      await prisma.$transaction(async (tx) => {
        const [freshUserCart, freshGuestCart] = await Promise.all([
          tx.cart.findUnique({
            where: { id: userCart.id },
            include: { items: true },
          }),
          tx.cart.findUnique({
            where: { id: guestCart.id },
            include: { items: true },
          }),
        ]);

        if (!freshUserCart || !freshGuestCart) return;
        if (freshUserCart.userId !== identity.userId || freshUserCart.status !== 'active') return;
        if (freshGuestCart.userId !== null || freshGuestCart.status !== 'active') return;

        const claimed = await tx.cart.updateMany({
          where: { id: freshGuestCart.id, userId: null, status: 'active' },
          data: { status: 'merging' },
        });
        if (claimed.count !== 1) return;

        const userItemsByProduct = new Map(freshUserCart.items.map((item) => [item.productId, item]));
        const productIds = Array.from(
          new Set([
            ...freshUserCart.items.map((item) => item.productId),
            ...freshGuestCart.items.map((item) => item.productId),
          ]),
        );

        const products =
          productIds.length > 0
            ? await tx.product.findMany({
                where: { id: { in: productIds } },
                select: {
                  id: true,
                  stock: true,
                  isActive: true,
                  priceInCents: true,
                },
              })
            : [];

        const productsById = new Map(products.map((product) => [product.id, product]));

        for (const guestItem of freshGuestCart.items) {
          const product = productsById.get(guestItem.productId);

          if (!product || !product.isActive || product.stock < 1) continue;

          const userItem = userItemsByProduct.get(guestItem.productId);
          const nextQuantity = Math.min(product.stock, (userItem?.quantity ?? 0) + guestItem.quantity);

          if (nextQuantity < 1) continue;

          await tx.cartItem.upsert({
            where: {
              cartId_productId: {
                cartId: freshUserCart.id,
                productId: guestItem.productId,
              },
            },
            create: {
              cartId: freshUserCart.id,
              productId: guestItem.productId,
              quantity: nextQuantity,
              unitPriceInCents: product.priceInCents,
            },
            update: {
              quantity: nextQuantity,
              unitPriceInCents: product.priceInCents,
            },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: freshGuestCart.id } });

        await tx.cart.update({
          where: { id: freshGuestCart.id },
          data: { status: 'merged' },
        });
      });

      return userCart;
    }

    if (userCart) return userCart;

    if (guestCart) {
      const adopted = await prisma.cart.updateMany({
        where: { id: guestCart.id, userId: null, status: 'active' },
        data: { userId: identity.userId, guestId: null },
      });

      if (adopted.count === 1) {
        return { ...guestCart, userId: identity.userId, guestId: null };
      }

      // Another request may have adopted this cart first. Prefer the current
      // user's active cart, or create a fresh one below.
      const racedUserCart = await prisma.cart.findFirst({
        where: {
          status: 'active',
          userId: identity.userId,
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (racedUserCart) return racedUserCart;
    }

    return prisma.cart.create({
      data: {
        userId: identity.userId,
        guestId: null,
        status: 'active',
      },
    });
  }

  private async buildCartResponse(cartId: string) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                imageUrl: true,
                stock: true,
                priceInCents: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Always price the cart from the current product price so the storefront,
    // checkout, and payment intents all agree after an admin price change.
    const subtotalInCents = cart.items.reduce(
      (sum, item) => sum + item.product.priceInCents * item.quantity,
      0,
    );

    return {
      id: cart.id,
      status: cart.status,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalInCents,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceInCents: item.product.priceInCents,
        lineTotalInCents: item.product.priceInCents * item.quantity,
        product: item.product,
      })),
      updatedAt: cart.updatedAt,
    };
  }

  async getCart(identity: CartRequestIdentity) {
    const cart = await this.ensureCart(identity);
    return this.buildCartResponse(cart.id);
  }

  async addItem(identity: CartRequestIdentity, payload: CartItemPayload) {
    if (!Number.isSafeInteger(payload.quantity) || payload.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const product = await prisma.product.findFirst({
      where: {
        id: payload.productId,
        isActive: true,
      },
      select: {
        id: true,
        stock: true,
        priceInCents: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.ensureCart(identity);

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: payload.productId,
        },
      },
    });

    const nextQuantity = (existing?.quantity ?? 0) + payload.quantity;

    if (nextQuantity > product.stock) {
      throw new BadRequestException('Requested quantity exceeds stock');
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: payload.productId,
        },
      },
      create: {
        cartId: cart.id,
        productId: payload.productId,
        quantity: payload.quantity,
        unitPriceInCents: product.priceInCents,
      },
      update: {
        quantity: nextQuantity,
        unitPriceInCents: product.priceInCents,
      },
    });

    return this.buildCartResponse(cart.id);
  }

  async updateItemQuantity(identity: CartRequestIdentity, itemId: string, quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const cart = await this.ensureCart(identity);

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        product: {
          select: {
            stock: true,
            isActive: true,
            priceInCents: true,
          },
        },
      },
    });

    if (!item || !item.product.isActive) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity > item.product.stock) {
      throw new BadRequestException('Requested quantity exceeds stock');
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity, unitPriceInCents: item.product.priceInCents },
    });

    return this.buildCartResponse(cart.id);
  }

  async removeItem(identity: CartRequestIdentity, itemId: string) {
    const cart = await this.ensureCart(identity);

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await prisma.cartItem.delete({ where: { id: item.id } });

    return this.buildCartResponse(cart.id);
  }
}
