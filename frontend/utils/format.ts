/**
 * Format a number as Indian Rupees (₹)
 */
export const formatMoney = (amount: number): string => {
  return `₹${amount.toLocaleString()}`;
};

/**
 * Format money in abbreviated form (e.g., 150k, 1.5L)
 */
export const formatMoneyShort = (amount: number): string => {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `₹${amount}`;
};

/**
 * Format a percentage
 */
export const formatPercent = (value: number): string => {
  return `${value}%`;
};
