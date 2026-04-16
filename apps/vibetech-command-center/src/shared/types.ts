// Shared types between main and renderer. Populated in later chunks.
export interface CommandCenterAPI {
  version: string;
}

declare global {
  interface Window {
    commandCenter: CommandCenterAPI;
  }
}
