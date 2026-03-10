# Kiosk Mode Setup Guide for Vibe-Tutor on Samsung Galaxy A54

This guide provides instructions for locking the Samsung Galaxy A54 to run **only** the Vibe-Tutor app, making it a dedicated homework/study device for your child.

## Overview

There are two methods to lock the device to Vibe-Tutor:

1. **Fully Single App Kiosk** (Recommended) - More secure, purpose-built solution
2. **Built-in App Pinning** (Simple) - Basic Samsung feature, easier but less secure

---

## Method 1: Fully Single App Kiosk (Recommended)

### Advantages

- Purpose-built for single-app lockdown
- Harder to bypass than native app pinning
- Remote management capabilities
- Unlimited trial version available

### Setup Instructions

#### Step 1: Install Fully Single App Kiosk

1. Open **Google Play Store** on the Galaxy A54
2. Search for **"Fully Single App Kiosk"**
3. Install the app by Fully GmbH
4. Grant all requested permissions when prompted

#### Step 2: Configure Kiosk Mode

1. Open **Fully Single App Kiosk** on the device
2. When prompted, grant the following permissions:
   - **Device Administrator** - Required to prevent app uninstallation
   - **Overlay Permission** - Required to block access to other apps
   - **Accessibility Service** - Required for lockdown features
