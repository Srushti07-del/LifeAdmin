import config from '../config';

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'JPY', 'SGD'];

// Map currency symbols to ISO 4217 codes — defensive normalization so that
// legacy data or UI inputs that carry symbols (₹, $, €, £) never reach the
// Frankfurter API, which expects ISO codes only.
const CURRENCY_SYMBOL_TO_ISO: Record<string, string> = {
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

function normalizeCurrencyCode(code: string): string {
  if (!code) return 'INR';
  const trimmed = code.trim();
  // Already an ISO code?
  if (SUPPORTED_CURRENCIES.includes(trimmed)) return trimmed;
  // Symbol → ISO
  if (CURRENCY_SYMBOL_TO_ISO[trimmed]) return CURRENCY_SYMBOL_TO_ISO[trimmed];
  // Fallback: strip common symbol prefixes and try again
  const stripped = trimmed.replace(/[₹$€£]/g, '').trim().toUpperCase();
  if (SUPPORTED_CURRENCIES.includes(stripped)) return stripped;
  return 'INR';
}

// In-memory cache
let rateCache: {
  rates: Record<string, number>;
  base: string;
  lastUpdated: number;
} | null = null;

export interface ExchangeRateResult {
  base: string;
  rates: Record<string, number>;
  lastUpdated: string;
  fromCache: boolean;
}

async function fetchRatesFromAPI(base: string): Promise<ExchangeRateResult> {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
    const data = (await res.json()) as { base: string; rates: Record<string, number>; date: string };
    return {
      base: data.base,
      rates: data.rates,
      lastUpdated: data.date,
      fromCache: false,
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function isCacheValid(cache: { lastUpdated: number }): boolean {
  return Date.now() - cache.lastUpdated < CACHE_TTL_MS;
}

function getCachedRate(cache: { rates: Record<string, number>; base: string; lastUpdated: number }, from: string, to: string): number | null {
  if (!cache || !isCacheValid(cache)) return null;
  if (from === cache.base) {
    const rate = cache.rates[to];
    return rate != null ? rate : null;
  }
  // Cross-rate conversion: from -> base -> to
  const rateFromBase = cache.rates[from];
  const rateToBase = cache.rates[to];
  if (rateFromBase && rateToBase) {
    return rateToBase / rateFromBase;
  }
  return null;
}

export async function getExchangeRate(from: string, to: string): Promise<ExchangeRateResult | null> {
  // Normalize currency symbols → ISO codes before any API call
  const fromNorm = normalizeCurrencyCode(from);
  const toNorm = normalizeCurrencyCode(to);

  if (fromNorm === toNorm) {
    return { base: fromNorm, rates: { [toNorm]: 1 }, lastUpdated: new Date().toISOString(), fromCache: true };
  }

  // Try cache first
  if (rateCache && isCacheValid(rateCache)) {
    const directRate = getCachedRate(rateCache, fromNorm, toNorm);
    if (directRate !== null) {
      return {
        base: rateCache.base,
        rates: { [toNorm]: directRate },
        lastUpdated: new Date(rateCache.lastUpdated).toISOString(),
        fromCache: true,
      };
    }
  }

  // Fetch from API with base = fromNorm (most direct)
  try {
    const data = await fetchRatesFromAPI(fromNorm);
    if (data.rates[toNorm] != null) {
      // Update cache with this base
      rateCache = { rates: data.rates, base: data.base, lastUpdated: Date.now() };
      return { ...data, fromCache: false };
    }
  } catch (err) {
    console.warn('Exchange rate API fetch failed (base=' + fromNorm + '):', err);
  }

  // Fallback: try fetching with a common base (INR or USD) and compute cross-rate
  for (const fallbackBase of ['INR', 'USD']) {
    if (fallbackBase === fromNorm) continue;
    try {
      if (rateCache && isCacheValid(rateCache) && rateCache.base === fallbackBase) {
        // Already cached with this base
        const rate = getCachedRate(rateCache, fromNorm, toNorm);
        if (rate !== null) {
          return {
            base: rateCache.base,
            rates: { [toNorm]: rate },
            lastUpdated: new Date(rateCache.lastUpdated).toISOString(),
            fromCache: true,
          };
        }
      } else {
        const data = await fetchRatesFromAPI(fallbackBase);
        rateCache = { rates: data.rates, base: data.base, lastUpdated: Date.now() };
        const rate = getCachedRate(rateCache, fromNorm, toNorm);
        if (rate !== null) {
          return {
            base: rateCache.base,
            rates: { [toNorm]: rate },
            lastUpdated: new Date(rateCache.lastUpdated).toISOString(),
            fromCache: false,
          };
        }
      }
    } catch (err) {
      console.warn('Exchange rate API fetch failed (base=' + fallbackBase + '):', err);
    }
  }

  // Return last known cache even if expired, as a graceful fallback
  if (rateCache) {
    const rate = getCachedRate(rateCache, fromNorm, toNorm);
    if (rate !== null) {
      return {
        base: rateCache.base,
        rates: { [toNorm]: rate },
        lastUpdated: new Date(rateCache.lastUpdated).toISOString(),
        fromCache: true,
      };
    }
  }

  return null;
}

export function getSupportedCurrencies(): string[] {
  return SUPPORTED_CURRENCIES;
}

export function clearRateCache(): void {
  rateCache = null;
}
