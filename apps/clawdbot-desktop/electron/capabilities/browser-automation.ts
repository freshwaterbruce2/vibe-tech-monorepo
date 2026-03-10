/**
 * Browser Automation - Full Chrome control via Playwright
 * Allows ClawdBot to browse the web, fill forms, extract data, take screenshots
 */

import * as fs from 'fs';
import * as path from 'path';
import { BrowserContext, Page, chromium } from 'playwright';

export class BrowserAutomation {
  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map();
  private userDataDir: string;

  constructor(userDataDir: string) {
    this.userDataDir = userDataDir;
  }

  /**
   * Launch Chrome browser with persistent context
   */
  async launch(): Promise<void> {
    if (this.context) {
       
      console.log('[Browser] Already running');
      return;
    }

     
    console.log('[Browser] Launching Chrome with profile:', this.userDataDir);

    // Ensure user data directory exists
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    this.context = await chromium.launchPersistentContext(this.userDataDir, {
      headless: false, // Visible browser for full control
      viewport: { width: 1920, height: 1080 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security', // For cross-origin automation
      ],
      ignoreHTTPSErrors: true,
      slowMo: 50, // Slow down for reliability
    });

     
    console.log('[Browser] Chrome launched successfully');
  }

  /**
   * Navigate to URL in new or existing tab
   */
  async navigate(url: string, tabId?: string): Promise<string> {
    await this.ensureLaunched();

    let page: Page;

    if (tabId && this.pages.has(tabId)) {
      page = this.pages.get(tabId)!;
    } else {
      page = await this.context!.newPage();
      const newTabId = `tab_${Date.now()}`;
      this.pages.set(newTabId, page);
      tabId = newTabId;
    }

     
    console.log(`[Browser] Navigating to ${url} in tab ${tabId}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    return tabId;
  }

  /**
   * Click element by selector
   */
  async click(tabId: string, selector: string): Promise<void> {
    const page = this.getPage(tabId);
     
    console.log(`[Browser] Clicking element: ${selector}`);
    await page.click(selector, { timeout: 10000 });
  }

  /**
   * Type text into input field
   */
  async type(tabId: string, selector: string, text: string): Promise<void> {
    const page = this.getPage(tabId);
     
    console.log(`[Browser] Typing into ${selector}`);
    await page.fill(selector, text);
  }

  /**
   * Extract text content from element
   */
  async extractText(tabId: string, selector: string): Promise<string> {
    const page = this.getPage(tabId);
    const element = await page.$(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);

    const text = await element.textContent();
    return text || '';
  }

  /**
   * Extract all text from page
   */
  async getPageText(tabId: string): Promise<string> {
    const page = this.getPage(tabId);
    return await page.textContent('body') || '';
  }

  /**
   * Get current page title
   */
  async getTitle(tabId: string): Promise<string> {
    const page = this.getPage(tabId);
    return await page.title();
  }

  /**
   * Get current URL
   */
  async getUrl(tabId: string): Promise<string> {
    const page = this.getPage(tabId);
    return page.url();
  }

  /**
   * Take screenshot of page
   */
  async screenshot(tabId: string, filepath: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.screenshot({ path: filepath, fullPage: true });
     
    console.log(`[Browser] Screenshot saved: ${filepath}`);
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate(tabId: string, script: string): Promise<any> {
    const page = this.getPage(tabId);
    return await page.evaluate(script);
  }

  /**
   * Wait for selector to appear
   */
  async waitForSelector(tabId: string, selector: string, timeout = 10000): Promise<void> {
    const page = this.getPage(tabId);
    await page.waitForSelector(selector, { timeout });
  }

  /**
   * Scroll page
   */
  async scroll(tabId: string, direction: 'up' | 'down' | 'top' | 'bottom'): Promise<void> {
    const page = this.getPage(tabId);

    const scrollScript = {
      up: 'window.scrollBy(0, -500)',
      down: 'window.scrollBy(0, 500)',
      top: 'window.scrollTo(0, 0)',
      bottom: 'window.scrollTo(0, document.body.scrollHeight)',
    };

    await page.evaluate(scrollScript[direction]);
  }

  /**
   * Fill out form
   */
  async fillForm(tabId: string, formData: Record<string, string>): Promise<void> {
    const page = this.getPage(tabId);

    for (const [selector, value] of Object.entries(formData)) {
      await page.fill(selector, value);
    }
  }

  /**
   * Click and wait for navigation
   */
  async clickAndWaitForNavigation(tabId: string, selector: string): Promise<void> {
    const page = this.getPage(tabId);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click(selector),
    ]);
  }

  /**
   * Get all open tabs
   */
  getOpenTabs(): string[] {
    return Array.from(this.pages.keys());
  }

  /**
   * Close specific tab
   */
  async closeTab(tabId: string): Promise<void> {
    const page = this.pages.get(tabId);
    if (page) {
      await page.close();
      this.pages.delete(tabId);
       
      console.log(`[Browser] Closed tab: ${tabId}`);
    }
  }

  /**
   * Close all tabs except one
   */
  async closeOtherTabs(keepTabId: string): Promise<void> {
    for (const [tabId, page] of this.pages.entries()) {
      if (tabId !== keepTabId) {
        await page.close();
        this.pages.delete(tabId);
      }
    }
  }

  /**
   * Close browser completely
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.pages.clear();
       
      console.log('[Browser] Chrome closed');
    }
  }

  // Helper methods
  private async ensureLaunched(): Promise<void> {
    if (!this.context) {
      await this.launch();
    }
  }

  private getPage(tabId: string): Page {
    const page = this.pages.get(tabId);
    if (!page) {
      throw new Error(`Tab not found: ${tabId}`);
    }
    return page;
  }

  /**
   * Get page HTML source
   */
  async getPageSource(tabId: string): Promise<string> {
    const page = this.getPage(tabId);
    return await page.content();
  }

  /**
   * Press keyboard key
   */
  async pressKey(tabId: string, key: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.keyboard.press(key);
  }

  /**
   * Hover over element
   */
  async hover(tabId: string, selector: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.hover(selector);
  }

  /**
   * Select dropdown option
   */
  async selectOption(tabId: string, selector: string, value: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.selectOption(selector, value);
  }

  /**
   * Check checkbox
   */
  async check(tabId: string, selector: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.check(selector);
  }

  /**
   * Uncheck checkbox
   */
  async uncheck(tabId: string, selector: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.uncheck(selector);
  }

  /**
   * Upload file
   */
  async uploadFile(tabId: string, selector: string, filePath: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.setInputFiles(selector, filePath);
  }

  /**
   * Download file
   */
  async downloadFile(tabId: string, downloadPath: string): Promise<string> {
    const page = this.getPage(tabId);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      // Trigger download action here if needed
    ]);

    const suggestedFilename = download.suggestedFilename();
    const filepath = path.join(downloadPath, suggestedFilename);
    await download.saveAs(filepath);

    return filepath;
  }

  /**
   * Get cookies
   */
  async getCookies(tabId: string): Promise<any[]> {
    const page = this.getPage(tabId);
    return await page.context().cookies();
  }

  /**
   * Set cookies
   */
  async setCookies(cookies: any[]): Promise<void> {
    await this.ensureLaunched();
    await this.context!.addCookies(cookies);
  }

  /**
   * Clear all cookies
   */
  async clearCookies(): Promise<void> {
    await this.ensureLaunched();
    await this.context!.clearCookies();
  }
}
