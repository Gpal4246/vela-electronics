# Test Results — Vela Electronics Art-Directed Editorial Storefront

All results below reflect **actually executed** Playwright Chromium test runs and multi-viewport live browser inspections conducted against the final codebase.

## 1. Execution Environment

- **Runner**: `@playwright/test` (`1.65.1`)
- **Browser**: Chromium (`Chrome for Testing 159.0.8154.6`, headless)
- **Server Under Test**: Local Node.js static server (`node scripts/serve.mjs` at `http://127.0.0.1:4173`)
- **Test Suite**: Unmodified existing suite (`tests/checkout.spec.mjs`)
- **Command Executed**: `npm test`
- **Final Run Outcome**: **7 passed, 0 failed** (`23.8s` total)

## 2. Automated Browser Test Summary (Final Verified Run)

| ID | Priority | Test Case | Status | Observed Duration |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | P0 | Successful checkout displays one confirmation and a unique order reference | **PASS** | `2.8s` |
| **TC-02** | P0 | Rapid double-click on Place Order prevents duplicate orders | **PASS** | `2.7s` |
| **TC-03** | P0 | Changing quantities updates individual line totals and exact visible INR total | **PASS** | `2.7s` |
| **TC-04** | P1 | Missing or whitespace-only customer name prevents checkout and displays validation | **PASS** | `3.1s` |
| **TC-05** | P1 | Empty-cart checkout prevents submission without losing entered customer name | **PASS** | `2.2s` |
| **TC-06** | P1 | Removing products recalculates totals accurately and restores empty cart state | **PASS** | `2.9s` |
| **TC-07** | P2 | Confirmation persists until Start New Order is clicked and subsequent orders get unique references | **PASS** | `4.7s` |

## 3. Multi-Viewport Browser Health & Visual Inspection (`npm run evidence`)

| Viewport | Dimensions | Horizontal Overflow | Visible Images Loaded | Broken Images | Console / Page Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop** | `1440×900` | None (`1440 / 1440`) | `4 / 4` | `0` | `0` |
| **Tablet** | `768×1024` | None (`768 / 768`) | `4 / 4` | `0` | `0` |
| **Mobile** | `390×844` | None (`390 / 390`) | `4 / 4` | `0` | `0` |

## 4. Defects Identified & Fixed During Art-Direction Pass

1. **Empty `0`-Byte Image File Detected on Inspection**:
   - *Observation*: Inspecting `src/assets/images/` revealed a `0`-byte leftover file (`hero_vela_editorial_1795440163324.jpg`) from an earlier upstream 502 error.
   - *Fix*: Deleted the empty file and generated a verified `16:9` dark-studio headphone campaign photograph (`hero_dark_headphones_1795442049816.jpg`) matching the obsidian/basalt lighting of the product and story images.
2. **Orphan `(₹).` Line Wrap Next to `Product Catalogue` Heading**:
   - *Observation*: Inspecting `02-desktop-populated-cart.png`, `05-tablet-checkout.png`, and `06-mobile-checkout.png` showed `(₹).` wrapping alone onto a second line.
   - *Fix*: Tightened copy to `Two permanent objects. Fixed INR (₹) pricing.`, widened `.collection-note` to `38ch` with `text-wrap: balance`, re-ran `npm test` (**7 passed**) and `npm run evidence` (all 3 viewports healthy).

## 5. Genuine Browser Screenshot Evidence

- `docs/evidence/01-desktop-initial.png` — Desktop (`1440×900`) full-bleed dark editorial hero and minimal header.
- `docs/evidence/02-desktop-populated-cart.png` — Full desktop storefront with seamless marquee, asymmetrical unboxed product showcases, editorial brand story, and open hairline Bag & Checkout (`₹3,797.00`).
- `docs/evidence/03-desktop-validation-error.png` — Desktop checkout validation alert preserving cart contents.
- `docs/evidence/04-desktop-order-confirmed.png` — Dedicated dark editorial **Order Confirmed** receipt (`ORD-...`, customer name, itemized summary, final total, `Start New Order`).
- `docs/evidence/05-tablet-checkout.png` — Responsive tablet (`768×1024`) layout verification.
- `docs/evidence/06-mobile-checkout.png` — Responsive mobile (`390×844`) layout verification.
