---
name: code-studio:dev
description: Start Vibe Code Studio Electron app in development mode
model: sonnet
---

# Vibe Code Studio Development Mode

Start the Vibe Code Studio code editor in development mode with hot reload.

## Steps

1. Navigate to Vibe Code Studio directory:

   ```bash
   cd C:\dev\apps\vibe-code-studio
   ```

2. Install dependencies if needed:

   ```bash
   if [ ! -d "node_modules" ]; then
     echo "Installing dependencies..."
     pnpm install
   fi
   ```

3. Start Electron with hot reload:

   ```bash
   pnpm dev
   ```

4. Report status:

   ```
   ✓ Vibe Code Studio development mode started
   → Electron app launching...
   → Renderer hot reload: ENABLED
   → Main process debugging: ENABLED
   → Press Ctrl+C to stop
   ```

## Expected Output

- Electron window opens with code editor
- Hot Module Replacement for renderer process
- Main process restarts on changes
- DevTools available (F12)
- File system access ready
- Terminal integration active
