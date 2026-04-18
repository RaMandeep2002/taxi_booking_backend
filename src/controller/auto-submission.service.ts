import { chromium, BrowserContext, Page } from 'playwright';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import * as path from 'path';

dotenv.config();

export interface SubmissionData {
  filePath: string;
  startDate: string;
  endDate: string;
}

export interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export class BCeIDAutomator {
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor() {}

  /**
   * Initializes the Playwright browser and persistent context
   */
  async initialize(headless = true): Promise<void> {
    console.log('🚀 Initializing browser...');
    // Use an absolute path for the session directory to avoid relative path issues in production
    const sessionDir = path.resolve(process.cwd(), 'bceid-session');
    const logsDir = path.resolve(process.cwd(), 'logs');

    // Ensure logs directory exists
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (err) {
      // Ignore if directory already exists
    }

    try {
      this.context = await chromium.launchPersistentContext(sessionDir, {
        headless: headless,
        viewport: { width: 1280, height: 720 },
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true,
        args: ['--disable-dev-shm-usage', '--disable-gpu'],
      });
    } catch (error) {
      console.warn('⚠️ Failed to launch with persistent context, trying to clean session directory...');
      try {
        await fs.rm(sessionDir, { recursive: true, force: true });
        console.log('🧹 Session directory cleaned. Retrying...');
        this.context = await chromium.launchPersistentContext(sessionDir, {
          headless: headless,
          viewport: { width: 1280, height: 720 },
          ignoreHTTPSErrors: true,
          args: ['--disable-dev-shm-usage', '--disable-gpu'],
        });
      } catch (retryError) {
        console.error('❌ Failed to launch browser even after cleanup:', retryError);
        throw retryError;
      }
    }

    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
  }

  /**
   * Performs the BCeID login flow
   */
  async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log('🔐 Checking login status...');

    await this.page.goto(
      'https://logon7.gov.bc.ca/clp-cgi/capBceid/logon.cgi?flags=1100:1,8&partner=fed57&TYPE=33554433&REALMOID=06-4ac288ea-6b01-446f-8207-d48235730b5a&GUID=&SMAUTHREASON=0&METHOD=GET&SMAGENTNAME=$SM$jf5sTmcJa0QTxkf%2fA4IpB0kKx2R%2b5mdIj8gvXNq5auHBCVIY4WO0Q%2bgD3WMrseutCRyVPAU5qqLVBRJ%2fdVOL%2be9xezr6YDoP&TARGET=$SM$https%3a%2f%2fvehiclesafetybc%2egov%2ebc%2eca%2fpts%2fdashboard',
      { waitUntil: 'networkidle' }
    );

    const needsLogin = await this.page.locator('#user').isVisible().catch(() => false);

    if (needsLogin) {
      console.log('📝 Filling BCeID credentials...');
      const username = process.env.BCEID_USERNAME;
      const password = process.env.BCEID_PASSWORD;

      if (!username || !password) {
        throw new Error('BCEID_USERNAME or BCEID_PASSWORD environment variables not set');
      }

      await this.page.locator('#user').fill(username);
      await this.page.locator('#password').fill(password);

      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle' }),
        this.page.locator('input[type="submit"][value="Continue"]').click(),
      ]);

      console.log('✅ Login successful!');
    } else {
      console.log('✅ Already logged in (using saved session)');
    }
  }

  /**
   * Navigates from Dashboard to Trip Data
   */
  async navigateToTripData(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log('🔍 Looking for Trip Data link...');

    try {
      await this.page.waitForSelector('.main-navigation', { timeout: 15000 });
      const tripDataLink = this.page.locator('a[href*="tripdata"], a:has-text("Trip Data")').first();
      await tripDataLink.waitFor({ state: 'visible', timeout: 10000 });

      await Promise.all([
        this.page.waitForNavigation({
          waitUntil: 'networkidle',
          timeout: 30000,
        }).catch(() => console.log('Navigation completed or timeout')),
        tripDataLink.click(),
      ]);

      console.log('📊 Navigated to Trip Data dashboard');
    } catch (error) {
      console.log('⚠️ Navigation failed, trying URL direct...');
      await this.page.goto('https://vehiclesafetybc.gov.bc.ca/ptdw/infomgmt/SubmitData', {
        waitUntil: 'networkidle',
      });
    }
  }

  /**
   * Clicks the 'Submit Trip Data' link in the dashboard
   */
  async clickSubmitTripData(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log('🔍 Looking for Submit Trip Data link...');

    try {
      if (this.page.url().includes('SubmitData')) {
        console.log('✅ Already on Submit Data page');
        return;
      }

      const selectors = [
        'a.bucketlink:has-text("Submit Trip Data")',
        'a:has-text("Submit Trip Data")',
        'a[href*="SubmitData"]',
        'a[onclick*="SubmitData"]'
      ];

      let clicked = false;
      for (const selector of selectors) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        await this.page.goto('https://vehiclesafetybc.gov.bc.ca/ptdw/infomgmt/SubmitData', {
          waitUntil: 'networkidle',
        });
      }

      await this.page.waitForSelector('#SubmitDataForm', { timeout: 15000 });
      console.log('✅ Successfully reached Submit Data form');
    } catch (error) {
      console.error('❌ Failed to click Submit Trip Data:', error);
      throw error;
    }
  }

  /**
   * Formats ISO date (YYYY-MM-DD) to UI format (DD-MMM-YYYY)
   */
  formatForUI(isoDate: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const clean = isoDate.replace('Z', '');
    const parts = clean.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return isoDate;
    return `${d.toString().padStart(2, '0')}-${months[m - 1]}-${y}`;
  }

  /**
   * Sets a datepicker field manually via JS injection
   */
  async setDateField(fieldId: string, isoDate: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    const uiDate = this.formatForUI(isoDate);
    console.log(`📅 Formatting ${isoDate} -> UI: ${uiDate}`);

    await this.page.evaluate(({ selector, val }) => {
      const field = document.querySelector(selector) as HTMLInputElement;
      if (field) {
        field.value = val;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, { selector: fieldId, val: uiDate });

    const val = await this.page.inputValue(fieldId);
    console.log(`✅ ${fieldId} UI value: "${val}"`);
    return val !== "";
  }

  /**
   * Uploads the CSV file
   */
  async uploadFile(filePath: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log(`📂 Uploading local file: ${filePath}`);
    const absolutePath = path.resolve(filePath);
    const fileInput = this.page.locator('#ChooseFileBtn');
    await fileInput.setInputFiles(absolutePath);
    await this.page.waitForTimeout(2000);
    const fileName = await this.page.locator('#FileNameTxtField').textContent();
    console.log(`📄 Selected file: ${fileName || 'Unknown'}`);
    return !!fileName;
  }

  /**
   * Validates the form state via client-side scripts
   */
  async validateForm(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log('🔍 Running UI validation...');
    return await this.page.evaluate(() => {
      // @ts-ignore
      const fileName = document.querySelector('#FileNameTxtField')?.textContent || '';
      // @ts-ignore
      const start = document.querySelector('#StartDateField')?.value || '';
      // @ts-ignore
      const end = document.querySelector('#EndDateField')?.value || '';
      const isValid = fileName.trim() && start.trim() && end.trim();
      // @ts-ignore
      if (typeof validate_form === 'function') return validate_form() && isValid;
      return isValid;
    });
  }

  /**
   * Forces activation of the Upload button
   */
  async enableUploadButton(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log('🔓 Activating Upload button...');
    await this.page.evaluate(() => {
      const btn = document.querySelector('#SubmitDataButton') as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('BC-Gov-PrimaryButton-disabled');
        btn.classList.add('BC-Gov-PrimaryButton');
      }
    });
  }

  /**
   * Clicks submit and handles result/navigation
   */
  async submitUpload(): Promise<SubmissionResult> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log('🚀 Executing final submission...');
    
    await this.page.screenshot({ path: path.join(process.cwd(), `logs/pre-click-${Date.now()}.png`) });

    const submitBtn = this.page.locator('#SubmitDataButton');
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 45000 }).catch(() => {
        console.log('⚠️ Post-click navigation notification skipped.');
      }),
      submitBtn.click({ force: true })
    ]);

    const bodyText = await this.page.innerText('body');
    if (bodyText.includes('Submission ID:')) {
      const id = await this.page.locator('#SubmissionIdText').textContent();
      console.log(`✅ Success! Submission ID: ${id}`);
      return { success: true, submissionId: id?.trim() || 'Unknown' };
    }
    
    const errorMsg = await this.page.locator('.error_text:visible').first().innerText().catch(() => 'Check logs/screenshots');
    console.error(`❌ Submission failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  /**
   * Handles the actual interaction with the submission form
   */
  async handleSubmissionPage(filePath: string, startDate: string, endDate: string): Promise<SubmissionResult> {
    if (!this.page) throw new Error('Browser not initialized');
    console.log('📝 Starting data submission process...');
    try {
      await this.page.waitForSelector('#SubmitDataForm', { state: 'visible', timeout: 20000 });
      
      const ptNumber = await this.page.locator('#PTNoField').textContent();
      console.log(`🏢 PT Number: ${ptNumber}`);
      
      if (!await this.uploadFile(filePath)) throw new Error('File upload failed');
      
      await this.setDateField('#StartDateField', startDate);
      await this.setDateField('#EndDateField', endDate);
      
      if (!await this.validateForm()) {
        console.log('⚠️ Validation failed or button not active, forcing activation...');
      }
      
      await this.enableUploadButton();
      await this.page.waitForTimeout(1000);
      
      return await this.submitUpload();
      
    } catch (error: any) {
      console.error('❌ Error during form submission:', error);
      await this.page.screenshot({ path: path.join(process.cwd(), `logs/submission-error-${Date.now()}.png`) });
      throw error;
    }
  }

  /**
   * Main entry point to run the entire flow from login to submission
   */
  async runFullFlow(submissionData: SubmissionData, headless = true): Promise<SubmissionResult> {
    try {
      await this.initialize(headless);
      await this.login();
      await this.navigateToTripData();
      await this.clickSubmitTripData();

      const result = await this.handleSubmissionPage(
        submissionData.filePath,
        submissionData.startDate,
        submissionData.endDate
      );
      
      if (result.success) {
        console.log('✨ Full flow completed successfully!');
      }
      return result;

    } catch (error: any) {
      console.error('❌ Error during automation:', error);
      if (this.page) {
        await this.page.screenshot({ path: path.join(process.cwd(), `logs/error-${Date.now()}.png`) });
      }
      return { success: false, error: error.message };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Closes the browser and context
   */
  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }
}
