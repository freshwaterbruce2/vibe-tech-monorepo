# Vibe-Tutor: Complete Render.com Deployment Guide

This guide walks you through deploying the Vibe-Tutor backend to Render.com so the app works fully on your son's phone with AI features.

---

## Step 1: Deploy Backend to Render (10 minutes)

### 1.1 Create Render Account

1. Go to <https://render.com>
2. Click "Get Started" (Free tier available)
3. Sign up with GitHub, GitLab, or email

### 1.2 Create New Web Service

1. Click "New +" button (top right)
2. Select "Web Service"
3. Choose deployment method:

**Option A: Connect GitHub (Recommended)**

- Click "Connect GitHub"
- Select your repository
- Choose the `Vibe-Tutor` directory

**Option B: Manual Deploy (If no GitHub)**

- Click "Deploy from Git URL"
- Or use Render CLI (instructions below)

### 1.3 Configure Service Settings

Fill in these settings:

**Basic Info:**

- **Name**: `vibe-tutor-backend` (or your choice)
- **Region**: Choose closest to you
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave blank (or `Vibe-Tutor` if in subdirectory)

**Build & Deploy:**

- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**

- Select **Free** tier (sufficient for personal use)
- Note: Free tier sleeps after 15 min inactivity (first request after sleep takes 30s)

### 1.4 Add Environment Variables

**CRITICAL STEP - Your API Key:**

1. Scroll to "Environment Variables" section
2. Click "Add Environment Variable"
3. Add:

   ```
   Key: DEEPSEEK_API_KEY
   Value: YOUR_DEEPSEEK_API_KEY
   ```

4. Click "Add Environment Variable" again
5. Add:

   ```
   Key: OPENROUTER_API_KEY
   Value: YOUR_OPENROUTER_API_KEY
   ```

6. Click "Add Environment Variable" again
7. Add:

   ```
   Key: NODE_ENV
   Value: production
   ```

### 1.5 Deploy

1. Click "Create Web Service"
2. Render will start building (takes 2-3 minutes)
3. Wait for "Live" status with green checkmark
4. **COPY YOUR URL**: Look like `https://vibe-tutor-backend-xxxx.onrender.com`

---

## Step 2: Update App with Your Backend URL

### 2.1 Edit Frontend Config

1. Open `C:\dev\apps\vibe-tutor\src\config.ts`
2. Find `PRODUCTION_BACKEND_URL`
3. Replace with YOUR Render URL:

   ```typescript
   const PRODUCTION_BACKEND_URL = 'https://vibe-tutor-backend-xxxx.onrender.com';
   ```

4. Save the file

### 2.2 Rebuild APK

Run these commands:

```bash
cd C:/dev/apps/vibe-tutor
pnpm run build
pnpm exec cap sync android
cd android
./gradlew bundleRelease
```

Or use the quick script:

```bash
cd C:/dev/apps/vibe-tutor && pnpm run build && pnpm exec cap sync android && cd android && ./gradlew bundleRelease
```

### 2.3 Copy New APK

The updated APK is at:

```
C:\dev\apps\vibe-tutor\android\app\build\outputs\bundle\release\app-release.aab
```

Copy to easy location:

```bash
cp C:/dev/apps/vibe-tutor/android/app/build/outputs/bundle/release/app-release.aab C:/dev/apps/vibe-tutor/vibe-tutor-release.aab
```

---

## Step 3: Install on Phone

### Method 1: USB Transfer

1. Connect phone to computer via USB
2. Copy `vibe-tutor-final.apk` to phone's Downloads folder
3. Enable Unknown Sources on phone:
   - Settings → Security → Unknown Sources (enable)
4. Open Files app on phone
5. Navigate to Downloads
6. Tap `vibe-tutor-final.apk`
7. Tap Install
8. Tap Open

### Method 2: Email

1. Email `vibe-tutor-final.apk` to yourself
2. Open email on phone
3. Download attachment
4. Tap to install

---

## Step 4: Test AI Features

After installation, test these features require the backend:

1. **Voice Homework Input:**
   - Tap microphone icon
   - Say "Add math homework due tomorrow"
   - Should parse and add task

