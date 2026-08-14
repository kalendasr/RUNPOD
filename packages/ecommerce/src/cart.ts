export interface CartLineItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  items: CartLineItem[];
}

export const EMPTY_CART: Cart = { items: [] };

/**
 * Pure, immutable cart operations — no database, no framework. This is
 * deliberately the reusable "hard part": correct quantity/total math,
 * independent of how a project persists the cart (session, DB row,
 * client-side state) or which UI renders it. See `../database/SKILL.md`
 * for the Prisma model this maps onto once persisted, and
 * `../stripe/SKILL.md` for turning `cartSubtotal()` into a checkout
 * session.
 */
export function addItem(cart: Cart, product: { productId: string; name: string; unitPrice: number }, quantity = 1): Cart {
  if (quantity <= 0) return cart;

  const existing = cart.items.find((item) => item.productId === product.productId);
  if (existing) {
    return {
      items: cart.items.map((item) =>
        item.productId === product.productId ? { ...item, quantity: item.quantity + quantity } : item,
      ),
    };
  }

  return { items: [...cart.items, { ...product, quantity }] };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { items: cart.items.filter((item) => item.productId !== productId) };
}

/** Setting quantity to 0 or below removes the line item entirely. */
export function updateQuantity(cart: Cart, productId: string, quantity: number): Cart {
  if (quantity <= 0) return removeItem(cart, productId);
  return { items: cart.items.map((item) => (item.productId === productId ? { ...item, quantity } : item)) };
}

export function cartSubtotal(cart: Cart): number {
  return cart.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function cartItemCount(cart: Cart): number {
  return cart.items.reduce((count, item) => count + item.quantity, 0);
}
