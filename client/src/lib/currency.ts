export type CurrencyCode =
  | 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD' | 'AUD' | 'JPY' | 'SGD';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  fractionDigits: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee', locale: 'en-IN', fractionDigits: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', fractionDigits: 2 },
  EUR: { code: 'EUR', symbol: '\u20AC', name: 'Euro', locale: 'en-IE', fractionDigits: 2 },
  GBP: { code: 'GBP', symbol: '\u00A3', name: 'British Pound', locale: 'en-GB', fractionDigits: 2 },
  AED: { code: 'AED', symbol: '\u062f.\u0625', name: 'UAE Dirham', locale: 'en-AE', fractionDigits: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', fractionDigits: 2 },
  AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', locale: 'en-AU', fractionDigits: 2 },
  JPY: { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen', locale: 'en-JP', fractionDigits: 0 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', fractionDigits: 2 },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

export function getCurrencyInfo(code?: string | null): CurrencyInfo {
  const c = (code || DEFAULT_CURRENCY) as CurrencyCode;
  return CURRENCIES[c] || CURRENCIES[DEFAULT_CURRENCY];
}

export function formatCurrency(
  amount: number | undefined | null,
  code?: string | null,
  options: { showSymbol?: boolean; showCode?: boolean; fractionDigits?: number } = {}
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '\u2014';
  }
  const info = getCurrencyInfo(code);
  const { showSymbol = true, showCode = false, fractionDigits } = options;
  const nf = new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: info.code,
    minimumFractionDigits: fractionDigits ?? info.fractionDigits,
    maximumFractionDigits: fractionDigits ?? info.fractionDigits,
    currencyDisplay: showCode ? 'code' : 'symbol',
  });
  let result = nf.format(amount);
  if (!showSymbol) {
    result = result.replace(info.symbol, '').trim();
    if (showCode) {
      result = info.code + ' ' + result;
    }
  }
  return result;
}

export function formatAmountOnly(amount: number | undefined | null, code?: string | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '\u2014';
  }
  const info = getCurrencyInfo(code);
  const nf = new Intl.NumberFormat(info.locale, {
    minimumFractionDigits: info.fractionDigits,
    maximumFractionDigits: info.fractionDigits,
  });
  return nf.format(amount);
}

export interface ConversionResult {
  convertedAmount: number;
  rate: number;
  from: CurrencyCode;
  to: CurrencyCode;
}

export function convertCurrency(
  amount: number,
  fromCode: string | undefined | null,
  toCode: string | undefined | null,
  rate: number
): ConversionResult {
  const from = (fromCode || DEFAULT_CURRENCY) as CurrencyCode;
  const to = (toCode || DEFAULT_CURRENCY) as CurrencyCode;
  const convertedAmount = amount * rate;
  return { convertedAmount, rate, from, to };
}

export interface ExchangeRateState {
  rates: Record<string, number>;
  base: string;
  lastUpdated: string | null;
  error: string | null;
}