2. **AI Tutor:**
   - Navigate to "AI Tutor" tab
   - Ask "Explain photosynthesis"
   - Should get AI response

3. **AI Buddy:**
   - Navigate to "AI Buddy" tab
   - Chat casually
   - Should respond

**If AI features don't work:**

- Check internet connection
- Wait 30 seconds (free tier wakes up)
- Check Render logs (see troubleshooting)

---

## Render Dashboard & Monitoring

### View Logs

1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab
4. See real-time server activity

### Check Status

- Green "Live" = Working
- Yellow "Deploying" = Updating
- Red "Failed" = Error (check logs)

### Monitor Usage

- Free tier: 750 hours/month
- View usage in dashboard
- Upgrade to paid for always-on ($7/month)

---

## Troubleshooting

### Backend Won't Deploy

**Error: "Build failed"**

- Check Render logs for error message
- Verify `package.json` has `"start": "node server.mjs"`
- Ensure all dependencies in `package.json`

**Error: "DEEPSEEK_API_KEY not found"**

- Re-add environment variable in Render dashboard
- Click "Manual Deploy" to redeploy

### App Can't Connect to Backend

**"Connection failed" or timeout errors:**

- Check Render service is "Live" (green)
- Copy exact URL from Render (including https://)
- Verify URL in `src/config.ts` matches exactly
- Rebuild and reinstall APK

**First request takes 30 seconds:**

- Normal on free tier (service sleeping)
- Wait patiently for wake-up
- Subsequent requests are fast

### CORS Errors

**"Not allowed by CORS":**

- Check Render logs
- Server should auto-allow `capacitor://localhost`
- Try reinstalling app

### AI Responses Blocked

**"Content blocked" or inappropriate content warnings:**

- Server filters inappropriate content
- Try rephrasing question
- Check Render logs for filter triggers

---

## Cost Breakdown

### Free Tier (Render.com)

- 750 hours/month free
- Perfect for personal/family use
- Sleeps after 15 min inactivity
- **Cost: $0/month**

### Paid Tier (Optional)

- Always-on (no sleep)
- Faster response times
- More usage hours
- **Cost: $7/month**

### DeepSeek API Costs

- ~$0.27 per 1000 tokens
- Average homework question: 100-200 tokens = $0.03
- **Monthly cost: ~$1-5 depending on usage**

**Total Monthly Cost:**

- Free tier: $1-5 (just DeepSeek API)
- Paid tier: $8-12 (Render + DeepSeek)

---

## Alternative Deployment Methods

### Railway.app

- Similar to Render
- Free tier available
- Deploy at <https://railway.app>

### Fly.io

- Free tier: 3 apps
- Deploy at <https://fly.io>
- Requires Dockerfile (not included)

### Heroku

- No free tier (starts $5/month)
- Easy deployment
- Deploy at <https://heroku.com>

---

## Updating the App

### Backend Updates

1. Push code to GitHub
2. Render auto-deploys (if connected)
3. Or click "Manual Deploy" in Render dashboard

### Frontend Updates

1. Make changes to React code
2. Rebuild: `npm run build`
3. Sync: `npx cap sync android`
4. Build APK: `cd android && ./gradlew assembleDebug`
5. Reinstall on phone

---

## Production Checklist

Before giving app to your son:

- [ ] Render backend deployed and "Live"
- [ ] Environment variable `DEEPSEEK_API_KEY` set
- [ ] Frontend `config.ts` updated with Render URL
- [ ] APK rebuilt with production config
- [ ] App installed on phone
- [ ] Tested voice input
- [ ] Tested AI Tutor chat
- [ ] Tested AI Buddy chat
- [ ] Focus timer works
- [ ] Achievements unlock
- [ ] Parent dashboard accessible (PIN: 1234)

---

## Support & Resources

**Render Documentation:**
<https://render.com/docs>

**DeepSeek API Docs:**
<https://platform.deepseek.com/docs>

**Capacitor Docs:**
<https://capacitorjs.com/docs>

**Need Help?**
Check Render logs first - they show exactly what's wrong!

---

You're done! Your son now has a fully-functional AI-powered homework app running on cloud infrastructure. 🚀
