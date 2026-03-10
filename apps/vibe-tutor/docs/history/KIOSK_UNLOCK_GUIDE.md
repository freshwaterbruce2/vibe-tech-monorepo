# Kiosk Mode Unlock Guide for Parents

This guide provides instructions for **parents** to unlock the Galaxy A54 from Vibe-Tutor kiosk mode for maintenance, updates, or emergencies.

---

## Quick Reference

| **Scenario** | **Method 1: Fully Kiosk** | **Method 2: App Pinning** |
|---|---|---|
| **Temporary unlock** | Enter Admin PIN | Hold Back + Recents |
| **Emergency unlock** | Restart in Safe Mode | Restart in Safe Mode |
| **Forgot PIN** | Factory Reset required | Disable in Safe Mode |

---

## Method 1: Unlocking Fully Single App Kiosk

### Normal Unlock (Temporary Access)

#### Option A: Using Admin PIN

1. In the Vibe-Tutor app, tap the screen **5 times rapidly** in the top-left corner
   - This opens the Fully Kiosk admin menu overlay
2. Enter your **Admin PIN** when prompted
3. Tap **"Exit Kiosk Mode"**
4. The device is now unlocked - you can access Settings, Play Store, etc.

#### Option B: Using Power Button

1. Press and hold the **Power button** for 3 seconds
2. When the power menu appears, you may see an option to exit kiosk mode
3. Enter your **Admin PIN** when prompted
4. The device is now unlocked

#### Re-enabling Kiosk Mode

1. Open the **Fully Single App Kiosk** app
2. Verify settings are correct
3. Tap **"Start Kiosk Mode"**
4. Hand the device back to your child

### Emergency Unlock (If PIN Forgotten or App Malfunctioning)

#### Step 1: Boot into Safe Mode

1. Press and hold the **Power button** until the power menu appears
2. Tap and hold **"Power off"** for 2-3 seconds
3. When prompted "Reboot to Safe Mode?", tap **"Safe mode"**
4. The device will restart with "Safe mode" in the bottom-left corner
5. All third-party apps (including Fully Kiosk) will be disabled

#### Step 2: Disable Fully Kiosk

1. Open **Settings** → **Apps**
2. Find **Fully Single App Kiosk** in the app list
3. Tap **"Force Stop"**
4. Tap **"Disable"** or **"Uninstall"**
5. If prompted about Device Administrator, tap **"Deactivate"** first

#### Step 3: Exit Safe Mode

1. Restart the device normally (Power button → Restart)
2. The device will boot normally without kiosk mode

#### Important Notes

- Safe Mode disables ALL third-party apps temporarily, including Vibe-Tutor
- Any data stored in Vibe-Tutor is safe and will be available after exiting Safe Mode
- If you disabled Fully Kiosk, you'll need to reinstall and reconfigure it

---

## Method 2: Unlocking App Pinning

### Normal Unlock

1. Hold the **Back button** and **Recents button** simultaneously for 3+ seconds
   - Back button is the left-most button on the navigation bar
   - Recents button is the right-most button on the navigation bar
2. When prompted, enter your **device PIN or password**
3. The app will unpin and you'll return to the home screen

#### For Gesture Navigation

If you're using gesture navigation instead of buttons:

1. Swipe up from the bottom and hold (to show Recents)
2. Swipe left or right to view other apps
3. Note: This may not work if pinning is properly secured - you may need to restart the device

### Re-pinning After Unlock

1. Open **Vibe Tutor** app
2. Tap **Recents button** (or swipe up and hold)
3. Tap the **app icon** at the top of the card
4. Select **"Pin this app"**
5. Tap **"Pin"** to confirm

### Emergency Unlock (If Can't Remember Device PIN)

#### Option A: Boot into Safe Mode (Recommended)

1. Press and hold **Power button** → Tap and hold **"Power off"**
2. When prompted "Reboot to Safe Mode?", tap **"Safe mode"**
3. Device restarts without app pinning active
4. Go to **Settings** → **Security and Privacy** → **More Security Settings**
5. Disable **"Pin App"** feature
6. Restart device normally

