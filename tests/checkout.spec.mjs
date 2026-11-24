import { test, expect } from '@playwright/test';

const ORDER_REFERENCE_PATTERN = /^ORD-\d{8}-\d{3}-[A-F0-9]{6}$/;

test.describe('Vela Electronics Mini Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Product Catalogue' })).toBeVisible();
  });

  test('TC-01: Successful checkout displays one confirmation and a unique order reference', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
    await page.getByRole('button', { name: /Add to Cart.*USB-C Hub/i }).click();

    await expect(page.getByLabel('Order total summary')).toContainText('₹2,298.00');

    await page.getByLabel(/Customer Name/i).fill('Ananya Deshmukh');
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Dedicated Order Confirmed screen replaces active checkout workspace
    const confirmationHeadings = page.getByRole('heading', { name: 'Order Confirmed' });
    await expect(confirmationHeadings).toHaveCount(1);
    await expect(confirmationHeadings).toBeVisible();

    await expect(page.getByRole('button', { name: 'Place Order' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Product Catalogue' })).toBeHidden();

    // Verify order reference, customer name, itemized summary, and final total
    const confirmationRegion = page.getByRole('region', { name: 'Order Confirmed' });
    await expect(confirmationRegion).toHaveCount(1);
    await expect(confirmationRegion).toContainText('Ananya Deshmukh');
    await expect(confirmationRegion).toContainText('Wireless Headphones');
    await expect(confirmationRegion).toContainText('USB-C Hub');
    await expect(confirmationRegion).toContainText('₹1,499.00');
    await expect(confirmationRegion).toContainText('₹799.00');
    await expect(confirmationRegion).toContainText('₹2,298.00');

    const referenceText = await page.locator('#order-reference').textContent();
    expect(referenceText?.trim()).toMatch(ORDER_REFERENCE_PATTERN);
  });

  test('TC-02: Rapid double-click on Place Order prevents duplicate orders', async ({ page }) => {
    await page.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
    await page.getByLabel(/Customer Name/i).fill('Rohan Kulkarni');

    const placeOrderButton = page.getByRole('button', { name: 'Place Order' });

    // Trigger rapid back-to-back submission attempts via double-click
    await placeOrderButton.dblclick();

    // Exactly one confirmation region and one reference must exist
    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Order Confirmed' })).toHaveCount(1);
    await expect(page.locator('#order-reference')).toHaveCount(1);
    await expect(placeOrderButton).toBeHidden();
    await expect(page.locator('#place-order-btn')).toBeDisabled();

    const refText = (await page.locator('#order-reference').textContent())?.trim();
    expect(refText).toMatch(ORDER_REFERENCE_PATTERN);

    // Even if a duplicate submit event is dispatched against the form, confirmation stays single and unchanged
    await page.locator('#checkout-form').dispatchEvent('submit');
    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toHaveCount(1);
    await expect(page.locator('#order-reference')).toHaveText(refText || '');

    await expect(page.getByRole('region', { name: 'Order Confirmed' })).toContainText(
      'Rohan Kulkarni',
    );
    await expect(page.getByRole('region', { name: 'Order Confirmed' })).toContainText('₹1,499.00');
  });

  test('TC-03: Changing quantities updates individual line totals and exact visible INR total', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
    await page.getByRole('button', { name: /Add to Cart.*USB-C Hub/i }).click();

    const cartItems = page.getByRole('list', { name: 'Shopping cart items' });
    const headphonesRow = cartItems.getByRole('listitem').filter({ hasText: 'Wireless Headphones' });
    const hubRow = cartItems.getByRole('listitem').filter({ hasText: 'USB-C Hub' });

    await expect(headphonesRow).toContainText('₹1,499.00');
    await expect(hubRow).toContainText('₹799.00');
    await expect(page.getByLabel('Order total summary')).toContainText('₹2,298.00');

    // Increase Wireless Headphones to 2 via stepper button
    await page.getByRole('button', { name: 'Increase quantity of Wireless Headphones' }).click();
    await expect(page.getByLabel('Quantity for Wireless Headphones')).toHaveValue('2');
    await expect(headphonesRow).toContainText('₹2,998.00');
    await expect(page.getByLabel('Order total summary')).toContainText('₹3,797.00');

    // Update USB-C Hub directly to 3 via numeric quantity input
    const hubQtyInput = page.getByLabel('Quantity for USB-C Hub');
    await hubQtyInput.fill('3');
    await expect(hubRow).toContainText('₹2,397.00');
    // 2 * 149900 + 3 * 79900 = 299800 + 239700 = 539500 paise -> ₹5,395.00
    await expect(page.getByLabel('Order total summary')).toContainText('₹5,395.00');

    // Verify Indian lakh-grouping formatting with large integer quantity (99 * 149900 = ₹1,48,401.00)
    await page.getByLabel('Quantity for Wireless Headphones').fill('99');
    await expect(headphonesRow).toContainText('₹1,48,401.00');
    // 14840100 + 239700 = 15079800 paise -> ₹1,50,798.00
    await expect(page.getByLabel('Order total summary')).toContainText('₹1,50,798.00');
  });

  test('TC-04: Missing or whitespace-only customer name prevents checkout and displays validation', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
    await page.getByRole('button', { name: 'Increase quantity of Wireless Headphones' }).click();
    await expect(page.getByLabel('Order total summary')).toContainText('₹2,998.00');

    // Submit with blank customer name
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toHaveCount(0);
    await expect(page.getByText('Please enter your customer name to place your order.')).toBeVisible();
    await expect(page.getByLabel(/Customer Name/i)).toHaveAttribute('aria-invalid', 'true');

    // Cart items and total must remain preserved
    await expect(page.getByLabel('Quantity for Wireless Headphones')).toHaveValue('2');
    await expect(page.getByLabel('Order total summary')).toContainText('₹2,998.00');

    // Whitespace-only input must also be rejected
    await page.getByLabel(/Customer Name/i).fill('     ');
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toHaveCount(0);
    await expect(page.getByText('Please enter your customer name to place your order.')).toBeVisible();
    await expect(page.getByLabel('Order total summary')).toContainText('₹2,998.00');
  });

  test('TC-05: Empty-cart checkout prevents submission without losing entered customer name', async ({
    page,
  }) => {
    const nameInput = page.getByLabel(/Customer Name/i);
    await nameInput.fill('Priya Nair');

    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toHaveCount(0);
    await expect(
      page.getByText('Your cart is empty. Add at least one product before placing an order.'),
    ).toBeVisible();

    // Entered customer name must remain intact
    await expect(nameInput).toHaveValue('Priya Nair');
    await expect(page.getByLabel('Order total summary')).toContainText('₹0.00');
  });

  test('TC-06: Removing products recalculates totals accurately and restores empty cart state', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
    await page.getByRole('button', { name: /Add to Cart.*USB-C Hub/i }).click();
    await expect(page.getByLabel('Order total summary')).toContainText('₹2,298.00');

    // Remove Wireless Headphones via Remove button
    await page.getByRole('button', { name: /Remove Wireless Headphones/i }).click();

    const cartItems = page.getByRole('list', { name: 'Shopping cart items' });
    await expect(cartItems.getByRole('listitem')).toHaveCount(1);
    await expect(cartItems).not.toContainText('Wireless Headphones');
    await expect(page.getByLabel('Order total summary')).toContainText('₹799.00');

    // Decrement remaining USB-C Hub from 1 to 0 to remove it
    await page.getByRole('button', { name: 'Decrease quantity of USB-C Hub' }).click();

    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await expect(page.getByLabel('Order total summary')).toContainText('₹0.00');
  });

  test('TC-07: Confirmation persists until Start New Order is clicked and subsequent orders get unique references', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Add to Cart.*USB-C Hub/i }).click();
    await page.getByLabel(/Customer Name/i).fill('Vikram Mehta');
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
    const firstReference = (await page.locator('#order-reference').textContent())?.trim();
    expect(firstReference).toMatch(ORDER_REFERENCE_PATTERN);

    // Explicit reset via Start New Order
    await page.getByRole('button', { name: 'Start New Order' }).click();

    await expect(page.getByRole('heading', { name: 'Product Catalogue' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toHaveCount(0);
    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await expect(page.getByLabel(/Customer Name/i)).toHaveValue('');
    await expect(page.getByLabel('Order total summary')).toContainText('₹0.00');

    // Place a second order and verify unique reference
    await page.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
    await page.getByLabel(/Customer Name/i).fill('Meera Iyer');
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
    const secondReference = (await page.locator('#order-reference').textContent())?.trim();
    expect(secondReference).toMatch(ORDER_REFERENCE_PATTERN);
    expect(secondReference).not.toBe(firstReference);
  });
});
