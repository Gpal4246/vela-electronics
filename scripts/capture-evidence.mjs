/**
 * Captures genuine Chromium browser screenshots across desktop (1440px),
 * tablet (768px), and mobile (390px) while verifying zero horizontal overflow,
 * zero broken images, and zero console/page errors.
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(ROOT_DIR, 'docs', 'evidence');
const PORT = '4174';
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry until server is ready
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for static server at ${url}`);
}

async function assertViewportHealth(page, label, errors) {
  const metrics = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const images = Array.from(document.querySelectorAll('img')).filter(
      (img) => !img.closest('[hidden]') && !img.hidden,
    );
    const brokenImages = images
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.getAttribute('src'));

    return {
      overflow,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      imageCount: images.length,
      brokenImages,
    };
  });

  if (metrics.overflow) {
    throw new Error(
      `Horizontal overflow on ${label}: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`,
    );
  }
  if (metrics.brokenImages.length > 0) {
    throw new Error(`Broken images on ${label}: ${metrics.brokenImages.join(', ')}`);
  }
  if (errors.length > 0) {
    throw new Error(`Console/page errors on ${label}: ${errors.join(' | ')}`);
  }

  return metrics;
}

async function run() {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });

  const serverProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'scripts', 'serve.mjs')], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT, HOST: '127.0.0.1' },
    stdio: 'pipe',
  });

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();

    try {
      // 1. Desktop (1440x900)
      const desktopErrors = [];
      const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await desktopContext.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') desktopErrors.push(msg.text());
      });
      page.on('pageerror', (err) => desktopErrors.push(err.message));

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const desktopHealth = await assertViewportHealth(page, 'desktop-1440', desktopErrors);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '01-desktop-initial.png'),
        fullPage: false,
      });

      await page.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
      await page.getByRole('button', { name: 'Increase quantity of Wireless Headphones' }).click();
      await page.getByRole('button', { name: /Add to Cart.*USB-C Hub/i }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '02-desktop-populated-cart.png'),
        fullPage: true,
      });

      await page.getByRole('button', { name: 'Place Order' }).click();
      await page.locator('#checkout').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '03-desktop-validation-error.png'),
        fullPage: false,
      });

      await page.getByLabel(/Customer Name/i).fill('Ananya Deshmukh');
      await page.getByRole('button', { name: 'Place Order' }).click();
      await page.getByRole('heading', { name: 'Order Confirmed' }).waitFor({ state: 'visible' });
      await assertViewportHealth(page, 'desktop-1440-confirmed', desktopErrors);
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '04-desktop-order-confirmed.png'),
        fullPage: true,
      });
      await desktopContext.close();

      // 2. Tablet (768x1024)
      const tabletErrors = [];
      const tabletContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const tabletPage = await tabletContext.newPage();
      tabletPage.on('console', (msg) => {
        if (msg.type() === 'error') tabletErrors.push(msg.text());
      });
      tabletPage.on('pageerror', (err) => tabletErrors.push(err.message));

      await tabletPage.goto(BASE_URL, { waitUntil: 'networkidle' });
      await tabletPage.evaluate(() => document.fonts && document.fonts.ready);
      const tabletHealth = await assertViewportHealth(tabletPage, 'tablet-768', tabletErrors);
      await tabletPage.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
      await tabletPage.evaluate(() => window.scrollTo(0, 0));
      await tabletPage.screenshot({
        path: path.join(EVIDENCE_DIR, '05-tablet-checkout.png'),
        fullPage: true,
      });
      await tabletContext.close();

      // 3. Mobile (390x844)
      const mobileErrors = [];
      const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const mobilePage = await mobileContext.newPage();
      mobilePage.on('console', (msg) => {
        if (msg.type() === 'error') mobileErrors.push(msg.text());
      });
      mobilePage.on('pageerror', (err) => mobileErrors.push(err.message));

      await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });
      await mobilePage.evaluate(() => document.fonts && document.fonts.ready);
      const mobileHealth = await assertViewportHealth(mobilePage, 'mobile-390', mobileErrors);
      await mobilePage.getByRole('button', { name: /Add to Cart.*Wireless Headphones/i }).click();
      await mobilePage.evaluate(() => window.scrollTo(0, 0));
      await mobilePage.screenshot({
        path: path.join(EVIDENCE_DIR, '06-mobile-checkout.png'),
        fullPage: true,
      });
      await mobileContext.close();

      console.log(
        JSON.stringify(
          {
            captured: 6,
            desktop: desktopHealth,
            tablet: tabletHealth,
            mobile: mobileHealth,
            consoleErrors: 0,
          },
          null,
          2,
        ),
      );
    } finally {
      await browser.close();
    }
  } finally {
    serverProcess.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
