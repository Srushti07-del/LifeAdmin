/**
 * Currency helpers for LifeAdmin Mobile
 * Default currency is ₹ (INR), currency-aware.
 * Synchronized with client/src/lib/currency.ts.
 */

export type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AED'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'SGD';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  fractionDigits: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', fractionDigits: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', fractionDigits: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE', fractionDigits: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', fractionDigits: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'en-AE', fractionDigits: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', fractionDigits: 2 },
  AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', locale: 'en-AU', fractionDigits: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'en-JP', fractionDigits: 0 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', fractionDigits: 2 },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

const CURRENCY_SYMBOL_TO_ISO: Record<string, CurrencyCode> = {
  '₹': 'INR',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  'د.إ': 'AED',
  'CA$': 'CAD',
  'AU$': 'AUD',
  '¥': 'JPY',
  'S$': 'SGD',
};

export function normalizeCurrencyCode(code: string | undefined | null): CurrencyCode {
  if (!code) return DEFAULT_CURRENCY;
  const trimmed = code.trim();
  const upper = trimmed.toUpperCase();
  const isoCodes = Object.keys(CURRENCIES) as CurrencyCode[];
  if (isoCodes.includes(upper as CurrencyCode)) {
    return upper as CurrencyCode;
  }
  if (CURRENCY_SYMBOL_TO_ISO[trimmed]) {
    return CURRENCY_SYMBOL_TO_ISO[trimmed];
  }
  return DEFAULT_CURRENCY;
}

export function getCurrencyInfo(code?: string | null): CurrencyInfo {
  const c = normalizeCurrencyCode(code);
  return CURRENCIES[c] || CURRENCIES[DEFAULT_CURRENCY];
}

export function formatCurrency(
  amount: number | undefined | null,
  codeOrSymbol: string = '₹',
  options: { showSymbol?: boolean; showCode?: boolean; fractionDigits?: number } = {}
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '—';
  }

  const info = getCurrencyInfo(codeOrSymbol);
  const { showSymbol = true, showCode = false, fractionDigits } = options;

  const minDigits = fractionDigits ?? (amount % 1 === 0 ? 0 : info.fractionDigits);
  const maxDigits = fractionDigits ?? info.fractionDigits;

  const formatted = new Intl.NumberFormat(info.locale, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(amount);

  if (showCode) {
    return `${info.code} ${formatted}`;
  }

  if (showSymbol) {
    return `${info.symbol}${formatted}`;
  }

  return formatted;
}

export function convertAmountTo(
  amount: number,
  fromCode: string | undefined | null,
  toCode: string | undefined | null,
  rates: Record<string, number> = {}
): number {
  const from = normalizeCurrencyCode(fromCode);
  const to = normalizeCurrencyCode(toCode);
  if (from === to) return amount;

  // Both currencies in common-base rates table
  if (rates[from] !== undefined && rates[to] !== undefined && rates[from] > 0) {
    return amount * (rates[to] / rates[from]);
  }

  // Pairwise rate or direct multiplier
  const rate = rates[to];
  if (!rate) return amount;
  return amount * rate;
}
