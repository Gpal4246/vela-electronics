/**
 * Integer-based Indian Rupee (INR) currency utilities.
 * Every monetary calculation operates strictly on safe integers in paise.
 */

const INDIAN_INTEGER_FORMATTER = new Intl.NumberFormat('en-IN');

/**
 * Calculates a line item total in integer paise.
 * @param {number} unitPricePaise
 * @param {number} quantity
 * @returns {number}
 */
export function calculateLineTotalPaise(unitPricePaise, quantity) {
  if (!Number.isInteger(unitPricePaise) || unitPricePaise < 0) {
    throw new RangeError(`Expected non-negative integer unitPricePaise, received: ${unitPricePaise}`);
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`Expected non-negative integer quantity, received: ${quantity}`);
  }
  return unitPricePaise * quantity;
}

/**
 * Sums line totals in integer paise across cart items.
 * @param {Array<{ unitPricePaise: number, quantity: number }>} items
 * @returns {number}
 */
export function calculateOrderTotalPaise(items) {
  let totalPaise = 0;
  for (const item of items) {
    totalPaise += calculateLineTotalPaise(item.unitPricePaise, item.quantity);
  }
  return totalPaise;
}

/**
 * Formats an integer paise value as an Indian Rupee string using en-IN grouping
 * without floating-point division.
 * Example: 149900 -> "₹1,499.00", 14990000 -> "₹1,49,900.00"
 * @param {number} paise
 * @returns {string}
 */
export function formatPaiseToINR(paise) {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new RangeError(`Expected non-negative integer paise, received: ${paise}`);
  }
  const wholeRupees = Math.floor(paise / 100);
  const remainderPaise = paise % 100;
  const formattedRupees = INDIAN_INTEGER_FORMATTER.format(wholeRupees);
  const formattedPaise = String(remainderPaise).padStart(2, '0');
  return `₹${formattedRupees}.${formattedPaise}`;
}
