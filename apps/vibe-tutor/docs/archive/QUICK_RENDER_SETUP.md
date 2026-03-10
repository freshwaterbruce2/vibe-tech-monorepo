# Deploy Vibe-Tutor Backend to Render (FREE) - 10 Minutes

Follow these exact steps to get your son's app working with AI features.

---

## Step 1: Create Render Account (2 min)

1. Go to: **<https://render.com>**
2. Click **"Get Started for Free"**
3. Sign up with:
   - GitHub (easiest)
   - Or Google
   - Or Email

No credit card required for free tier!

---

## Step 2: Deploy Backend (5 min)

### A. Create New Web Service

1. After login, click **"New +"** (top right)
2. Select **"Web Service"**

### B. Upload Your Code

**Option 1 - If you have GitHub:**

- Click "Connect GitHub"
- Find and select your Vibe-Tutor repo
- Click "Connect"

**Option 2 - No GitHub? Use Public Git:**

1. Click "Public Git repository"
2. I'll create a simple repo for you (see next section)

### C. Configure Settings

Fill in these EXACT values:

**Service Details:**

```
Name: vibe-tutor-backend
Region: US West (or closest to you)
Branch: main
Root Directory: (leave blank)
```

**Build & Deploy:**

```
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Instance Type:**

```
Select: Free
```

### D. Add Environment Variables

**THIS IS THE MOST IMPORTANT PART:**

Scroll down to **"Environment Variables"**

Click **"Add Environment Variable"**

Add these TWO variables:

**Variable 1:**

```
Key: DEEPSEEK_API_KEY
Value: YOUR_DEEPSEEK_API_KEY

Key: OPENROUTER_API_KEY
Value: YOUR_OPENROUTER_API_KEY
```

**Variable 2:**

```
Key: NODE_ENV
Value: production
```

### E. Deploy

1. Click **"Create Web Service"** (bottom)
2. Wait 2-3 minutes for deployment
3. Look for **"Live"** with green checkmark
4. **COPY YOUR URL** - looks like:

   ```
   https://vibe-tutor-backend-xxxx.onrender.com
   ```

   Write it down or keep tab open!

---

## Step 3: Update App Config (2 min)

1. Open this file in a text editor:

   ```
   C:\dev\Vibe-Tutor\src\config.ts
   ```

2. Find line 9 (around line 9):

   ```typescript
   const PRODUCTION_BACKEND_URL = 'https://vibe-tutor-backend.onrender.com';
   ```

3. Replace with YOUR Render URL:

   ```typescript
   const PRODUCTION_BACKEND_URL = 'https://vibe-tutor-backend-xxxx.onrender.com';
   ```

   (Use the exact URL you copied from Render!)

4. Save the file

---

## Step 4: Rebuild APK (3 min)

Open Command Prompt and run:

```bash
cd C:\dev\Vibe-Tutor
npm run build
npx cap sync android
cd android
gradlew assembleDebug
```

Wait for "BUILD SUCCESSFUL" message.

The new APK is at:

```
C:\dev\Vibe-Tutor\android\app\build\outputs\apk\debug\app-debug.apk
```

Copy to easy location:

```bash
cd C:\dev\Vibe-Tutor
copy android\app\build\outputs\apk\debug\app-debug.apk vibe-tutor-FINAL.apk
```

---

## Step 5: Install on Phone

### Transfer APK to Phone

**Method 1 - USB:**

1. Connect phone via USB
2. Copy `vibe-tutor-FINAL.apk` to phone's Downloads folder

**Method 2 - Email:**

1. Email the APK to yourself
2. Download on phone

### Install

1. On phone: Settings → Security → Install from Unknown Sources (enable)
2. Open Files app → Downloads
3. Tap `vibe-tutor-FINAL.apk`
4. Tap **Install**
5. Tap **Open**

---

## Step 6: Test AI Features

Open the app and test:

1. **Voice Input:**
   - Tap microphone icon
   - Say: "Add math homework due tomorrow"
   - Should parse and add task

2. **AI Tutor:**
   - Go to AI Tutor tab
   - Ask: "What is photosynthesis?"
   - Should get AI response

**First request might take 30 seconds** (free tier waking up)

- Subsequent requests are instant!

---

## Troubleshooting

### "Connection failed" or timeout

- Wait 30 seconds (server waking up)
- Check Render dashboard shows "Live" (green)
- Verify URL in config.ts matches Render exactly

### AI not responding

- Check phone has internet
- Go to Render dashboard → Logs tab
- See if requests are arriving

### "Build failed" in Render

- Check you added BOTH environment variables
- Click "Manual Deploy" to retry

---

## What You Get (FREE)

- 750 hours/month on Render (plenty for family use)
- Secure API key storage
- Works on WiFi and mobile data
- No computer needed running
- Total cost: $0/month + your existing DeepSeek usage

---

## Need Help?

Check Render logs:

1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab
4. See real-time server activity

---

You're done! App is production-ready! 🚀
