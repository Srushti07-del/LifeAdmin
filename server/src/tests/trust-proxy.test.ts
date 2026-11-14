import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import rateLimit from 'express-rate-limit';
import app from '../app';

describe('Express Trust Proxy & Rate Limiting IP Resolution Tests', () => {
  it('confirms the primary application sets trust proxy to 1 for Render deployment topology', () => {
    assert.equal(app.get('trust proxy'), 1, "app.get('trust proxy') must be 1 (single reverse proxy hop)");
  });

  it('correctly resolves client IP from X-Forwarded-For header without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR', async () => {
    // Spin up an ephemeral HTTP server using the exported configured app
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api/health`;

    try {
      // Simulate Render proxy passing a client IP
      const clientIp = '203.0.113.195';
      const res = await fetch(baseUrl, {
        headers: {
          'X-Forwarded-For': clientIp,
        },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.status, 'ok');
    } finally {
      server.close();
    }
  });

  it('proves express-rate-limit validates trust proxy correctly and distinguishes different client IPs behind proxy', async () => {
    // Create an isolated express instance mirroring app.ts topology
    const testApp = express();
    testApp.set('trust proxy', 1);

    const hitLog: string[] = [];

    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2, // Allow 2 requests per client IP
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({ message: 'Too many requests' });
      },
    });

    testApp.use('/test-rate-limit', testLimiter, (req, res) => {
      hitLog.push(req.ip as string);
      res.json({ ip: req.ip, ips: req.ips });
    });

    const server = http.createServer(testApp);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const testUrl = `http://127.0.0.1:${port}/test-rate-limit`;

    try {
      const clientA = '198.51.100.10';
      const clientB = '203.0.113.20';

      // 1. Client A sends request 1 -> OK
      const resA1 = await fetch(testUrl, { headers: { 'X-Forwarded-For': clientA } });
      assert.equal(resA1.status, 200);
      const dataA1 = (await resA1.json()) as any;
      assert.equal(dataA1.ip, clientA, 'Must resolve Client A IP');

      // 2. Client A sends request 2 -> OK (max is 2)
      const resA2 = await fetch(testUrl, { headers: { 'X-Forwarded-For': clientA } });
      assert.equal(resA2.status, 200);

      // 3. Client A sends request 3 -> Rate limited (429)
      const resA3 = await fetch(testUrl, { headers: { 'X-Forwarded-For': clientA } });
      assert.equal(resA3.status, 429, 'Client A must be rate limited on 3rd request');

      // 4. Client B sends request 1 -> OK! (NOT affected by Client A, proves distinct tracking)
      const resB1 = await fetch(testUrl, { headers: { 'X-Forwarded-For': clientB } });
      assert.equal(resB1.status, 200, 'Client B must NOT be blocked by Client A rate limit');
      const dataB1 = (await resB1.json()) as any;
      assert.equal(dataB1.ip, clientB, 'Must resolve Client B IP');

      // 5. Multi-hop header: Client C -> Upstream -> Render Proxy
      // With trust proxy = 1, Express trusts 1 hop and extracts the rightmost client IP before Render proxy
      const resMulti = await fetch(testUrl, {
        headers: { 'X-Forwarded-For': '192.0.2.1, 198.51.100.99' },
      });
      assert.equal(resMulti.status, 200);
      const dataMulti = (await resMulti.json()) as any;
      assert.equal(dataMulti.ip, '198.51.100.99', 'Must resolve rightmost untrusted hop before Render proxy');
    } finally {
      server.close();
    }
  });

  it('demonstrates that WITHOUT trust proxy, Express misidentifies client as socket IP and express-rate-limit warns/errors', async () => {
    // Contrast check: create app with trust proxy DISABLED (false, express default)
    const untrustedApp = express();
    // untrustedApp.set('trust proxy', false); (Express default)

    let reportedError: any = null;
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map(a => String(a?.message || a)).join(' ');
      if (msg.includes('ERR_ERL_UNEXPECTED_X_FORWARDED_FOR')) {
        reportedError = msg;
      }
    };

    const contrastLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      validate: {
        xForwardedForHeader: true,
      },
    });

    let observedReqIp = '';
    untrustedApp.use('/untrusted-check', contrastLimiter, (req, res) => {
      observedReqIp = req.ip as string;
      res.json({ ip: req.ip });
    });

    const server = http.createServer(untrustedApp);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/untrusted-check`, {
        headers: { 'X-Forwarded-For': '203.0.113.50' },
      });

      assert.equal(res.status, 200);
      // Without trust proxy configured, Express ignores X-Forwarded-For and reports socket IP (127.0.0.1)
      assert.notEqual(observedReqIp, '203.0.113.50', 'Without trust proxy, client IP is NOT resolved');
      assert.ok(
        observedReqIp === '127.0.0.1' || observedReqIp === '::ffff:127.0.0.1' || observedReqIp === '::1',
        `Observed socket IP instead of client: ${observedReqIp}`
      );
      // And express-rate-limit detects the mismatch and triggers ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
      assert.ok(reportedError, 'express-rate-limit must flag ERR_ERL_UNEXPECTED_X_FORWARDED_FOR when trust proxy is disabled');
      assert.match(reportedError, /ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/);
    } finally {
      console.error = originalConsoleError;
      server.close();
    }
  });
});
