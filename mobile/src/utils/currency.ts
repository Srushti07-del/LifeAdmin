/**
 * Currency formatting helper for LifeAdmin Mobile
 * Default currency is ₹ (INR), currency-aware.
 */

export function formatCurrency(amount: number | undefined | null, currencySymbol: string = '₹'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '';
  }

  // Format with Indian Numbering System (e.g. 1,00,000) or standard locale
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return `${currencySymbol}${formatted}`;
}
