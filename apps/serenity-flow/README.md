<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Serenity Flow

This app now lives in the VibeTech Nx workspace at `apps/serenity-flow`.

View your app in AI Studio: https://ai.studio/apps/40e8cf6b-af8a-45cf-9b3e-c09cc4caddb3

## Run Locally

**Prerequisites:** Node.js and pnpm from the workspace root.

```powershell
pnpm nx dev serenity-flow
```

Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key when using Gemini-backed features.

## VectorShift SVG Assets

Use `pnpm nx dev vectorshift-svg` from the workspace root to generate SVG assets. Generated files default to `D:/VectorShift_Outputs`; copy selected app-ready SVG files into Serenity Flow's app asset folders when they are ready to ship.
