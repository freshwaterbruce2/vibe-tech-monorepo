---
name: code-studio:build
description: Build Vibe Code Studio for Windows production
model: sonnet
---

# Vibe Code Studio Production Build

Build Vibe Code Studio code editor for Windows deployment.

## Steps

1. Navigate to Vibe Code Studio directory:

   ```bash
   cd C:\dev\apps\vibe-code-studio
   ```

2. Clean previous builds:

   ```bash
   rm -rf dist out
   echo "✓ Cleaned previous build artifacts"
   ```

3. Build renderer (Vite):

   ```bash
   echo "Building renderer process..."
   pnpm build:renderer
   ```

4. Build main process (TypeScript):

   ```bash
   echo ""
   echo "Building main process..."
   pnpm build:main
   ```

5. Package for Windows:

   ```bash
   echo ""
   echo "Packaging Electron application..."
   pnpm build:electron
   ```

6. Report build artifacts:

   ```bash
   echo ""
   echo "=== BUILD ARTIFACTS ==="
   if [ -d "out" ]; then
     ls -lh out/*.exe 2>/dev/null
     du -sh out
   fi
   ```

## Expected Output

- Renderer bundle optimized
- Main process compiled
- Windows executable (.exe) created
- Installer package generated (NSIS)
- Build size typically 100-200MB (includes Electron runtime)
- Artifacts in out/ directory
