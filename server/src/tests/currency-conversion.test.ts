import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ---- Pure conversion logic (mirrors client/src/lib/currency.ts) ----
const DEFAULT_CURRENCY = 'INR';

const CURRENCY_SYMBOL_TO_ISO: Record<string, string> = {
  '₹': 'INR',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  'CA$': 'CAD',
  'AU$': 'AUD',
  '¥': 'JPY',
  'S$': 'SGD',
};

function normalizeCurrencyCode(code: string | undefined | null): string {
  if (!code) return DEFAULT_CURRENCY;
  const trimmed = code.trim();
  const isoCodes = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'JPY', 'SGD'];
  if (isoCodes.includes(trimmed)) return trimmed;
  if (CURRENCY_SYMBOL_TO_ISO[trimmed]) return CURRENCY_SYMBOL_TO_ISO[trimmed];
  return DEFAULT_CURRENCY;
}

function convertCurrency(
  amount: number,
  fromCode: string | undefined | null,
  toCode: string | undefined | null,
  rate: number
) {
  const from = normalizeCurrencyCode(fromCode);
  const to = normalizeCurrencyCode(toCode);
  const convertedAmount = amount * rate;
  return { convertedAmount, rate, from, to };
}

function convertAmountTo(
  amount: number,
  fromCode: string | undefined | null,
  toCode: string | undefined | null,
  rates: Record<string, number>
) {
  const from = normalizeCurrencyCode(fromCode);
  const to = normalizeCurrencyCode(toCode);
  if (from === to) return amount;
  const rate = rates[to];
  if (!rate) return amount;
  return amount * rate;
}

// ---- Server-side exchange rate service ----
import {
  getExchangeRate,
  clearRateCache,
} from '../services/exchangeRate';

const originalFetch = global.fetch;
let mockFetch: ((url: string, init?: any) => Promise<Response>) | null = null;

function setMockFetch(fn: (url: string, init?: any) => Promise<Response>) {
  mockFetch = fn;
  global.fetch = fn as any;
}

function restoreFetch() {
  global.fetch = originalFetch;
}

