import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import type { ServiceContainer } from './service-container';

let tray: Tray | null = null;

export function setupTray(container: ServiceContainer, getWindow: () => BrowserWindow | null): void {
  const icon = nativeImage.createFromBuffer(makeCyanDotPng());

  tray = new Tray(icon);
  tray.setToolTip('Vibe-Tech Command Center');

  const rebuildMenu = (): void => {
    const win = getWindow();
    const visible = win?.isVisible() ?? false;
    const menu = Menu.buildFromTemplate([
      {
        label: visible ? 'Hide window' : 'Show window',
        click: () => {
          const w = getWindow();
          if (!w) return;
          if (w.isVisible()) w.hide(); else { w.show(); w.focus(); }
          rebuildMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Backup C:\\dev\\apps',
        click: async () => {
          await container.backup.createBackup({ sourcePath: 'C:\\dev\\apps', label: 'tray-quick' });
        }
      },
      {
        label: 'Backup C:\\dev\\packages',
        click: async () => {
          await container.backup.createBackup({ sourcePath: 'C:\\dev\\packages', label: 'tray-quick' });
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray!.setContextMenu(menu);
  };

  tray.on('click', () => {
    const w = getWindow();
    if (!w) return;
    if (w.isVisible()) w.hide(); else { w.show(); w.focus(); }
  });

  rebuildMenu();
}

export function teardownTray(): void {
  if (tray) { tray.destroy(); tray = null; }
}

function makeCyanDotPng(): Buffer {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA' +
    'AmJLR0T//xSrMc0AAAB1SURBVDjLY/z//z8DJYCJgUIwasCoAaMGjBowasCoAcPRAEYGBgYG' +
    'JgYS49+/fxlYWFgYWFhYGAYDA0Y2NjYGFhYWBhYWFgZSAUM4Bfz//5+BkZGRgZGRkYGJiYmB' +
    'iYmJgZmZmYGZmZmBg4ODgYODg4GTk5OBg4ODAQAS5wlLrxzlBgAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}
