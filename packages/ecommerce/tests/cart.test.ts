import { describe, expect, it } from "vitest";
import { EMPTY_CART, addItem, removeItem, updateQuantity, cartSubtotal, cartItemCount, type Cart } from "../src/cart.js";

const widget = { productId: "widget", name: "Widget", unitPrice: 9.99 };
const gadget = { productId: "gadget", name: "Gadget", unitPrice: 24.5 };

describe("addItem", () => {
  it("adds a new line item with the given quantity", () => {
    const cart = addItem(EMPTY_CART, widget, 2);
    expect(cart.items).toEqual([{ ...widget, quantity: 2 }]);
  });

  it("defaults quantity to 1", () => {
    const cart = addItem(EMPTY_CART, widget);
    expect(cart.items[0].quantity).toBe(1);
  });

  it("increments quantity when the product is already in the cart", () => {
    let cart = addItem(EMPTY_CART, widget, 1);
    cart = addItem(cart, widget, 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it("ignores a non-positive quantity", () => {
    expect(addItem(EMPTY_CART, widget, 0)).toEqual(EMPTY_CART);
    expect(addItem(EMPTY_CART, widget, -1)).toEqual(EMPTY_CART);
  });

  it("does not mutate the original cart", () => {
    const original: Cart = { items: [] };
    addItem(original, widget, 1);
    expect(original.items).toEqual([]);
  });
});

describe("removeItem", () => {
  it("removes only the matching line item", () => {
    let cart = addItem(EMPTY_CART, widget, 1);
    cart = addItem(cart, gadget, 1);
    cart = removeItem(cart, "widget");
    expect(cart.items).toEqual([{ ...gadget, quantity: 1 }]);
  });

  it("is a no-op for a product not in the cart", () => {
    const cart = addItem(EMPTY_CART, widget, 1);
    expect(removeItem(cart, "nonexistent")).toEqual(cart);
  });
});

describe("updateQuantity", () => {
  it("sets a new quantity", () => {
    const cart = addItem(EMPTY_CART, widget, 1);
    expect(updateQuantity(cart, "widget", 5).items[0].quantity).toBe(5);
  });

  it("removes the line item when quantity is set to 0", () => {
    const cart = addItem(EMPTY_CART, widget, 1);
    expect(updateQuantity(cart, "widget", 0).items).toEqual([]);
  });

  it("removes the line item when quantity is negative", () => {
    const cart = addItem(EMPTY_CART, widget, 1);
    expect(updateQuantity(cart, "widget", -3).items).toEqual([]);
  });
});

describe("cartSubtotal", () => {
  it("sums unitPrice * quantity across all line items", () => {
    let cart = addItem(EMPTY_CART, widget, 2); // 19.98
    cart = addItem(cart, gadget, 1); // 24.50
    expect(cartSubtotal(cart)).toBeCloseTo(44.48, 2);
  });

  it("is 0 for an empty cart", () => {
    expect(cartSubtotal(EMPTY_CART)).toBe(0);
  });
});

describe("cartItemCount", () => {
  it("sums quantities, not distinct products", () => {
    let cart = addItem(EMPTY_CART, widget, 3);
    cart = addItem(cart, gadget, 2);
    expect(cartItemCount(cart)).toBe(5);
  });
});
