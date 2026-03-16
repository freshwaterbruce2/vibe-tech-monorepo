import { useState, useEffect } from "react";
import {
  DestinationDC,
  FreightType,
  UserSettings,
  VoiceEngine,
  VoiceActivationMode,
} from "@/types/shipping";

const DEFAULT_SETTINGS: UserSettings = {
  interactionMode: "tap",
  enableActionButton: false,
  lastUsedDC: "6024",
  lastUsedFreightType: "23/43",
  autoExportOnShiftEnd: false,
  // Voice recognition settings
  voiceRecognitionEnabled: true,
  voiceEngine: "browser",
  noiseSuppression: true,
  confidenceThreshold: 0.75,
  commandTimeout: 3000,
  useGrammar: true,
  autoStop: true,
  // Additional voice settings
  speakBackCommands: true,
  voiceVolume: 0.8,
  voiceAcceptPartialResults: false,
  voiceActivationMode: "button",
};

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = window.electronAPI?.store.get("userSettings");
    if (savedSettings) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings({
          ...DEFAULT_SETTINGS, // Ensure any new settings have defaults
          ...JSON.parse(savedSettings), // Override with saved settings
        });
      } catch {
        // Fallback to default settings
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    try {
      window.electronAPI?.store.set("userSettings", JSON.stringify(settings));

      // Use IndexedDB for more reliable storage in PWA context
      if ("indexedDB" in window) {
        const request = indexedDB.open("door-ship-flow-db", 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings", { keyPath: "id" });
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(["settings"], "readwrite");
          const store = transaction.objectStore("settings");
          store.put({ id: "userSettings", ...settings });
        };
      }
    } catch {
      // Ignore IndexedDB errors
    }
  }, [settings]);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateLastUsedDC = (dc: DestinationDC) => {
    updateSetting("lastUsedDC", dc);
  };

  const updateLastUsedFreightType = (type: FreightType) => {
    updateSetting("lastUsedFreightType", type);
  };

  const updateVoiceEngine = (engine: VoiceEngine) => {
    updateSetting("voiceEngine", engine);
  };

  const updateVoiceActivationMode = (mode: VoiceActivationMode) => {
    updateSetting("voiceActivationMode", mode);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSetting,
    updateLastUsedDC,
    updateLastUsedFreightType,
    updateVoiceEngine,
    updateVoiceActivationMode,
    resetSettings,
  };
};
