/**
 * Vela Electronics — Art-Directed Mini Checkout Controller (Vanilla JavaScript)
 * Preserves existing state store, integer INR currency arithmetic, validation,
 * immutable confirmation snapshot, and synchronous duplicate-submission lock.
 */

import { MAX_ITEM_QUANTITY, PRODUCTS } from './catalog.js';
import { formatPaiseToINR } from './currency.js';
import { createCheckoutStore } from './store.js';

const store = createCheckoutStore();

// DOM references
const headerCartCount = document.getElementById('header-cart-count');
const liveAnnouncer = document.getElementById('live-announcer');

const checkoutWorkspace = document.getElementById('checkout-workspace');
const heroHeading = document.getElementById('hero-heading');
const productListEl = document.getElementById('product-list');

const cartItemCount = document.getElementById('cart-item-count');
const cartEmptyState = document.getElementById('cart-empty-state');
const cartListEl = document.getElementById('cart-list');
const orderTotalEl = document.getElementById('order-total');

const checkoutForm = document.getElementById('checkout-form');
const cartErrorEl = document.getElementById('cart-error');
const customerNameInput = document.getElementById('customer-name');
const customerNameErrorEl = document.getElementById('customer-name-error');
const placeOrderBtn = document.getElementById('place-order-btn');

const confirmationMount = document.getElementById('confirmation-mount');

let lastRenderedTotalPaise = 0;
let totalPulseTimer = 0;
let bagPulseTimer = 0;

/**
 * Formats an item count with proper singular/plural label.
 * @param {number} count
 * @returns {string}
 */
function formatItemCount(count) {
  return count === 1 ? '1 item' : `${count} items`;
}

/**
 * Announces status updates cleanly for screen readers.
 * @param {string} message
 */
function announce(message) {
  if (!liveAnnouncer) return;
  liveAnnouncer.textContent = '';
  window.requestAnimationFrame(() => {
    liveAnnouncer.textContent = message;
  });
}

/**
 * Triggers a brief, layout-safe highlight on the total readout when the value changes.
 * @param {number} nextTotalPaise
 */
function pulseTotalIfChanged(nextTotalPaise) {
  if (nextTotalPaise === lastRenderedTotalPaise) return;
  lastRenderedTotalPaise = nextTotalPaise;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.clearTimeout(totalPulseTimer);
  orderTotalEl.classList.add('total-updated');
  totalPulseTimer = window.setTimeout(() => {
    orderTotalEl.classList.remove('total-updated');
  }, 260);
}

/**
 * Triggers short, tactile visual feedback on the Add to Cart button and header bag count.
 * Preserves the accessible button label at all times.
 * @param {HTMLButtonElement} button
 */
function triggerAddFeedback(button) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  button.classList.add('is-added');
  window.setTimeout(() => {
    button.classList.remove('is-added');
  }, 420);

  window.clearTimeout(bagPulseTimer);
  headerCartCount.classList.add('is-updated');
  bagPulseTimer = window.setTimeout(() => {
    headerCartCount.classList.remove('is-updated');
  }, 320);
}

/**
 * Creates a minimalist SVG fallback graphic when a product photograph cannot load.
 * @param {string} productName
 * @returns {HTMLDivElement}
 */
function createImageFallback(productName) {
  const fallback = document.createElement('div');
  fallback.className = 'product-image-fallback';
  fallback.hidden = true;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '40');
  svg.setAttribute('height', '40');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.4');
  svg.setAttribute('aria-hidden', 'true');

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '3');
  rect.setAttribute('y', '5');
  rect.setAttribute('width', '18');
  rect.setAttribute('height', '14');
  svg.appendChild(rect);

  const label = document.createElement('span');
  label.textContent = productName;

  fallback.append(svg, label);
  return fallback;
}

/**
 * Renders the two fixed-price products as asymmetrical editorial hardware showcases.
 */
