import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { createServiceContainer, disposeServiceContainer, type ServiceContainer } from './service-container';
import { WsHub } from './ws-hub';
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc';
import { wireStreams } from './stream-bridge';
import { setupTray, teardownTray } from './tray';

const isDev = !app.isPackaged;
const WS_PORT = 3210;
const MONOREPO_ROOT = 'C:\\dev';

let container: ServiceContainer | null = null;
let hub: WsHub | null = null;
let unwire: (() => void) | null = null;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'Vibe-Tech Command Center',
    backgroundColor: '#0A0E1A',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

async function bootstrap(): Promise<void> {
  container = createServiceContainer({ monorepoRoot: MONOREPO_ROOT, wsPort: WS_PORT });
  hub = new WsHub({ port: WS_PORT });
  await hub.start();
  unwire = wireStreams(container, hub);
  registerIpcHandlers(container);
  container.watcher.start();
  setupTray(container, () => mainWindow);
}

async function shutdown(): Promise<void> {
  teardownTray();
  unregisterIpcHandlers();
  if (unwire) { unwire(); unwire = null; }
  if (hub) { await hub.stop(); hub = null; }
  if (container) { await disposeServiceContainer(container); container = null; }
}

void app.whenReady().then(async () => {
  await bootstrap();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Stay alive in the tray; tray menu has Quit
app.on('window-all-closed', () => {});

app.on('before-quit', (event) => {
  isQuitting = true;
  if (container || hub) {
    event.preventDefault();
    void (async () => {
      await shutdown();
      app.exit(0);
    })();
  }
});
