if (typeof window !== "undefined" && !("process" in window)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).process = {
    env: { NODE_ENV: import.meta.env.MODE },
    cwd: () => "/",
    stderr: { write: () => {} },
    stdout: { write: () => {} },
    nextTick: (cb: (...args: unknown[]) => void) => setTimeout(cb, 0),
    platform: "win32",
  };
}

// Mock Tauri IPC layer in standard browser environment
import { mockIPC } from "@tauri-apps/api/mocks";
const isTauri = typeof window !== "undefined" && (("__TAURI__" in window) || ("__TAURI_IPC__" in window));
if (!isTauri) {
  mockIPC((cmd, args) => {
    console.log(`[Tauri Mock IPC] ${cmd}:`, args);
    switch (cmd) {
      case "get_tasks":
        return [];
      case "get_agent_status":
        return {
          status: "idle",
          currentTask: null,
          health: "good",
        };
      case "list_projects":
        return [];
      case "get_api_key_status":
        return {
          deepseek_key_set: false,
          groq_key_set: false,
          openrouter_key_set: false,
          google_key_set: false,
          kimi_key_set: false,
        };
      case "get_deep_work_data":
        return {
          stats: { totalMinutes: 0, sessionCount: 0, dailyAverage: 0 },
          sessions: [],
        };
      case "check_db_health":
        return { healthy: true, error: null };
      default:
        return null;
    }
  });
}

import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

import { AdminProvider } from "./context/AdminContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { ThemeProvider } from "./context/ThemeProvider";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
	<React.StrictMode>
		<HelmetProvider>
			<ThemeProvider defaultTheme="dark" enableSystem>
				<AdminProvider>
					<NotificationsProvider>
						<App />
					</NotificationsProvider>
				</AdminProvider>
			</ThemeProvider>
		</HelmetProvider>
	</React.StrictMode>,
);
