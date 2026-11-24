/**
 * Fixed product catalogue for Vela Electronics.
 * All prices are stored strictly as integer paise (1 INR = 100 paise)
 * to eliminate floating-point arithmetic errors.
 */

export const PRODUCTS = Object.freeze([
  Object.freeze({
    id: 'wireless-headphones',
    name: 'Wireless Headphones',
    description: 'Closed-back over-ear listening hardware finished in matte obsidian.',
    pricePaise: 149900,
    image: '/src/assets/images/product_dark_headphones_1795440162724.jpg',
    imageAlt: 'Matte obsidian over-ear Wireless Headphones resting on dark honed basalt stone',
  }),
  Object.freeze({
    id: 'usb-c-hub',
    name: 'USB-C Hub',
    description: 'Compact machined aluminum expansion hub with a braided host cable.',
    pricePaise: 79900,
    image: '/src/assets/images/product_dark_usbc_hub_1795440164304.jpg',
    imageAlt: 'Machined dark gunmetal aluminum USB-C Hub with coiled braided cable on basalt stone',
  }),
]);

export const PRODUCTS_BY_ID = Object.freeze(
  Object.fromEntries(PRODUCTS.map((product) => [product.id, product])),
);

export const MAX_ITEM_QUANTITY = 99;
