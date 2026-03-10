# Upload Vibe-Tutor Backend to GitHub - Step by Step

Follow these exact steps to create a GitHub repo and upload your backend.

---

## Step 1: Create New GitHub Repository (2 min)

1. **Go to GitHub:** <https://github.com>
2. **Sign in** (or create account if you don't have one)
3. Click the **"+"** icon (top right) → **"New repository"**

**Fill in these details:**

```
Repository name: vibe-tutor-backend
Description: Backend API server for Vibe-Tutor homework app
Visibility: ✓ Private (recommended) or Public (your choice)
```

**IMPORTANT - DO NOT CHECK THESE:**

- [ ] Do NOT add README
- [ ] Do NOT add .gitignore
- [ ] Do NOT choose a license

1. Click **"Create repository"**

---

## Step 2: Upload Files to GitHub (3 min)

You'll see a page with options. Choose **"uploading an existing file"** link.

### Files to Upload

Navigate to: `C:\dev\apps\vibe-tutor\render-backend\`

**Drag and drop these 3 files onto GitHub:**

1. ✅ `server.mjs` (the Express server)
2. ✅ `package.json` (dependencies)
3. ✅ `.gitignore` (protects your secrets)

**DO NOT UPLOAD:**

- ❌ `.env` (contains your API key - must stay secret!)
- ❌ `README.md` (optional, not needed)
- ❌ `GITHUB_UPLOAD_INSTRUCTIONS.md` (this file)

### Commit the Files

At the bottom of the page:

```
Commit message: Initial backend setup
```

Click **"Commit changes"**

✅ Your GitHub repo is ready!

---

## Step 3: Deploy to Render (5 min)

### A. Create Render Account

1. **Go to:** <https://render.com>
2. Click **"Get Started for Free"**
3. **Sign up with GitHub** (easiest - click "GitHub" button)
4. Authorize Render to access your GitHub

### B. Create New Web Service

1. After login, click **"New +"** (top right)
2. Select **"Web Service"**
3. Click **"Connect a repository"**
4. Find **"vibe-tutor-backend"** in the list
5. Click **"Connect"**

### C. Configure Service

**Fill in these EXACT values:**

**Name:**

```
vibe-tutor-backend
```

**Region:**

```
Oregon (US West) or closest to you
```

**Branch:**

```
main
```

(or `master` if that's what GitHub created)

**Root Directory:**

```
(leave blank)
```

**Runtime:**

```
Node
```

**Build Command:**

```
npm install
```

**Start Command:**

```
npm start
```

**Instance Type:**

```
Free
```

### D. Add Environment Variables

**THIS IS CRITICAL - Production AI keys:**

Scroll down to **"Environment Variables"**

Click **"Add Environment Variable"**

**Add Variable #1:**

```
Key: GEMINI_API_KEY
Value: YOUR_GEMINI_API_KEY
```

Click **"Add Environment Variable"** again

**Add Variable #2:**

```
Key: OPENROUTER_API_KEY
Value: YOUR_OPENROUTER_API_KEY
```

Click **"Add Environment Variable"** again

**Add Variable #3:**

```
Key: NODE_ENV
Value: production
```

### E. Deploy

1. Click **"Create Web Service"** (bottom of page)
2. Render will start building (watch the logs!)
3. Wait for **"Live"** status (green checkmark) - takes 2-3 minutes
4. **YOUR URL IS HERE** - top of page, looks like:

   ```
   https://vibe-tutor-backend-abc123.onrender.com
   ```

---

## Step 4: Copy Your Render URL

**IMPORTANT:** Write down or copy your full Render URL

It will look like:

```
https://vibe-tutor-backend-xyz123.onrender.com
```

Share this URL with Claude to update the app config!

---

## Verification - Is It Working?

Test your backend is live:

Open this URL in your browser (replace with YOUR URL):

```
https://vibe-tutor-backend-xyz123.onrender.com/api/health
```

You should see:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T..."
}
```

✅ If you see this, your backend is deployed and working!

---

## Troubleshooting

### "Build failed" in Render

- Check you uploaded `server.mjs` and `package.json` to GitHub
- Verify environment variables are added correctly
- Click "Manual Deploy" to retry

### "Cannot find module" error

- Make sure `package.json` was uploaded to GitHub
- Check Build Command is: `npm install`
- Check Start Command is: `npm start`

### GitHub won't let me upload files

- Make sure you're on the right page (uploading files)
- Try dragging files one at a time
- Or use "Add file" → "Upload files" button

---

## What's Next?

After deployment succeeds:

1. **Copy your Render URL**
2. **Share it with Claude** (paste in chat)
3. Claude will:
   - Update the app config
   - Rebuild the APK
   - Give you final APK to install on phone

---

**Need help? Share a screenshot of where you're stuck!**