function initProductCatalogue() {
  productListEl.replaceChildren();

  PRODUCTS.forEach((product, index) => {
    const showcase = document.createElement('article');
    showcase.className =
      index === 0
        ? 'product-showcase product-showcase--lead'
        : 'product-showcase product-showcase--offset';
    showcase.dataset.productId = product.id;

    const media = document.createElement('div');
    media.className = 'product-media';

    const img = document.createElement('img');
    img.className = 'product-image';
    img.src = product.image;
    img.alt = product.imageAlt;
    img.referrerPolicy = 'no-referrer';

    const fallback = createImageFallback(product.name);
    img.addEventListener('error', () => {
      img.hidden = true;
      fallback.hidden = false;
    });

    media.append(img, fallback);

    const details = document.createElement('div');
    details.className = 'product-details';

    const title = document.createElement('h3');
    title.className = 'product-title';
    title.textContent = product.name;

    const description = document.createElement('p');
    description.className = 'product-description';
    description.textContent = product.description;

    const purchase = document.createElement('div');
    purchase.className = 'product-purchase';

    const priceRow = document.createElement('div');
    priceRow.className = 'product-price-row';

    const price = document.createElement('span');
    price.className = 'product-price tabular-nums';
    price.textContent = formatPaiseToINR(product.pricePaise);

    const inCartNote = document.createElement('span');
    inCartNote.className = 'product-in-cart-note tabular-nums';
    inCartNote.dataset.inCartNote = product.id;
    inCartNote.hidden = true;

    priceRow.append(price, inCartNote);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn btn-outline btn-full';
    addButton.dataset.action = 'add';
    addButton.dataset.productId = product.id;
    addButton.append(document.createTextNode('Add to Cart'));

    const srLabel = document.createElement('span');
    srLabel.className = 'sr-only';
    srLabel.textContent = ` — ${product.name}`;
    addButton.append(srLabel);

    purchase.append(priceRow, addButton);
    details.append(title, description, purchase);
    showcase.append(media, details);
    productListEl.append(showcase);
  });
}

/**
 * Builds a single accessible cart line item.
 * @param {{ id: string, name: string, unitPricePaise: number, quantity: number, lineTotalPaise: number }} line
 * @returns {HTMLLIElement}
 */
function createCartItemElement(line) {
  const li = document.createElement('li');
  li.className = 'cart-item';
  li.dataset.cartProductId = line.id;

  const topRow = document.createElement('div');
  topRow.className = 'cart-item-top';

  const info = document.createElement('div');
  const nameEl = document.createElement('h4');
  nameEl.className = 'cart-item-name';
  nameEl.textContent = line.name;

  const unitPriceEl = document.createElement('p');
  unitPriceEl.className = 'cart-item-unit-price tabular-nums';
  unitPriceEl.textContent = `${formatPaiseToINR(line.unitPricePaise)} each`;

  info.append(nameEl, unitPriceEl);

  const lineTotalEl = document.createElement('span');
  lineTotalEl.className = 'cart-item-line-total tabular-nums';
  lineTotalEl.dataset.lineTotal = line.id;
  lineTotalEl.textContent = formatPaiseToINR(line.lineTotalPaise);

  topRow.append(info, lineTotalEl);

  const controlsRow = document.createElement('div');
  controlsRow.className = 'cart-item-controls';

  const qtyGroup = document.createElement('div');
  qtyGroup.className = 'quantity-control';
  qtyGroup.setAttribute('role', 'group');
  qtyGroup.setAttribute('aria-label', `Quantity controls for ${line.name}`);

  const decBtn = document.createElement('button');
  decBtn.type = 'button';
  decBtn.className = 'qty-btn';
  decBtn.dataset.action = 'decrement';
  decBtn.dataset.productId = line.id;
  decBtn.setAttribute('aria-label', `Decrease quantity of ${line.name}`);
  decBtn.textContent = '−';

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.className = 'qty-input tabular-nums';
  qtyInput.min = '1';
  qtyInput.max = String(MAX_ITEM_QUANTITY);
  qtyInput.step = '1';
  qtyInput.inputMode = 'numeric';
  qtyInput.value = String(line.quantity);
  qtyInput.dataset.action = 'set-quantity';
  qtyInput.dataset.productId = line.id;
  qtyInput.setAttribute('aria-label', `Quantity for ${line.name}`);

  const incBtn = document.createElement('button');
  incBtn.type = 'button';
  incBtn.className = 'qty-btn';
  incBtn.dataset.action = 'increment';
  incBtn.dataset.productId = line.id;
  incBtn.setAttribute('aria-label', `Increase quantity of ${line.name}`);
  incBtn.textContent = '+';

  qtyGroup.append(decBtn, qtyInput, incBtn);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove';
  removeBtn.dataset.action = 'remove';
  removeBtn.dataset.productId = line.id;
  removeBtn.append(document.createTextNode('Remove'));

  const srRemove = document.createElement('span');
  srRemove.className = 'sr-only';
  srRemove.textContent = ` ${line.name}`;
  removeBtn.append(srRemove);

  controlsRow.append(qtyGroup, removeBtn);
  li.append(topRow, controlsRow);

  return li;
}