function mockJsonResponse(data: any, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('Currency Conversion Tests', () => {
  describe('normalizeCurrencyCode', () => {
    it('passes through ISO codes unchanged', () => {
      assert.equal(normalizeCurrencyCode('INR'), 'INR');
      assert.equal(normalizeCurrencyCode('USD'), 'USD');
      assert.equal(normalizeCurrencyCode('EUR'), 'EUR');
    });

    it('normalizes rupee symbol ₹ to INR', () => {
      assert.equal(normalizeCurrencyCode('₹'), 'INR');
    });

    it('normalizes dollar symbol $ to USD', () => {
      assert.equal(normalizeCurrencyCode('$'), 'USD');
    });

    it('normalizes euro symbol € to EUR', () => {
      assert.equal(normalizeCurrencyCode('€'), 'EUR');
    });

    it('normalizes pound symbol £ to GBP', () => {
      assert.equal(normalizeCurrencyCode('£'), 'GBP');
    });

    it('defaults unknown symbols to INR', () => {
      assert.equal(normalizeCurrencyCode('XYZ'), 'INR');
      assert.equal(normalizeCurrencyCode(null), 'INR');
      assert.equal(normalizeCurrencyCode(undefined), 'INR');
      assert.equal(normalizeCurrencyCode(''), 'INR');
    });
  });

  describe('convertCurrency (pure function)', () => {
    it('converts INR to USD at given rate', () => {
      const result = convertCurrency(1000, 'INR', 'USD', 0.012);
      assert.equal(result.from, 'INR');
      assert.equal(result.to, 'USD');
      assert.equal(result.rate, 0.012);
      assert.equal(result.convertedAmount, 12);
    });

    it('converts USD to EUR at given rate', () => {
      const result = convertCurrency(100, 'USD', 'EUR', 0.92);
      assert.equal(result.convertedAmount, 92);
    });

    it('normalizes symbol ₹ in fromCode', () => {
      const result = convertCurrency(1000, '₹', 'USD', 0.012);
      assert.equal(result.from, 'INR');
      assert.equal(result.convertedAmount, 12);
    });

    it('normalizes symbol $ in toCode', () => {
      const result = convertCurrency(8333, 'INR', '$', 0.012);
      assert.equal(result.to, 'USD');
      assert.equal(result.convertedAmount, 99.996);
    });

    it('does not compound when converting same currency', () => {
      const result = convertCurrency(500, 'USD', 'USD', 1);
      assert.equal(result.convertedAmount, 500);
    });
  });

  describe('convertAmountTo (pure function)', () => {
    it('converts amount using provided rate', () => {
      const rates = { USD: 0.012, EUR: 0.011 };
      const result = convertAmountTo(1000, 'INR', 'USD', rates);
      assert.equal(result, 12);
    });

    it('normalizes symbol ₹ in fromCode', () => {
      const rates = { USD: 0.012 };
      const result = convertAmountTo(1000, '₹', 'USD', rates);
      assert.equal(result, 12);
    });

    it('returns original amount when currencies match', () => {
      const result = convertAmountTo(500, 'USD', 'USD', {});
      assert.equal(result, 500);
    });

    it('returns original amount when rate is missing (graceful degradation)', () => {
      const result = convertAmountTo(1000, 'INR', 'USD', {});
      assert.equal(result, 1000);
    });

    it('does not compound on repeated conversion (original → target each time)', () => {
      const rates = { USD: 0.012 };
      const originalAmount = 1000;
      const first = convertAmountTo(originalAmount, 'INR', 'USD', rates); // 12
      const ratesBack = { INR: 83.33 };
      const back = convertAmountTo(first, 'USD', 'INR', ratesBack); // 12 * 83.33 ≈ 1000
      assert.ok(back > 990 && back < 1010);
    });

    it('handles undefined fromCode by defaulting to INR', () => {
      const rates = { USD: 0.012 };
      const result = convertAmountTo(1000, undefined, 'USD', rates);
      assert.equal(result, 12);
    });

    it('handles undefined toCode by defaulting to INR', () => {
      const rates = { INR: 83.33 };
      const result = convertAmountTo(100, 'USD', undefined, rates);
      assert.equal(result, 8333);
    });

    it('switches INR → USD → EUR → INR without compounding', () => {
      const inrToUsd = { USD: 0.012 };
      const usdToEur = { EUR: 0.92 };
      const eurToInr = { INR: 90.0 };

      // INR → USD
      const usdAmount = convertAmountTo(1000, 'INR', 'USD', inrToUsd); // 12
      // USD → EUR
      const eurAmount = convertAmountTo(usdAmount, 'USD', 'EUR', usdToEur); // 11.04
      // EUR → INR
      const finalInr = convertAmountTo(eurAmount, 'EUR', 'INR', eurToInr); // 993.6 ≈ 1000
      assert.ok(finalInr > 990 && finalInr < 1010);
    });
  });

  describe('getExchangeRate (server service)', () => {
    beforeEach(() => {
      clearRateCache();
    });

    afterEach(() => {
      restoreFetch();
    });

    it('returns rate of 1 when from equals to', async () => {
      const result = await getExchangeRate('INR', 'INR');
      assert.ok(result);
      assert.equal(result.rates.INR, 1);
      assert.equal(result.fromCache, true);
    });

    it('fetches INR → USD rate from Frankfurter API', async () => {
      setMockFetch(async () => mockJsonResponse({ base: 'INR', rates: { USD: 0.012 }, date: '2026-01-01' }));
      const result = await getExchangeRate('INR', 'USD');
      assert.ok(result);
      assert.equal(result.rates.USD, 0.012);
      assert.equal(result.fromCache, false);
    });

    it('fetches INR → EUR rate from Frankfurter API', async () => {
      setMockFetch(async () => mockJsonResponse({ base: 'INR', rates: { EUR: 0.011 }, date: '2026-01-01' }));
      const result = await getExchangeRate('INR', 'EUR');
      assert.ok(result);
      assert.equal(result.rates.EUR, 0.011);
    });

    it('fetches USD → INR rate from Frankfurter API', async () => {
      setMockFetch(async () => mockJsonResponse({ base: 'USD', rates: { INR: 83.33 }, date: '2026-01-01' }));
      const result = await getExchangeRate('USD', 'INR');
      assert.ok(result);
      assert.equal(result.rates.INR, 83.33);
    });

    it('normalizes ₹ symbol to INR before API call', async () => {
      let capturedUrl = '';
      setMockFetch(async (url: string) => {
        capturedUrl = url;
        return mockJsonResponse({ base: 'INR', rates: { USD: 0.012 }, date: '2026-01-01' });
      });
      await getExchangeRate('₹', 'USD');
      assert.ok(capturedUrl.includes('from=INR'), 'Expected URL to contain from=INR, got: ' + capturedUrl);
      assert.ok(!capturedUrl.includes('from=%E2%82%B9'), 'URL should not contain encoded ₹ symbol');
    });

    it('returns cached rate on second call', async () => {
      setMockFetch(async () => mockJsonResponse({ base: 'INR', rates: { USD: 0.012 }, date: '2026-01-01' }));
      await getExchangeRate('INR', 'USD'); // populate cache
      const result = await getExchangeRate('INR', 'USD'); // from cache
      assert.ok(result);
      assert.equal(result.fromCache, true);
    });

    it('computes cross-rate when base differs', async () => {
      setMockFetch(async (url: string) => {
        const from = new URL(url).searchParams.get('from');
        if (from === 'INR') {
          return mockJsonResponse({ base: 'INR', rates: { EUR: 0.011 }, date: '2026-01-01' });
        }
        return mockJsonResponse({ base: 'EUR', rates: { INR: 90, USD: 1.08 }, date: '2026-01-01' });
      });
      const result = await getExchangeRate('INR', 'USD');
      assert.ok(result);
      // Cross rate: USD_rate / INR_rate = 1.08 / 90 = 0.012
      assert.ok(Math.abs(result.rates.USD - 0.012) < 0.0001);
    });

    it('gracefully handles API 404', async () => {
      setMockFetch(async () => mockJsonResponse({ error: 'not found' }, 404));
      const result = await getExchangeRate('INR', 'USD');
      assert.equal(result, null);
    });

    it('gracefully handles network failure', async () => {
      setMockFetch(async () => {
        throw new Error('Network error');
      });
      const result = await getExchangeRate('INR', 'USD');
      assert.equal(result, null);
    });

    it('returns null when cache is cleared and API fails', async () => {
      clearRateCache();
      setMockFetch(async () => {
        throw new Error('Network error');
      });
      const result = await getExchangeRate('INR', 'USD');
      assert.equal(result, null);
    });
  });
});