#### Option B: Factory Reset (Last Resort - DELETES ALL DATA)

**WARNING: This will erase ALL data on the device. Only use if absolutely necessary.**

1. Power off the device completely
2. Press and hold **Volume Up + Power button** together
3. When Samsung logo appears, release all buttons
4. Use Volume buttons to navigate to **"Wipe data/factory reset"**
5. Press Power button to select
6. Select **"Factory data reset"** and confirm
7. After reset, set up the device as new

**Before Factory Reset:**

- Try Safe Mode method first
- Consider taking the device to a Samsung service center
- All Vibe-Tutor homework data will be lost unless previously exported

---

## Common Unlock Scenarios

### "I Need to Update Vibe-Tutor"

1. Unlock the device using your method's normal unlock procedure
2. Open **Google Play Store**
3. Search for **Vibe Tutor** (or check "My apps & games")
4. Tap **Update** if available
5. Wait for update to complete
6. Re-enable kiosk mode
7. Hand device back to your child

### "I Need to Update Android System"

1. Unlock the device
2. Go to **Settings** → **Software Update**
3. Tap **"Download and Install"**
4. Wait for update (device may restart multiple times)
5. After update completes:
   - **Fully Kiosk**: If "Start on Boot" is enabled, kiosk mode should auto-activate
   - **App Pinning**: You'll need to manually re-pin Vibe-Tutor
6. Test that kiosk mode is working properly

### "I Want to Check What My Child Has Been Doing"

**Option A: View Within Vibe-Tutor (Recommended - No Unlock Needed)**

1. In Vibe-Tutor, navigate to **Parent Dashboard**
2. Enter the **Parent PIN** (set within Vibe-Tutor app, different from kiosk PIN)
3. View homework completion, focus time stats, chat history, achievements

**Option B: Full Device Access**

1. Unlock the device using your method's unlock procedure
2. Access any app or settings as needed
3. Re-enable kiosk mode when done

### "My Child Found a Way to Bypass the Lock"

**Immediate Actions:**

1. Ask your child to show you how they bypassed it (to understand the vulnerability)
2. Common bypass methods and fixes:

   **For App Pinning:**
   - They learned Back + Recents combination → **Switch to Fully Kiosk** (Method 1)
   - They restarted the device → **Set up auto-relock** or switch to Fully Kiosk

   **For Fully Kiosk:**
   - They guessed your PIN → **Change the Admin PIN** immediately
   - They used Safe Mode → **Enable device encryption** and set a strong lock screen password
   - They found a crash exploit → **Update Fully Kiosk** to latest version

3. Have a conversation with your child about trust and screen time boundaries

**Long-term Solutions:**

- Consider upgrading to a professional MDM solution (Miradore, AppTec360)
- Set up device encryption: Settings → Security → Encrypt Device
- Enable Find My Device for remote lock/wipe capability
- Consider physical supervision during device use

### "The Device Restarted and Kiosk Mode Isn't Active"

**For Fully Kiosk:**

1. Check if "Start on Boot" setting is enabled:
   - Unlock kiosk mode
   - Open Fully Single App Kiosk settings
   - Enable "Start on Boot"
2. Grant "Autostart" permission (if available on Samsung):
   - Settings → Apps → Fully Single App Kiosk → Battery
   - Set to "Unrestricted"

**For App Pinning:**

- App pinning does NOT survive restarts - this is a limitation
- You must manually re-pin the app each time the device restarts
- Consider switching to Fully Kiosk for persistent lockdown

---

## Maintenance Schedule

To keep the kiosk device running smoothly, perform these tasks regularly:

### Weekly

- Unlock and check for app updates (Vibe-Tutor, Fully Kiosk if used)
- Review homework progress in Parent Dashboard
- Check battery health and charging

### Monthly

- Check for Android system updates
- Review and clear app caches if device is slow
- Backup Vibe-Tutor data using the export feature
- Verify kiosk mode is still functioning properly

### As Needed

- Update kiosk settings if child's schedule changes
- Adjust screen time limits if needed
- Update Admin PIN if compromised