/**
 * Renders the dedicated Order Confirmation receipt from the immutable order snapshot.
 * Ensures exactly one confirmation region exists in the DOM.
 * @param {{ reference: string, customerName: string, items: Array<{ id: string, name: string, unitPricePaise: number, quantity: number, lineTotalPaise: number }>, totalPaise: number, totalUnits: number }} order
 */
function renderConfirmationView(order) {
  confirmationMount.replaceChildren();

  const section = document.createElement('section');
  section.className = 'confirmation-card';
  section.setAttribute('aria-labelledby', 'confirmation-heading');
  section.dataset.orderConfirmation = 'true';

  const header = document.createElement('div');
  header.className = 'confirmation-header';

  const heading = document.createElement('h1');
  heading.id = 'confirmation-heading';
  heading.className = 'confirmation-heading';
  heading.tabIndex = -1;
  heading.textContent = 'Order Confirmed';

  const lead = document.createElement('p');
  lead.className = 'confirmation-lead';
  lead.textContent = 'Your Vela Electronics receipt has been recorded below.';

  header.append(heading, lead);

  const meta = document.createElement('dl');
  meta.className = 'confirmation-meta';

  const refItem = document.createElement('div');
  refItem.className = 'meta-item';
  const refLabel = document.createElement('dt');
  refLabel.className = 'meta-label';
  refLabel.textContent = 'Order Reference';
  const refValue = document.createElement('dd');
  refValue.id = 'order-reference';
  refValue.className = 'meta-value order-reference-code tabular-nums';
  refValue.textContent = order.reference;
  refItem.append(refLabel, refValue);

  const customerItem = document.createElement('div');
  customerItem.className = 'meta-item';
  const customerLabel = document.createElement('dt');
  customerLabel.className = 'meta-label';
  customerLabel.textContent = 'Customer Name';
  const customerValue = document.createElement('dd');
  customerValue.id = 'confirmed-customer-name';
  customerValue.className = 'meta-value';
  customerValue.textContent = order.customerName;
  customerItem.append(customerLabel, customerValue);

  meta.append(refItem, customerItem);

  const summaryHeading = document.createElement('h2');
  summaryHeading.className = 'receipt-heading';
  summaryHeading.textContent = 'Order Summary';

  const table = document.createElement('table');
  table.className = 'receipt-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const thProduct = document.createElement('th');
  thProduct.scope = 'col';
  thProduct.textContent = 'Product';
  const thQty = document.createElement('th');
  thQty.scope = 'col';
  thQty.className = 'col-qty';
  thQty.textContent = 'Qty';
  const thAmount = document.createElement('th');
  thAmount.scope = 'col';
  thAmount.className = 'col-amount';
  thAmount.textContent = 'Line Total';
  headRow.append(thProduct, thQty, thAmount);
  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');
  for (const item of order.items) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = `${item.name} (${formatPaiseToINR(item.unitPricePaise)})`;

    const tdQty = document.createElement('td');
    tdQty.className = 'col-qty tabular-nums';
    tdQty.textContent = String(item.quantity);

    const tdTotal = document.createElement('td');
    tdTotal.className = 'col-amount tabular-nums';
    tdTotal.textContent = formatPaiseToINR(item.lineTotalPaise);

    tr.append(tdName, tdQty, tdTotal);
    tbody.appendChild(tr);
  }

  table.append(thead, tbody);

  const totalRow = document.createElement('div');
  totalRow.className = 'receipt-total-row';
  const totalLabel = document.createElement('span');
  totalLabel.className = 'receipt-total-label';
  totalLabel.textContent = 'Final Total';
  const totalAmount = document.createElement('span');
  totalAmount.id = 'confirmed-order-total';
  totalAmount.className = 'receipt-total-amount tabular-nums';
  totalAmount.textContent = formatPaiseToINR(order.totalPaise);
  totalRow.append(totalLabel, totalAmount);

  const actions = document.createElement('div');
  actions.className = 'confirmation-actions';
  const newOrderBtn = document.createElement('button');
  newOrderBtn.id = 'start-new-order-btn';
  newOrderBtn.type = 'button';
  newOrderBtn.className = 'btn btn-outline';
  newOrderBtn.textContent = 'Start New Order';
  newOrderBtn.addEventListener('click', handleStartNewOrder);
  actions.appendChild(newOrderBtn);

  section.append(header, meta, summaryHeading, table, totalRow, actions);
  confirmationMount.appendChild(section);
}

