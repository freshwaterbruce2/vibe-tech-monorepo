import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { createServiceContainer, disposeServiceContainer, type ServiceContainer } from './service-container';
import { WsHub } from './ws-hub';
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc';
import { wireStreams } from './stream-bridge';
import { setupTray, teardownTray } from './tray';

const isDev = !app.isPackaged;
const DEFAULT_WS_PORT = 3210;
const DEFAULT_CDP_PORT = 9222;
const MONOREPO_ROOT = 'V:\\monorepo';

// External agents attach over the Chrome DevTools Protocol; the switch only
// takes effect if appended before the app 'ready' event, so this runs at
// module load. Port 0 via env opts out entirely (CDP is a local
// code-execution surface - any process on this machine can attach).
function configureRemoteDebugging(): void {
  const raw = process.env['VIBETECH_COMMAND_CENTER_CDP_PORT'] ?? process.env['COMMAND_CENTER_CDP_PORT'];
  const parsed = raw === undefined ? DEFAULT_CDP_PORT : Number.parseInt(raw, 10);
  const port = Number.isInteger(parsed) && parsed >= 0 && parsed <= 65_535 ? parsed : DEFAULT_CDP_PORT;
  if (port === 0) return;
  app.commandLine.appendSwitch('remote-debugging-port', String(port));
}

configureRemoteDebugging();

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
  hub = await startWsHub(getPreferredWsPort());
  container = createServiceContainer({ monorepoRoot: MONOREPO_ROOT, wsPort: hub.actualPort });
  unwire = wireStreams(container, hub);
  registerIpcHandlers(container);
  container.watcher.start();
  setupTray(container, () => mainWindow);
}

function getPreferredWsPort(): number {
  const raw = process.env['VIBETECH_COMMAND_CENTER_WS_PORT'] ?? process.env['COMMAND_CENTER_WS_PORT'];
  if (!raw) return DEFAULT_WS_PORT;

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65_535
    ? parsed
    : DEFAULT_WS_PORT;
}

async function startWsHub(preferredPort: number): Promise<WsHub> {
  const preferredHub = new WsHub({ port: preferredPort });
  try {
    await preferredHub.start();
    return preferredHub;
  } catch (error) {
    if (preferredPort === 0 || !isAddressInUse(error)) {
      throw error;
    }
  }

  const fallbackHub = new WsHub({ port: 0 });
  await fallbackHub.start();
  return fallbackHub;
}

function isAddressInUse(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EADDRINUSE';
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
