---
name: electron-csp-configuration
description: Configures Content Security Policy (CSP) for Electron applications to enhance security.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: '1.0.0'
  generated_from: learning_pattern__occurrences
  success_rate: 96.0%
  category: development
---

# Electron CSP Configuration

**Auto-generated from successful patterns**

## Overview

This skill provides a structured approach to configuring Content Security Policy (CSP) for Electron applications within the VibeTech Nx monorepo. Adhering to CSP best practices helps mitigate security risks such as cross-site scripting (XSS) attacks.

## Core Capabilities

- Define and enforce CSP headers in Electron applications.
- Ensure compliance with security standards across all Electron projects in the monorepo.
- Automatically integrate with existing configurations and libraries.

## Usage Examples

### Step 1: Define CSP in `main.js`

Configure the CSP in your Electron application's main entry file. Hereâs an example snippet to get you started:

```javascript
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      // Set CSP header
      webSecurity: true,
    },
  });

  win.loadURL('https://your-app-url.com', {
    userAgent: 'Your User Agent',
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline';",
    },
  });
}

app.whenReady().then(createWindow);
```

### Step 2: Validate CSP

Make sure to test the CSP settings by running your Electron app and checking the console for any CSP violations.

### Step 3: Snapshots for Safety

Before making changes, ensure to create a snapshot of your current application state:

```bash
# Create a snapshot of the current state
pnpm run snapshot --path D:\
```

## Integration with Monorepo

This skill is designed specifically for the VibeTech Nx monorepo structure, ensuring that all Electron applications are secured uniformly. Follow the monorepo rules to prevent duplicate configurations, and always utilize `pnpm` as the package manager.

## Safety Measures

- **Validation:** Regularly validate the CSP settings through automated tests to catch any security misconfigurations.
- **Snapshots:** Utilize the snapshots stored in D:\ to roll back any changes made in case of issues arising from incorrect CSP configurations.

## Related Skills

- [electron-ipc-conversion](#)
- [electron-preload-structure-fix](#)