/**
 * Reconciles the UI with the current checkout state snapshot.
 */
function render() {
  const snapshot = store.getSnapshot();
  document.body.classList.toggle('is-order-confirmed', Boolean(snapshot.confirmedOrder));

  if (snapshot.confirmedOrder) {
    headerCartCount.textContent = `(${snapshot.confirmedOrder.totalUnits})`;

    checkoutWorkspace.hidden = true;
    placeOrderBtn.disabled = true;

    if (confirmationMount.hidden) {
      renderConfirmationView(snapshot.confirmedOrder);
      confirmationMount.hidden = false;
      window.scrollTo({ top: 0, behavior: 'auto' });
      const heading = document.getElementById('confirmation-heading');
      if (heading) heading.focus({ preventScroll: true });
    }
    return;
  }

  confirmationMount.hidden = true;
  confirmationMount.replaceChildren();
  checkoutWorkspace.hidden = false;
  placeOrderBtn.disabled = snapshot.isSubmitting;

  headerCartCount.textContent = `(${snapshot.totalUnits})`;
  cartItemCount.textContent = formatItemCount(snapshot.totalUnits);
  orderTotalEl.textContent = formatPaiseToINR(snapshot.totalPaise);
  pulseTotalIfChanged(snapshot.totalPaise);

  const quantitiesById = new Map(snapshot.lines.map((line) => [line.id, line.quantity]));
  for (const product of PRODUCTS) {
    const noteEl = productListEl.querySelector(`[data-in-cart-note="${product.id}"]`);
    if (!noteEl) continue;
    const qty = quantitiesById.get(product.id) || 0;
    if (qty > 0) {
      noteEl.textContent = `In bag: ${qty}`;
      noteEl.hidden = false;
    } else {
      noteEl.textContent = '';
      noteEl.hidden = true;
    }
  }

  if (snapshot.lines.length === 0) {
    cartEmptyState.hidden = false;
    cartListEl.hidden = true;
    cartListEl.replaceChildren();
  } else {
    cartEmptyState.hidden = true;
    cartListEl.hidden = false;

    const existingItems = new Map(
      Array.from(cartListEl.children).map((el) => [el.dataset.cartProductId, el]),
    );

    const desiredIds = new Set(snapshot.lines.map((line) => line.id));
    for (const [id, el] of existingItems.entries()) {
      if (!desiredIds.has(id)) {
        el.remove();
        existingItems.delete(id);
      }
    }

    snapshot.lines.forEach((line, index) => {
      let li = existingItems.get(line.id);
      if (!li) {
        li = createCartItemElement(line);
        const referenceNode = cartListEl.children[index] || null;
        cartListEl.insertBefore(li, referenceNode);
      } else {
        const lineTotalEl = li.querySelector(`[data-line-total="${line.id}"]`);
        if (lineTotalEl) {
          lineTotalEl.textContent = formatPaiseToINR(line.lineTotalPaise);
        }
        const qtyInput = li.querySelector('input[data-action="set-quantity"]');
        if (qtyInput && document.activeElement !== qtyInput) {
          qtyInput.value = String(line.quantity);
        }
      }
    });
  }

  if (customerNameInput.value !== snapshot.customerName) {
    customerNameInput.value = snapshot.customerName;
  }

  if (snapshot.errors.cart) {
    cartErrorEl.textContent = snapshot.errors.cart;
    cartErrorEl.hidden = false;
  } else {
    cartErrorEl.textContent = '';
    cartErrorEl.hidden = true;
  }

  if (snapshot.errors.customerName) {
    customerNameErrorEl.textContent = snapshot.errors.customerName;
    customerNameErrorEl.hidden = false;
    customerNameInput.setAttribute('aria-invalid', 'true');
  } else {
    customerNameErrorEl.textContent = '';
    customerNameErrorEl.hidden = true;
    customerNameInput.removeAttribute('aria-invalid');
  }
}

