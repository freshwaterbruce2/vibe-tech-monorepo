# Screenshot Capture Guide

**Goal:** Get 7 high-quality screenshots for Play Store

---

## 📱 Method 1: Browser Screenshots (Easiest)

**Step 1:** Open <http://localhost:5173> in Chrome

**Step 2:** Open DevTools (F12)

**Step 3:** Toggle Device Toolbar (Ctrl+Shift+M)

**Step 4:** Set device to Pixel 5 (1080 x 2340)

**Step 5:** For each view:

### Screenshot 1: Homework Dashboard ⭐ MOST IMPORTANT

1. Should show: Task list, "Add Homework" button, points counter
2. Ideal: 2-3 tasks visible (some complete, some pending)
3. Press: Ctrl+Shift+P → type "Capture screenshot" → Enter
4. Save as: `01-homework-dashboard.png`

### Screenshot 2: AI Tutor Chat ⭐

1. Navigate to AI Tutor
2. Send message: "Help me understand photosynthesis"
3. Wait for AI response
4. Capture when chat shows Q&A exchange
5. Save as: `02-ai-tutor-chat.png`

### Screenshot 3: Visual Schedules ⭐

1. Navigate to Schedules
2. Should show morning/evening routine steps
3. Ideal: Some steps complete, some pending
4. Save as: `03-visual-schedules.png`

### Screenshot 4: Brain Games

1. Navigate to Brain Games
2. Select Word Hunt
3. Show game in progress (or start screen)
4. Save as: `04-brain-games.png`

### Screenshot 5: Token Wallet

1. Navigate to Tokens
2. Should show token balance and transactions
3. Save as: `05-token-wallet.png`

### Screenshot 6: Sensory Settings

1. Navigate to Sensory Settings
2. Shows all accessibility controls
3. Save as: `06-sensory-settings.png`

### Screenshot 7: Parent Dashboard

1. Navigate to Parent Zone
2. Enter PIN (or show PIN entry screen)
3. Show progress reports
4. Save as: `07-parent-dashboard.png`

---

## 📱 Method 2: Real Device via ADB

```powershell
# Connect phone via USB, enable USB debugging

# For each view:
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png store-assets/screenshots/[filename].png
```

---

## 📱 Method 3: Phone Screenshots

1. Open app on phone
2. Navigate to each view
3. Screenshot: Power + Volume Down
4. Transfer to computer
5. Rename files appropriately

---

## ✅ Screenshot Checklist

- [ ] 01-homework-dashboard.png (most important!)
- [ ] 02-ai-tutor-chat.png
- [ ] 03-visual-schedules.png
- [ ] 04-brain-games.png (optional but good)
- [ ] 05-token-wallet.png (optional)
- [ ] 06-sensory-settings.png (optional)
- [ ] 07-parent-dashboard.png (optional)

**Minimum:** First 3 are essential
**Recommended:** All 7 show complete feature set

---

## 🎨 Post-Processing (Optional)

### Option 1: Add Device Frame

- Go to <https://screenshot.rocks>
- Upload screenshot
- Select device frame (Pixel 5)
- Download with frame

### Option 2: Crop/Resize

If screenshots aren't exactly 1080×1920:

- Use Photopea (<https://photopea.com>)
- Resize to 1080×1920
- Export as PNG

---

## 💡 Tips for Great Screenshots

**Do:**

- ✅ Show actual content (not empty screens)
- ✅ Use light/normal theme (more visibility)
- ✅ Show key features clearly
- ✅ Make sure text is readable
- ✅ Capture when UI looks good (no loading spinners)

**Don't:**

- ❌ Show error messages
- ❌ Show placeholder/Lorem ipsum text
- ❌ Include personal information
- ❌ Use blurry/low-quality images

---

**Time Estimate:** 30 minutes for all 7 screenshots
**Priority:** Get first 3 done, others optional