3. On the main screen, tap **"Select App to Lock"**
4. Choose **Vibe Tutor** from the list of installed apps
5. Set an **Admin PIN** (remember this - you'll need it to unlock!)
   - Recommended: Use a 6-digit PIN that your child doesn't know
   - Write it down in a secure location

#### Step 3: Configure Security Settings

1. In Fully Single App Kiosk settings:
   - Enable **"Prevent Status Bar Pull-Down"** - Blocks access to quick settings
   - Enable **"Disable Hardware Buttons"** - Prevents Home/Back/Recents buttons
   - Enable **"Block Incoming Calls"** (optional) - Prevents interruptions
   - Enable **"Hide System Dialogs"** - Blocks Android system popups

2. Under **"Startup Settings"**:
   - Enable **"Start on Boot"** - Launches kiosk mode after device restart
   - Enable **"Restart App if Crashed"** - Auto-recovery

3. Under **"Advanced Settings"**:
   - Set **"Inactivity Reset"** to OFF (unless you want auto-logout)
   - Set **"Screen Timeout"** according to preference

#### Step 4: Activate Kiosk Mode

1. Tap **"Start Kiosk Mode"** button
2. The device will now be locked to Vibe-Tutor
3. Test by trying to exit - you should be prompted for the admin PIN

#### Step 5: Set Device Lock Screen (Important!)

Before activating kiosk mode, ensure the device has a lock screen PIN/password:

1. Open **Settings** → **Lock Screen**
2. Set **Screen Lock Type** to **PIN** or **Password**
3. Choose a PIN/password that your child doesn't know
4. This prevents device restart to bypass kiosk mode

---

## Method 2: Built-in App Pinning (Simple Alternative)

### Advantages

- No additional apps required
- Built into Samsung One UI
- Quick to set up

### Disadvantages

- Easier to bypass (Back + Recents buttons held simultaneously)
- Notifications and quick settings still accessible
- Not designed for long-term parental control

### Setup Instructions

#### Step 1: Enable Screen Lock

1. Open **Settings** on the Galaxy A54
2. Navigate to **Lock Screen** → **Screen Lock Type**
3. Select **PIN** or **Password**
4. Create a PIN/password your child doesn't know

#### Step 2: Enable App Pinning

1. Open **Settings**
2. Navigate to **Security and Privacy** → **More Security Settings**
3. Find and enable **Pin App** (may also be called "Pin Windows")
4. Toggle the switch to ON
5. Enable **"Ask for PIN before unpinning"** option

#### Step 3: Pin Vibe-Tutor App

1. Open the **Vibe Tutor** app
2. Tap the **Recents** button (left-most button on navigation bar)
   - If using gesture navigation: Swipe up from bottom and hold
3. Tap the **app icon** at the top of the Vibe-Tutor card
4. Select **"Pin this app"**
5. Tap **"Pin"** to confirm

The device is now locked to Vibe-Tutor. To exit, someone would need to:

- Hold **Back + Recents** buttons simultaneously for 3+ seconds
- Enter the device PIN/password

---

## Testing the Lockdown

After setup, test the following to ensure proper lockdown:

### Security Checks

- [ ] Try pressing Home button - should stay in Vibe-Tutor
- [ ] Try pressing Back button - should not exit app
- [ ] Try pulling down notification shade - should be blocked (Fully) or show limited access (Pinning)
- [ ] Try accessing quick settings - should be blocked (Fully) or show limited access (Pinning)
- [ ] Try restarting the device - should boot into locked state (Fully with "Start on Boot")

### Functionality Checks

- [ ] Vibe-Tutor app functions normally
- [ ] Homework can be added/completed
- [ ] Chat features work
- [ ] Focus timer works
- [ ] Achievements unlock properly

---

## Important Notes

### For Method 1 (Fully Single App Kiosk)

1. **Do not forget the Admin PIN** - Write it down securely. If lost, you may need to factory reset the device.

2. **Free Version Limitations** - The unlimited trial may show occasional popups. For a commercial license (one-time fee), visit fully-kiosk.com.

3. **Battery Optimization** - Disable battery optimization for Fully Single App Kiosk:
   - Settings → Apps → Fully Single App Kiosk → Battery → Unrestricted

4. **Updates** - Kiosk mode will prevent automatic app updates. Periodically unlock to update Vibe-Tutor:
   - Enter Admin PIN → Exit Kiosk → Update apps → Re-enter Kiosk Mode

### For Method 2 (App Pinning)

1. **Bypass Risk** - Tech-savvy children can Google "how to exit app pinning" and find the Back + Recents combination. This method is best for younger children or short-term use.

2. **Notifications** - Notifications from other apps will still appear. Consider disabling notifications for all apps except Vibe-Tutor:
   - Settings → Notifications → App Notifications → Disable for each app

3. **Repinning After Restart** - If the device restarts, you'll need to manually re-pin the app.

---

## Unlocking Instructions for Parents

See **KIOSK_UNLOCK_GUIDE.md** for detailed instructions on how to unlock the device for maintenance, updates, or emergencies.

---

## Troubleshooting

### Device Restarts but Doesn't Lock

- **Solution**: For Fully Kiosk, ensure "Start on Boot" is enabled in settings
- **Solution**: For App Pinning, you must manually re-pin after each restart

### Child Can Still Access Other Apps

- **Method 1**: Verify all permissions were granted to Fully Single App Kiosk
- **Method 1**: Check that "Disable Hardware Buttons" is enabled
- **Method 2**: Ensure App Pinning is enabled and app was properly pinned

### Vibe-Tutor App Crashes in Kiosk Mode

- **Method 1**: Enable "Restart App if Crashed" in Fully Kiosk settings
- **Both**: Clear Vibe-Tutor app cache: Enter admin mode → Settings → Apps → Vibe Tutor → Clear Cache

### Can't Enter Admin PIN / Forgot PIN

- **Method 1**: Factory reset may be required. Backup data first.
- **Method 2**: Restart device in Safe Mode, then disable App Pinning from Settings

### Notifications Still Appearing

- Disable notifications for all apps except Vibe-Tutor in Settings → Notifications

---

## Alternative Solutions (Advanced)

If you need more advanced features, consider these enterprise-grade MDM solutions:

- **Miradore** (free for up to 25 devices)
- **AppTec360 UEM** (free tier available)
- **AirDroid Business** (paid, but very robust)

These provide features like:

- Remote device management
- App whitelisting/blacklisting
- Website filtering
- Screen time reports
- Location tracking

However, they require more complex setup and account creation.

---

## Support

For issues specific to:

- **Vibe-Tutor app**: See main README.md and TROUBLESHOOTING.md
- **Fully Single App Kiosk**: Visit fully-kiosk.com/help
- **Samsung App Pinning**: Visit samsung.com/support or contact Samsung support

---

**Last Updated**: October 2025
**Compatible With**: Samsung Galaxy A54, Android 10+, One UI 5.0+
