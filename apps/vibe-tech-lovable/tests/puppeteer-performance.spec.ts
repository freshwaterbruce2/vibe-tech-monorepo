import { test, expect } from '@playwright/test';
import puppeteer, { PredefinedNetworkConditions } from 'puppeteer';

const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8082';
const APP_HOST = new URL(APP_BASE_URL).hostname;
const HOMEPAGE_LOAD_BUDGET_MS = Number(process.env.PLAYWRIGHT_HOMEPAGE_BUDGET_MS ?? 30000);
const MOBILE_LOAD_BUDGET_MS = Number(process.env.PLAYWRIGHT_MOBILE_BUDGET_MS ?? 60000);
const MAX_IMAGE_BYTES = Number(process.env.PLAYWRIGHT_MAX_IMAGE_BYTES ?? 6 * 1024 * 1024);
const MAX_TOTAL_IMAGE_BYTES = Number(
  process.env.PLAYWRIGHT_MAX_TOTAL_IMAGE_BYTES ?? 20 * 1024 * 1024,
);

const isAppResponse = (url: string): boolean => {
  try {
    return new URL(url).hostname === APP_HOST;
  } catch {
    return false;
  }
};

const toNumber = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const closePageQuietly = async (page: puppeteer.Page): Promise<void> => {
  await page.close().catch(() => {});
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

test.describe('Performance Tests with Puppeteer', () => {
  test.describe.configure({ mode: 'serial' });

  let browser: puppeteer.Browser;

  test.beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('should load homepage within performance budget', async () => {
    const page = await browser.newPage();

    try {
      await page.setCacheEnabled(false);

      const startTime = Date.now();
      const response = await page.goto(APP_BASE_URL, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      expect(response?.ok()).toBeTruthy();
      expect(loadTime).toBeLessThan(HOMEPAGE_LOAD_BUDGET_MS);
    } finally {
      await closePageQuietly(page);
    }
  });

  test('should have good Core Web Vitals', async () => {
    const page = await browser.newPage();

    try {
      await page.goto(APP_BASE_URL, { waitUntil: 'networkidle2' });

      const metrics = await page.metrics();
      expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1024 * 1024);
      expect(metrics.Nodes).toBeLessThan(2000);
    } finally {
      await closePageQuietly(page);
    }
  });

  test('should handle large data sets efficiently', async () => {
    const page = await browser.newPage();

    try {
      const response = await page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      const metrics = await page.metrics();

      expect(response?.ok()).toBeTruthy();
      expect(metrics.JSHeapUsedSize).toBeLessThan(100 * 1024 * 1024);
    } finally {
      await closePageQuietly(page);
    }
  });

  test('should be optimized for mobile performance', async () => {
    test.setTimeout(90000);
    const page = await browser.newPage();

    try {
      await page.emulateNetworkConditions(PredefinedNetworkConditions['Fast 3G']);
      await page.emulate({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      });
      page.setDefaultNavigationTimeout(MOBILE_LOAD_BUDGET_MS);

      const startTime = Date.now();
      const response = await page.goto(APP_BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: MOBILE_LOAD_BUDGET_MS,
      });
      const loadTime = Date.now() - startTime;

      expect(response).not.toBeNull();
      expect(response?.status() ?? 0).toBeLessThan(500);
      expect(loadTime).toBeLessThan(MOBILE_LOAD_BUDGET_MS);

    } finally {
      await closePageQuietly(page);
    }
  });

  test('should have optimized images and assets', async () => {
    const page = await browser.newPage();
    const responses: puppeteer.HTTPResponse[] = [];

    try {
      page.on('response', (response) => {
        responses.push(response);
      });

      await page.goto(APP_BASE_URL, { waitUntil: 'networkidle2' });

      const imageResponses = responses.filter(
        (response) =>
          response.headers()['content-type']?.startsWith('image/') && isAppResponse(response.url()),
      );

      let totalImageBytes = 0;
      for (const imageResponse of imageResponses) {
        const contentLength = toNumber(imageResponse.headers()['content-length']);
        totalImageBytes += contentLength;
        expect(contentLength).toBeLessThan(MAX_IMAGE_BYTES);
      }

      expect(totalImageBytes).toBeLessThan(MAX_TOTAL_IMAGE_BYTES);

      const assetResponses = responses.filter(
        (response) =>
          (response.headers()['content-type']?.includes('css') ||
            response.headers()['content-type']?.includes('javascript')) &&
          isAppResponse(response.url()),
      );

      for (const assetResponse of assetResponses) {
        const contentEncoding = assetResponse.headers()['content-encoding'];
        if (contentEncoding) {
          expect(['gzip', 'br', 'deflate']).toContain(contentEncoding);
        }
      }
    } finally {
      await closePageQuietly(page);
    }
  });

  test('should handle memory leaks properly', async () => {
    const page = await browser.newPage();

    try {
      await page.goto(APP_BASE_URL, { waitUntil: 'domcontentloaded' });
      const initialMetrics = await page.metrics();

      const routes = ['/portfolio', '/services', '/about', '/tools', '/dashboard'];
      for (const route of routes) {
        await page.goto(`${APP_BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        await sleep(300);
      }

      const finalMetrics = await page.metrics();
      const memoryGrowth = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
      expect(memoryGrowth).toBeLessThan(75 * 1024 * 1024);
    } finally {
      await closePageQuietly(page);
    }
  });

  test('should handle concurrent users simulation', async () => {
    const concurrentPages = 3;
    const pages = await Promise.all(
      Array.from({ length: concurrentPages }, async () => browser.newPage()),
    );

    try {
      const startTime = Date.now();
      const responses = await Promise.all(
        pages.map(async (page) => {
          return page.goto(`${APP_BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
        }),
      );
      const loadTime = Date.now() - startTime;

      for (const response of responses) {
        expect(response).not.toBeNull();
        expect(response?.status() ?? 0).toBeLessThan(500);
      }
      expect(loadTime).toBeLessThan(20000);
    } finally {
      await Promise.all(pages.map(async (page) => closePageQuietly(page)));
    }
  });
});
