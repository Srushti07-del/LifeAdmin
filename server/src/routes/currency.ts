import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getExchangeRate, getSupportedCurrencies, clearRateCache } from '../services/exchangeRate';

const router = Router();
router.use(authenticate);

// GET /api/currency/supported — List supported currency codes
router.get('/supported', async (_req: Request, res: Response): Promise<void> => {
  res.json({ currencies: getSupportedCurrencies() });
});

// GET /api/currency/rates?from=INR&to=USD — Get exchange rate between two currencies
router.get('/rates', async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      res.status(400).json({ message: 'from and to query parameters are required' });
      return;
    }
    const result = await getExchangeRate(String(from), String(to));
    if (!result) {
      res.status(502).json({ message: 'Unable to fetch exchange rate at this time' });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Exchange rate error:', error);
    res.status(500).json({ message: 'Failed to fetch exchange rate' });
  }
});

// POST /api/currency/rates/refresh — Refresh cached exchange rates
router.post('/rates/refresh', async (_req: Request, res: Response): Promise<void> => {
  try {
    clearRateCache();
    // Prime the cache with INR base
    const { getExchangeRate: getRate } = require('../services/exchangeRate');
    await getRate('INR', 'USD');
    res.json({ message: 'Exchange rate cache refreshed' });
  } catch (error) {
    console.error('Exchange rate refresh error:', error);
    res.status(500).json({ message: 'Failed to refresh exchange rates' });
  }
});

export default router;
