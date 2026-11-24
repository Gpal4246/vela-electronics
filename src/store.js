/**
 * Checkout state management, validation, and duplicate-order protection.
 */

import { MAX_ITEM_QUANTITY, PRODUCTS, PRODUCTS_BY_ID } from './catalog.js';
import { calculateLineTotalPaise, calculateOrderTotalPaise } from './currency.js';

let orderSequence = 0;

/**
 * Generates a unique, human-readable order reference (e.g., ORD-20261123-001-A4F9C2).
 * Combines a monotonic per-session sequence number with cryptographic randomness
 * so references cannot collide across rapid or sequential orders.
 * @returns {string}
 */
export function generateOrderReference() {
  orderSequence += 1;
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(orderSequence).padStart(3, '0');

  let randomPart = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    randomPart = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  } else {
    randomPart = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase();
  }

  return `ORD-${yyyy}${mm}${dd}-${seq}-${randomPart}`;
}

/**
 * Creates a fresh checkout store instance.
 */
export function createCheckoutStore() {
  const state = {
    /** @type {Map<string, number>} */
    cart: new Map(),
    customerName: '',
    errors: {
      cart: '',
      customerName: '',
    },
    isSubmitting: false,
    /** @type {null | { reference: string, customerName: string, items: Array<{ id: string, name: string, unitPricePaise: number, quantity: number, lineTotalPaise: number }>, totalPaise: number, totalUnits: number }} */
    confirmedOrder: null,
  };

  function getCartLines() {
    const lines = [];
    for (const product of PRODUCTS) {
      const quantity = state.cart.get(product.id) || 0;
      if (quantity > 0) {
        lines.push({
          id: product.id,
          name: product.name,
          unitPricePaise: product.pricePaise,
          quantity,
          lineTotalPaise: calculateLineTotalPaise(product.pricePaise, quantity),
        });
      }
    }
    return lines;
  }

  function getSnapshot() {
    const lines = getCartLines();
    const totalPaise = calculateOrderTotalPaise(lines);
    const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);

    return {
      lines,
      totalPaise,
      totalUnits,
      customerName: state.customerName,
      errors: { ...state.errors },
      isSubmitting: state.isSubmitting,
      confirmedOrder: state.confirmedOrder,
    };
  }

  function addProduct(productId) {
    if (state.confirmedOrder || state.isSubmitting) return false;
    if (!PRODUCTS_BY_ID[productId]) return false;

    const current = state.cart.get(productId) || 0;
    const next = Math.min(MAX_ITEM_QUANTITY, current + 1);
    state.cart.set(productId, next);
    state.errors.cart = '';
    return true;
  }

  function setQuantity(productId, rawQuantity) {
    if (state.confirmedOrder || state.isSubmitting) return false;
    if (!PRODUCTS_BY_ID[productId]) return false;

    const parsed = Number.parseInt(String(rawQuantity), 10);
    if (Number.isNaN(parsed)) return false;

    if (parsed <= 0) {
      state.cart.delete(productId);
    } else {
      state.cart.set(productId, Math.min(MAX_ITEM_QUANTITY, parsed));
      state.errors.cart = '';
    }
    return true;
  }

  function changeQuantityBy(productId, delta) {
    if (state.confirmedOrder || state.isSubmitting) return false;
    if (!PRODUCTS_BY_ID[productId]) return false;

    const current = state.cart.get(productId) || 0;
    return setQuantity(productId, current + delta);
  }

  function removeProduct(productId) {
    if (state.confirmedOrder || state.isSubmitting) return false;
    if (!state.cart.has(productId)) return false;

    state.cart.delete(productId);
    return true;
  }

  function setCustomerName(value) {
    if (state.confirmedOrder || state.isSubmitting) return;
    state.customerName = String(value);
    if (state.customerName.trim().length > 0 && state.errors.customerName) {
      state.errors.customerName = '';
    }
  }

  /**
   * Validates inputs and submits an order atomically.
   * Synchronously blocks duplicate or repeated submissions.
   */
  function submitOrder() {
    if (state.isSubmitting || state.confirmedOrder) {
      return { ok: false, reason: 'duplicate_blocked' };
    }

    const lines = getCartLines();
    const trimmedName = state.customerName.trim();
    const hasItems = lines.length > 0;
    const hasName = trimmedName.length > 0;

    state.errors.cart = hasItems
      ? ''
      : 'Your cart is empty. Add at least one product before placing an order.';
    state.errors.customerName = hasName
      ? ''
      : 'Please enter your customer name to place your order.';

    if (!hasItems || !hasName) {
      return {
        ok: false,
        reason: 'validation_failed',
        errors: { ...state.errors },
      };
    }

    // Synchronous idempotency lock prevents rapid double-clicks from duplicating orders.
    state.isSubmitting = true;

    const totalPaise = calculateOrderTotalPaise(lines);
    const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);

    state.confirmedOrder = Object.freeze({
      reference: generateOrderReference(),
      customerName: trimmedName,
      items: Object.freeze(lines.map((line) => Object.freeze({ ...line }))),
      totalPaise,
      totalUnits,
    });

    return {
      ok: true,
      order: state.confirmedOrder,
    };
  }

  /**
   * Explicitly resets the application to a clean state when the shopper starts a new order.
   */
  function startNewOrder() {
    state.cart.clear();
    state.customerName = '';
    state.errors.cart = '';
    state.errors.customerName = '';
    state.isSubmitting = false;
    state.confirmedOrder = null;
  }

  return {
    getSnapshot,
    addProduct,
    setQuantity,
    changeQuantityBy,
    removeProduct,
    setCustomerName,
    submitOrder,
    startNewOrder,
  };
}