---

## Security Best Practices

### PIN Management

1. **Use different PINs** for:
   - Device lock screen (prevents restart bypass)
   - Kiosk mode admin (prevents kiosk exit)
   - Vibe-Tutor Parent Dashboard (prevents settings changes)

2. **PIN Strength**:
   - Use at least 6 digits
   - Avoid obvious combinations (1234, birthdays, repeating digits)
   - Don't share PINs with your child
   - Write them down securely (not on the device)

### Device Security

1. Enable **Find My Device**: Settings → Biometrics and Security → Find My Mobile
2. Enable **Device Encryption**: Settings → Biometrics and Security → Encrypt Device
3. Disable **Unknown Sources**: Settings → Apps → Special Access → Install Unknown Apps
4. Set **Screen Timeout**: Settings → Display → Screen Timeout (to save battery)

### Account Security

1. Remove or secure Google account:
   - Your child shouldn't know the Google account password
   - This prevents app uninstalls and Play Store access
2. Enable 2-factor authentication on the Google account
3. Regularly review account activity

---

## Troubleshooting Unlock Issues

### "5-Tap Gesture Not Working in Fully Kiosk"

- Try tapping in different corners (top-left, top-right, bottom-right)
- Try power button method instead
- Restart device in Safe Mode if stuck

### "Back + Recents Buttons Don't Unpin App"

- Ensure you're holding BOTH buttons for 3+ seconds
- Try restarting the device
- Boot into Safe Mode to disable pinning

### "Device PIN Not Accepted After Unpinning"

- Ensure you're entering the correct lock screen PIN (not kiosk PIN)
- Try pattern or password if you set one
- Factory reset is last resort (loses all data)

### "Fully Kiosk Won't Exit Even with Correct PIN"

- Force restart: Hold Power + Volume Down for 10+ seconds
- Boot into Safe Mode
- Uninstall Fully Kiosk from Safe Mode

### "Device Stuck in Boot Loop After Kiosk Setup"

- Boot into Safe Mode
- Disable or uninstall kiosk app
- If issue persists, factory reset may be needed

---

## Emergency Contacts

### If You Need Help

- **Vibe-Tutor Support**: See main README.md for contact information
- **Fully Kiosk Support**: <https://www.fully-kiosk.com/help>
- **Samsung Support**: 1-800-SAMSUNG or samsung.com/support
- **Android Help**: <https://support.google.com/android>

### If Device is Lost/Stolen

1. Go to <https://findmymobile.samsung.com> on a computer
2. Sign in with the Samsung account on the device
3. Use **"Lock"** or **"Erase"** features remotely

---

## Appendix: Advanced Techniques

### Remote Management (Fully Kiosk Plus License)

If you purchase the Fully Kiosk Plus license, you can:

- Unlock/lock remotely via web interface
- Change settings without physical access
- Monitor device status remotely
- Send commands via REST API

### MDM Solutions for Multiple Devices

If you have multiple children/devices, consider MDM software:

- Centralized management dashboard
- Apply policies to multiple devices at once
- Remote troubleshooting
- Detailed usage reports

Recommended solutions:

- **Miradore** (free for up to 25 devices)
- **AppTec360 UEM** (free tier available)
- **Google Family Link** (free, but different approach - not true kiosk mode)

---

**Last Updated**: October 2025
**Compatible With**: Samsung Galaxy A54, Android 10+, One UI 5.0+

---

## Important Legal & Safety Notice

**Parental Responsibility**

- Kiosk mode is a tool to support parental supervision, not a replacement for it
- Regularly communicate with your child about device usage and online safety
- Monitor your child's emotional wellbeing and academic performance
- Be prepared to adjust restrictions based on your child's maturity and needs

**Privacy & Trust**

- Consider your child's age and need for privacy
- Explain why you're using kiosk mode (focus on education, not punishment)
- Build trust through open communication
- Respect your child's growing independence as they mature

**Technical Limitations**

- No kiosk solution is 100% foolproof
- Determined children may find workarounds
- Regular updates and monitoring are necessary
- Physical supervision is still the most effective control
