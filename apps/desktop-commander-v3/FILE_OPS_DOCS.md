# Desktop Commander V3 - File Operations Documentation

This document describes the parameters and expected outcomes for the file operation commands available in Desktop Commander V3. These commands are available via both the MCP server and the IPC client.

**Access Control:**

*   Operations are strictly limited to allowed paths: `C:\dev` (Read/Write), `D:\` (Read/Write), and `OneDrive` (Read-Only).
*   Any attempt to access other paths will result in an "Access denied" error.

## Commands

### `dc_move_file`

Moves or renames a file or directory.

*   **Parameters:**
  *   `source` (string, required): The absolute path of the file or directory to move.
  *   `destination` (string, required): The absolute path where the file or directory should be moved.
*   **Example (IPC/Text):** `dc_move_file source="C:\dev\old.txt" destination="C:\dev\new.txt"`
*   **Example (JSON):** `{ "source": "C:\\dev\\old.txt", "destination": "C:\\dev\\new.txt" }`
*   **Expected Outcome:**
  *   **Success:** Returns `{ "moved": true, "from": "...", "to": "..." }`. The file at `source` is removed and exists at `destination`.
  *   **Error:** Throws if permissions are invalid, source doesn't exist, or destination is invalid.

### `dc_copy_file`

Copies a file.

*   **Parameters:**
  *   `source` (string, required): The absolute path of the file to copy.
  *   `destination` (string, required): The absolute path for the copy.
*   **Example (IPC/Text):** `dc_copy_file source="C:\dev\template.txt" destination="C:\dev\project\readme.txt"`
*   **Expected Outcome:**
  *   **Success:** Returns `{ "copied": true, "from": "...", "to": "..." }`. The file exists at both locations.
  *   **Error:** Throws if permissions are invalid or source doesn't exist.

### `dc_get_file_info`

Retrieves metadata about a file or directory.

*   **Parameters:**
  *   `path` (string, required): The absolute path to investigate.
*   **Example (IPC/Text):** `dc_get_file_info path="C:\dev\project"`
*   **Expected Outcome:**
  *   **Success:** Returns a JSON object with file details:

        ```json
        {
          "exists": true,
          "size": 1024,
          "created": "2023-01-01T12:00:00.000Z",
          "modified": "2023-01-02T12:00:00.000Z",
          "isDirectory": true,
          "isFile": false,
          "permissions": "-rw-rw-rw-"
        }
        ```

  *   **Error:** Throws if path access is denied. Returns `{ "exists": false }` if file is missing (but path is allowed).

### `dc_delete_file`

Deletes a file or directory.

*   **Parameters:**
  *   `path` (string, required): The absolute path to delete.
  *   `recursive` (boolean, optional): Set to `true` to delete directories recursively. Default is `false`.
*   **Example (IPC/Text):** `dc_delete_file path="C:\dev\temp_folder" recursive=true`
*   **Expected Outcome:**
  *   **Success:** Returns `{ "deleted": true, "path": "..." }`. The target is permanently removed.
  *   **Error:** Throws if permissions are invalid or target doesn't exist.
