# Vibe-Tutor Backend for Render.com

This folder contains everything needed to deploy the Vibe-Tutor backend to Render.com.

## Files Included

- `server.mjs` - Express server with Gemini primary + OpenRouter fallback AI proxy
- `package.json` - Node dependencies and start script
- `.env` - Local env vars for backend testing (do not commit)

## Deploy to Render

### Option 1: Manual Upload (Easiest)

1. Create a new GitHub repository (can be private)
2. Upload these 2 files:
   - `server.mjs`
   - `package.json`
3. Connect repository to Render
4. Add environment variables in Render dashboard:
   - `GEMINI_API_KEY` = your Google Gemini key (primary)
   - `OPENROUTER_API_KEY` = your OpenRouter key (fallback)
   - `NODE_ENV` = `production`

### Option 2: Git Push

```bash
cd render-backend
git init
git add server.mjs package.json
git commit -m "Initial backend"
git remote add origin YOUR-GITHUB-REPO-URL
git push -u origin main
```

Then connect to Render.

## Environment Variables Required

Add these in Render dashboard (NOT in .env file on your remote repo):

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
NODE_ENV=production
```

## Render Configuration

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Runtime**: Node
- **Instance Type**: Free

## Security Note

Never commit `.env` file to a public repository!
Always add environment variables through Render dashboard.

---

After deployment, copy your Render URL and update the frontend config:
`C:\dev\apps\vibe-tutor\src\config.ts` (see `PRODUCTION_BACKEND_URL`)
