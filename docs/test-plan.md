# Risk-Prioritised Test Plan — Vela Electronics Mini Checkout

## 1. Scope & Objectives

Verify all functional, monetary, validation, idempotency, accessibility, and responsive requirements of the client-side **Vela Electronics Mini Checkout** application in a real Chromium browser using Playwright Test.

- **System Under Test**: Static HTML, CSS, and vanilla JavaScript application served locally via Node.js (`scripts/serve.mjs`).
- **Fixed Catalogue**:
  - `Wireless Headphones` — `₹1,499.00` (`149900` integer paise)
  - `USB-C Hub` — `₹799.00` (`79900` integer paise)
- **Out of Scope**: Payment gateways, backend APIs, persistent databases, taxes, discounts, shipping rates, and dynamic pricing.

## 2. Test Isolation & Automation Principles

- Every test executes in an isolated Playwright browser context starting at `/` with a clean state.
- Locators prioritise customer-visible accessible roles and labels (`getByRole`, `getByLabel`, `getByText`).
- Synchronisation uses Playwright's auto-waiting web-first assertions (`toBeVisible`, `toHaveText`, `toHaveCount`, `toHaveValue`, `toBeDisabled`) with zero arbitrary fixed waits.

## 3. Risk-Prioritised Test Matrix

### Priority P0 — Critical Financial & Order Integrity Risks

| ID | Risk Area | Requirement Covered | Test Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Broken happy path or malformed confirmation | Req 1, 4, 5, 8 | Add both products, enter valid customer name, submit **Place Order** | Checkout workspace is replaced by exactly one **Order Confirmed** screen showing a unique `ORD-YYYYMMDD-NNN-XXXXXX` reference, customer name, purchased items, quantities, and exact total (`₹2,298.00`). |
| **TC-02** | Duplicate orders from rapid repeated clicks | Req 8, 9 | Populate valid cart and customer name; trigger rapid double-click on **Place Order** | Synchronous submission lock prevents duplicate processing; exactly one confirmation region and one order reference are rendered; submit button is disabled and hidden. |
| **TC-03** | Floating-point drift or broken INR formatting | Req 3, 4, 10 | Add both products; change quantities via `+` stepper and direct numeric input (`2 × ₹1,499.00 + 3 × ₹799.00`, and `99 × ₹1,499.00`) | Individual line totals (`₹2,998.00`, `₹2,397.00`, `₹1,48,401.00`) and order totals (`₹5,395.00`, `₹1,50,798.00`) update immediately with exact integer paise math and `en-IN` grouping. |

### Priority P1 — Validation Guards & Cart Accuracy Risks

| ID | Risk Area | Requirement Covered | Test Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-04** | Checkout permitted without customer identity or losing cart on error | Req 5, 6, 7 | Add product, submit with blank name, then submit with whitespace-only `"     "` | Checkout is blocked, zero confirmations appear, accessible validation alert is shown, `aria-invalid="true"` is set, and cart items/totals remain intact. |
| **TC-05** | Empty-cart order creation or erasing customer input on error | Req 6, 7 | Enter customer name with empty cart and submit **Place Order** | Checkout is blocked, empty-cart validation alert is shown, total stays `₹0.00`, and the entered customer name is preserved. |
| **TC-06** | Stale totals or broken empty state after removal | Req 2, 3, 4 | Add both products; remove one with **Remove**, then decrement remaining product from `1` to `0` | Removed line disappears immediately, totals recalculate accurately (`₹2,298.00` → `₹799.00` → `₹0.00`), and empty-cart state is restored. |

### Priority P2 — State Lifecycle & Visual/Responsive Verification

| ID | Risk Area | Requirement Covered | Test Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-07** | Confirmation leakage or colliding order references | Req 8, 9 | Complete an order, click **Start New Order**, then place a second order | Confirmation remains until explicit reset; **Start New Order** restores empty cart and blank name; second order receives a strictly distinct reference number. |
| **Visual Inspection** | Responsive overflow, contrast, or layout defects | Quality controls | Inspect live Chromium captures at `1440×900` (desktop) and `390×844` (mobile) | Zero broken images, zero horizontal overflow, clear visual hierarchy, legible INR numerals, and uncluttered minimalist layout. |

## 4. Exit Criteria

1. All 7 automated Playwright tests pass in Chromium with zero skipped or flaky runs.
2. Live browser screenshots are captured and visually inspected across desktop and mobile viewports.
3. Any defect discovered during testing or visual inspection is fixed and verified by re-running the full suite.
