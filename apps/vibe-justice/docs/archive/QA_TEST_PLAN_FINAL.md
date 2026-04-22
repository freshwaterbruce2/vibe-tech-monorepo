# Vibe Justice v1.0 - Manual QA Test Plan

## 1. Connectivity & Security (Air-Gap Verification)

**(Goal: Verify Local Routing Logic)**

1.  **Launch App**: Start `VibeJustice.exe`.
2.  **Observe Indicator**: Check the "Live Vibe Check" indicator in the bottom-left sidebar.
    *   **Expected**: Shows "SYSTEM: SECURE" (Green) or "ONLINE" (Blue).
3.  **Simulate Disconnect**:
    *   *Simulate*: Unplug Ethernet/Disable Wi-Fi, OR toggle the "Secure Mode" button in the UI if implemented to force offline mode.
    *   *Note*: The current logic defaults to "Local" if not explicitly configured for Cloud. The "Secure Mode" toggle in `Sidebar.tsx` manually forces the visual state.
4.  **Verify State**:
    *   **Action**: Click the "Vibe Check" button.
    *   **Expected**: Indicator toggles state visually.
    *   **Deep Check**: With internet off, send a chat message.
    *   **Expected**: App should still respond using the local model (if running via Ollama/Llama) or fail gracefully with a specific "Connection Error" message, NOT a generic crash.

## 2. Export Engine

**(Goal: Verify Phase 4 Explorer Integration)**

1.  **Select Case**: Open an active investigation (e.g., "CASE-2024-001").
2.  **Trigger Export**:
    *   Press `Ctrl + E` (Keyboard Shortcut).
    *   OR click the "Report (DOCX)" button in the UI.
3.  **Observe System Behavior**:
    *   **Expected**:
        1. A Toast/Alert confirms "Exported to D:\exports\...".
        2. **Windows Explorer** automatically launches.
        3. The directory `D:\exports` is open.
        4. The specific file (e.g., `CASE-2024-001_summary_....docx`) is **highlighted/selected**.

## 3. Persistence (Archive Protocol)

**(Goal: Verify Soft Delete & JSON Storage)**

1.  **Archive a Case**:
    *   Hover over a case in the Sidebar.
    *   Click the "Archive" icon.
    *   **Expected**: Case disappears from "Active View" immediately (sliding animation/optimistic update).
2.  **Verify File System**:
    *   Navigate to `D:\cases\[CASE_ID]\metadata.json`.
    *   Open with Text Editor.
    *   **Expected**: `"is_archived": true` and `"status": "Archived"`.
3.  **Restart App**:
    *   Close `VibeJustice.exe`.
    *   Relaunch `VibeJustice.exe`.
4.  **Verify UI State**:
    *   Check Sidebar "Active Cases". Case should **NOT** be there.
    *   Open Settings -> Toggle "Show Archived".
    *   **Expected**: Case appears in the list with "Dimmed/Dashed" styling.