/**
 * Sets up subtle, non-blocking scroll reveal transitions respecting reduced motion.
 */
function initSectionReveals() {
  const sections = document.querySelectorAll('.reveal-section');
  if (
    sections.length === 0 ||
    typeof IntersectionObserver === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08 },
  );

  for (const section of sections) {
    section.classList.add('reveal-pending');
    observer.observe(section);
  }
}

/**
 * Resets the application back to a clean storefront and checkout state.
 */
function handleStartNewOrder() {
  store.startNewOrder();
  lastRenderedTotalPaise = 0;
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
  announce('Started a new order. Cart is empty.');
  if (heroHeading) heroHeading.focus({ preventScroll: true });
}

// Product collection click delegation
productListEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="add"]');
  if (!button) return;

  const productId = button.dataset.productId;
  if (store.addProduct(productId)) {
    render();
    triggerAddFeedback(button);
    const snapshot = store.getSnapshot();
    const line = snapshot.lines.find((item) => item.id === productId);
    if (line) {
      announce(
        `Added ${line.name}. Quantity is now ${line.quantity}. Order total is ${formatPaiseToINR(snapshot.totalPaise)}.`,
      );
    }
  }
});

// Cart click delegation (decrement, increment, remove)
cartListEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, productId } = button.dataset;
  if (!productId) return;

  if (action === 'increment') {
    store.changeQuantityBy(productId, 1);
  } else if (action === 'decrement') {
    store.changeQuantityBy(productId, -1);
  } else if (action === 'remove') {
    store.removeProduct(productId);
  }

  render();
  const snapshot = store.getSnapshot();
  announce(`Cart updated. Order total is ${formatPaiseToINR(snapshot.totalPaise)}.`);
});

// Cart direct quantity editing
cartListEl.addEventListener('input', (event) => {
  const input = event.target.closest('input[data-action="set-quantity"]');
  if (!input) return;

  const productId = input.dataset.productId;
  const raw = input.value.trim();
  if (raw === '') return;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isNaN(parsed) && parsed >= 1) {
    store.setQuantity(productId, parsed);
    render();
  }
});

// Commit quantity changes on blur/Enter
cartListEl.addEventListener('change', (event) => {
  const input = event.target.closest('input[data-action="set-quantity"]');
  if (!input) return;

  const productId = input.dataset.productId;
  const raw = input.value.trim();
  const parsed = Number.parseInt(raw, 10);

  if (raw !== '' && !Number.isNaN(parsed)) {
    store.setQuantity(productId, parsed);
  }

  render();
  const snapshot = store.getSnapshot();
  const line = snapshot.lines.find((item) => item.id === productId);
  if (line) {
    input.value = String(line.quantity);
  }
});

// Customer name input listener
customerNameInput.addEventListener('input', (event) => {
  store.setCustomerName(event.target.value);
  render();
});

// Checkout form submission with synchronous duplicate-submission protection
checkoutForm.addEventListener('submit', (event) => {
  event.preventDefault();

  store.setCustomerName(customerNameInput.value);

  const result = store.submitOrder();

  if (result.reason === 'duplicate_blocked') {
    return;
  }

  if (!result.ok) {
    render();
    if (result.errors.customerName) {
      customerNameInput.focus();
    } else if (result.errors.cart) {
      cartErrorEl.focus();
    }
    return;
  }

  placeOrderBtn.disabled = true;
  render();
  announce(`Order confirmed. Reference ${result.order.reference}.`);
});

// Initialize storefront
initProductCatalogue();
initSectionReveals();
render();
