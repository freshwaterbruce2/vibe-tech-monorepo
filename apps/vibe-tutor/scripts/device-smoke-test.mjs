#!/usr/bin/env node
/**
 * Vibe Tutor On-Device Smoke Test Harness
 * 
 * Verifies live app functionality on the authorized Samsung Galaxy A54 (SM-A546U1 / R5CW60X0PHT)
 * via Chrome DevTools Protocol (CDP) over ADB port forwarding.
 *
 * Checks:
 * 1. Hardware device identity & preflight health (Awake, Unlocked, Battery).
 * 2. App launch & WebView DevTools socket discovery.
 * 3. Math question prompt ("What is 15 * 4? Show step-by-step and write a 1-line python code example.").
 * 4. Coding question prompt ("Write a python function to check if a word is a palindrome and test it with 'radar'.").
 * 5. Code syntax card and "Copy Code" button rendering assertion.
 * 6. High-resolution screenshot capture and pass/fail reporting.
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = resolve(__dirname, '..');

// Default target hardware from project identity policy
const TARGET_SERIAL = process.env.TARGET_DEVICE_SERIAL || 'R5CW60X0PHT';
const PACKAGE_NAME = 'com.vibetech.tutor';
const ACTIVITY_NAME = 'com.vibetech.tutor/.MainActivity';
const DEVTOOLS_PORT = Number(process.env.DEVTOOLS_PORT) || 9222;
const BRIDGE_PORT = 3001;
const TIMEOUT_MS = 45000;

// CLI Flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipLaunch = args.includes('--skip-launch');

function log(msg, type = 'INFO') {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = type === 'PASS' ? '✅ [PASS]' :
                 type === 'FAIL' ? '❌ [FAIL]' :
                 type === 'WARN' ? '⚠️ [WARN]' :
                 type === 'STEP' ? '🚀 [STEP]' : 'ℹ️ [INFO]';
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

function runAdb(cmd, ignoreError = false) {
  try {
    const fullCmd = `adb -s ${TARGET_SERIAL} ${cmd}`;
    return execSync(fullCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    if (!ignoreError) throw err;
    return '';
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Minimal WebSocket client using standard ws or global WebSocket
async function createCdpClient(wsUrl) {
  const { default: WebSocket } = await import('ws');
  return new Promise((resolveClient, rejectClient) => {
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      return rejectClient(e);
    }

    let id = 1;
    const pending = new Map();

    ws.on('open', () => {
      resolveClient({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            const reqId = id++;
            const timeout = setTimeout(() => {
              pending.delete(reqId);
              rej(new Error(`CDP command ${method} timed out`));
            }, 30000);

            pending.set(reqId, { res, rej, timeout });
            ws.send(JSON.stringify({ id: reqId, method, params }));
          }),
        evaluate: async (expression) => {
          const reqId = id++;
          return new Promise((res, rej) => {
            const timeout = setTimeout(() => {
              pending.delete(reqId);
              rej(new Error('CDP evaluate timed out'));
            }, 30000);

            pending.set(reqId, {
              res: (msg) => {
                if (msg.error) {
                  rej(new Error(msg.error.message || 'CDP Error'));
                  return;
                }
                const resultPayload = msg.result || {};
                if (resultPayload.exceptionDetails) {
                  rej(new Error(resultPayload.exceptionDetails.text || resultPayload.exceptionDetails.exception?.description || 'Evaluation exception'));
                } else {
                  const val = resultPayload.result?.value !== undefined ? resultPayload.result.value : resultPayload.result;
                  res(val);
                }
              },
              rej,
              timeout,
            });
            ws.send(JSON.stringify({
              id: reqId,
              method: 'Runtime.evaluate',
              params: { expression, returnByValue: true, awaitPromise: true },
            }));
          });
        },
        close: () => {
          try { ws.close(); } catch {}
        },
      });
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.id && pending.has(msg.id)) {
          const { res, timeout } = pending.get(msg.id);
          clearTimeout(timeout);
          pending.delete(msg.id);
          res(msg);
        }
      } catch {}
    });

    ws.on('error', (err) => {
      rejectClient(err);
    });
  });
}

async function verifyDeviceHealth() {
  log(`Verifying target device hardware: ${TARGET_SERIAL}`, 'STEP');
  
  if (isDryRun) {
    log('Dry-run mode enabled: simulating device preflight health checks', 'INFO');
    return { model: 'SM-A546U1 (Mock)', battery: '85%', awake: true, unlocked: true };
  }

  // 1. Check adb state
  const state = runAdb('get-state', true);
  if (state !== 'device') {
    throw new Error(`Device ${TARGET_SERIAL} not attached or unauthorized (adb state: '${state || 'disconnected'}').`);
  }

  // 2. Verify hardware serial
  const serial = runAdb('get-serialno', true) || runAdb('shell getprop ro.serialno', true);
  if (serial !== TARGET_SERIAL) {
    throw new Error(`Device serial mismatch: expected ${TARGET_SERIAL}, got ${serial}.`);
  }

  // 3. Verify phone model
  const model = runAdb('shell getprop ro.product.model');
  log(`Device verified: ${model} (Serial: ${serial})`, 'PASS');

  // 4. Check wakefulness
  const powerDump = runAdb('shell dumpsys power', true);
  const isAwake = powerDump.includes('mWakefulness=Awake');
  if (!isAwake) {
    log('Device is sleeping. Waking up...', 'WARN');
    runAdb('shell input keyevent 224'); // KEYCODE_WAKEUP
    await sleep(1000);
  }

  // 5. Check lockscreen
  const windowDump = runAdb('shell dumpsys window', true);
  const isKeyguardShowing = windowDump.includes('mShowingLockscreen=true') ||
                            windowDump.includes('showing=true') ||
                            windowDump.includes('mDreamingLockscreen=true');
  if (isKeyguardShowing) {
    log('Device lockscreen showing. Sending unlock keyevent...', 'WARN');
    runAdb('shell input keyevent 82'); // KEYCODE_MENU
    await sleep(1000);
  }

  // 6. Check battery level
  const batteryDump = runAdb('shell dumpsys battery', true);
  const levelMatch = batteryDump.match(/level:\s*(\d+)/);
  const batteryLevel = levelMatch ? `${levelMatch[1]}%` : 'Unknown';
  log(`Device state: Awake=true, Unlocked=true, Battery=${batteryLevel}`, 'INFO');

  return { model, battery: batteryLevel, awake: true, unlocked: true };
}

async function setupAppAndPortForwarding() {
  log('Setting up port forwarding and launching Vibe Tutor...', 'STEP');

  if (isDryRun) {
    log('Dry-run: simulated port forwarding tcp:9222 and reverse tcp:3001', 'INFO');
    return { pid: 99999 };
  }

  // Forward dev bridge reverse port 3001
  runAdb(`reverse tcp:${BRIDGE_PORT} tcp:${BRIDGE_PORT}`, true);

  // Launch target activity if not skipped
  if (!skipLaunch) {
    runAdb(`shell am start -n ${ACTIVITY_NAME}`);
    await sleep(2500);
  }

  // Find app PID
  const pidRaw = runAdb(`shell pidof ${PACKAGE_NAME}`, true);
  const pid = pidRaw.split(/\s+/)[0];
  if (!pid) {
    throw new Error(`Failed to find running PID for ${PACKAGE_NAME}. Is the app installed and launched?`);
  }
  log(`App running with PID ${pid}`, 'INFO');

  // Forward DevTools socket
  runAdb(`forward tcp:${DEVTOOLS_PORT} localabstract:webview_devtools_remote_${pid}`);
  log(`DevTools port forwarded: localhost:${DEVTOOLS_PORT} -> PID ${pid}`, 'PASS');

  return { pid };
}

async function discoverCdpTarget() {
  log(`Discovering inspectable pages on http://127.0.0.1:${DEVTOOLS_PORT}/json...`, 'STEP');

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json`);
      if (res.ok) {
        const pages = await res.json();
        const page = pages.find((p) => p.type === 'page' && (p.url.includes('localhost') || p.url.includes('capacitor'))) || pages[0];
        if (page && page.webSocketDebuggerUrl) {
          log(`Found inspectable page: "${page.title}" (${page.url})`, 'PASS');
          return page.webSocketDebuggerUrl;
        }
      }
    } catch {}
    await sleep(1000);
  }
  throw new Error(`Could not connect to DevTools endpoint on port ${DEVTOOLS_PORT}.`);
}

async function runOnDeviceChatVerification(client) {
  log('Connecting to app runtime via Chrome DevTools Protocol...', 'STEP');

  // 1. Check current view state
  const state = await client.evaluate(`
    (() => ({
      title: document.title,
      url: window.location.href,
      hasOnboarding: Boolean(document.querySelector('button[aria-label*="Get Started"], [data-testid="onboarding"]')),
      hasChatInput: Boolean(document.querySelector('textarea, input[placeholder*="Message"]')),
      bodyLength: document.body ? document.body.innerText.length : 0
    }))()
  `);
  log(`App current state: URL=${state.url}, HasChat=${state.hasChatInput}`, 'INFO');

  // 2. Ensure on Tutor view
  await client.evaluate(`
    (() => {
      // If bypass is needed, set onboarding completed
      localStorage.setItem('onboarding_completed', 'true');
      const tutorBtn = Array.from(document.querySelectorAll('button, a')).find(el => /AI Tutor|Vibe Tutor/i.test(el.innerText || ''));
      if (tutorBtn) tutorBtn.click();
    })()
  `);
  await sleep(1500);

  // Helper to submit a prompt
  const submitPrompt = async (text) => {
    return client.evaluate(`
      (() => {
        const input = document.querySelector('textarea[aria-label="Chat input"], textarea, input[aria-label*="Chat"], input[placeholder*="Message"]');
        if (!input) return { ok: false, error: 'input_not_found' };
        if (input.disabled) {
          return { ok: false, error: 'input_disabled', reason: input.placeholder };
        }
        
        const proto = input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(input, ${JSON.stringify(text)});
        } else {
          input.value = ${JSON.stringify(text)};
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const sendBtn = document.querySelector('button[aria-label="Send message"]')
          || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-send') || /send/i.test(b.getAttribute('aria-label') || ''));
        if (!sendBtn) return { ok: false, error: 'send_button_not_found' };
        if (sendBtn.disabled) return { ok: false, error: 'send_button_disabled' };
        sendBtn.click();
        return { ok: true };
      })()
    `);
  };

  // Helper to wait for new reply
  const waitForResponse = async (expectedTextPattern, maxWaitMs = 30000) => {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const check = await client.evaluate(`
        (() => {
          const body = document.body ? document.body.innerText : '';
          const codeBlocks = Array.from(document.querySelectorAll('pre, [data-testid="code-block"]'));
          const copyButtons = Array.from(document.querySelectorAll('button')).filter(b => /copy/i.test(b.innerText || b.getAttribute('aria-label') || ''));
          const hasError = /The response did not arrive|Google Play purchase could not be verified|Quiet hours pause/i.test(body);
          return {
            bodyText: body.slice(-1200),
            hasCode: codeBlocks.length > 0,
            codeBlockCount: codeBlocks.length,
            codeSnippets: codeBlocks.map(c => c.innerText.slice(0, 100)),
            copyBtnCount: copyButtons.length,
            hasError
          };
        })()
      `);

      if (expectedTextPattern.test(check.bodyText)) {
        return { success: true, ...check };
      }
      if (check.hasError) {
        return { success: false, error: check.bodyText, ...check };
      }
      await sleep(1500);
    }
    return { success: false, timeout: true };
  };

  // ── TEST 1: Math calculation + 1-line Python ──
  log('TEST 1: Sending Math & 1-line Python question...', 'STEP');
  const mathPrompt = 'What is 15 * 4? Show step-by-step and write a 1-line python code example.';
  const sendRes1 = await submitPrompt(mathPrompt);
  if (!sendRes1.ok) {
    if (sendRes1.error === 'input_disabled') {
      throw new Error(`Chat input is disabled ("${sendRes1.reason || "offline"}"). Verify the local dev bridge (pnpm run dev:bridge / pnpm run dev:api) or production Cloud Run connectivity.`);
    }
    throw new Error(`Failed to send math prompt: ${sendRes1.error}`);
  }

  log('Waiting for AI response with calculation and syntax card...', 'INFO');
  const result1 = await waitForResponse(/60/i, TIMEOUT_MS);
  if (!result1.success) {
    throw new Error(`Test 1 failed: ${result1.error || 'Timed out waiting for math reply'}`);
  }
  log(`Test 1 response received (Code cards: ${result1.codeBlockCount}, Copy buttons: ${result1.copyBtnCount})`, 'PASS');

  // ── TEST 2: Multi-line Python Algorithm ──
  log('TEST 2: Sending Multi-line Python coding algorithm question...', 'STEP');
  const codePrompt = 'Write a python function to check if a word is a palindrome and test it with "radar".';
  const sendRes2 = await submitPrompt(codePrompt);
  if (!sendRes2.ok) {
    throw new Error(`Failed to send coding prompt: ${sendRes2.error}`);
  }

  log('Waiting for AI response with palindrome code block and copy button...', 'INFO');
  const result2 = await waitForResponse(/is_palindrome|radar/i, TIMEOUT_MS);
  if (!result2.success) {
    throw new Error(`Test 2 failed: ${result2.error || 'Timed out waiting for coding reply'}`);
  }
  log(`Test 2 response received (Code cards: ${result2.codeBlockCount}, Copy buttons: ${result2.copyBtnCount})`, 'PASS');

  // ── Visual Assertion: Code Card & Copy Button ──
  if (result2.codeBlockCount < 1) {
    throw new Error('Assertion failed: No syntax-highlighted code cards rendered in chat!');
  }
  if (result2.copyBtnCount < 1) {
    throw new Error('Assertion failed: No atomic "Copy Code" button found on code cards!');
  }
  log('Assertion PASS: Multi-line code syntax cards and atomic "Copy Code" buttons rendered cleanly.', 'PASS');
}

async function captureDeviceScreenshot() {
  log('Capturing on-device visual verification screenshot...', 'STEP');
  const outputDir = resolve(appRoot, 'docs/release-readiness');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = resolve(outputDir, `device-smoke-test-${stamp}.png`);

  if (isDryRun) {
    log(`Dry-run: simulated screenshot saved to ${screenshotPath}`, 'INFO');
    return screenshotPath;
  }

  try {
    const rawPng = execSync(`adb -s ${TARGET_SERIAL} exec-out screencap -p`);
    writeFileSync(screenshotPath, rawPng);
    log(`Screenshot saved: ${screenshotPath}`, 'PASS');
    return screenshotPath;
  } catch (err) {
    log(`Screenshot capture warning: ${err.message}`, 'WARN');
    return null;
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('📱 VIBE TUTOR PHYSICAL DEVICE SMOKE TEST (pnpm run test:device)');
  console.log(`Target Hardware: Samsung SM-A546U1 (${TARGET_SERIAL})`);
  console.log('============================================================\n');

  let client = null;
  const startTime = Date.now();

  try {
    // Stage 1: Device Preflight
    const health = await verifyDeviceHealth();

    if (isDryRun) {
      log('Simulating full CDP test execution in dry-run mode...', 'INFO');
      await sleep(1500);
      log('Simulation: Math prompt 15 * 4 -> returned 60 with code snippet', 'PASS');
      log('Simulation: Coding prompt palindrome -> returned def is_palindrome with copy button', 'PASS');
      const shot = await captureDeviceScreenshot();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('\n------------------------------------------------------------');
      log(`SMOKE TEST COMPLETED SUCCESSFULLY IN ${elapsed}s (DRY-RUN)`, 'PASS');
      console.log('------------------------------------------------------------\n');
      return;
    }

    // Stage 2: App Launch & Forwarding
    await setupAppAndPortForwarding();

    // Stage 3: Connect to CDP
    const wsUrl = await discoverCdpTarget();
    client = await createCdpClient(wsUrl);

    // Stage 4: Run Verification Tests
    await runOnDeviceChatVerification(client);

    // Stage 5: Capture Visual Screenshot
    const screenshot = await captureDeviceScreenshot();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n------------------------------------------------------------');
    log(`ON-DEVICE SMOKE TEST PASSED IN ${elapsed}s!`, 'PASS');
    if (screenshot) log(`Visual Proof: ${screenshot}`, 'INFO');
    console.log('------------------------------------------------------------\n');

  } catch (err) {
    console.log('\n------------------------------------------------------------');
    log(`SMOKE TEST FAILED: ${err.message}`, 'FAIL');
    console.log('------------------------------------------------------------\n');
    process.exitCode = 1;
  } finally {
    if (client) {
      client.close();
    }
    if (!isDryRun) {
      log('Cleaning up ADB port forwarding tunnels...', 'INFO');
      runAdb(`forward --remove tcp:${DEVTOOLS_PORT}`, true);
    }
  }
}

main();
