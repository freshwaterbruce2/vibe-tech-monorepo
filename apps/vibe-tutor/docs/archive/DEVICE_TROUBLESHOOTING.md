# Android Device Connection Troubleshooting

## Current Status: Device Not Detected

ADB server is running, but no devices are showing up. Work through these steps systematically:

---

## Step 1: Enable Developer Options on Phone

1. **Open Settings** on your Android phone
2. Scroll to **About Phone** (or About Device)
3. Find **Build Number** (usually at the bottom)
4. **Tap it 7 times** rapidly
5. You'll see a message: "You are now a developer!"

---

## Step 2: Enable USB Debugging

1. **Go back to Settings**
2. Look for **System** → **Developer Options** (or just search "developer")
3. **Enable Developer Options** (toggle at top)
4. Scroll down and **enable USB Debugging**
5. **Enable Install via USB** (if available)

**Important security settings to check:**

- "Verify apps over USB" - can be ENABLED or DISABLED (doesn't affect ADB)
- "USB debugging (Security settings)" - ENABLE this if available

---

## Step 3: Check USB Connection

### Cable Check

- **NOT a charge-only cable** - Must be a data cable
- Try a different USB cable if you have one
- USB-C cables are more reliable than micro-USB

### Computer Port Check

- Try a different USB port on your computer
- **Prefer USB 3.0 ports** (usually blue inside)
- **Avoid USB hubs** - connect directly to computer

### Connection Mode (on phone)

When you plug in the USB cable, you should see a notification on your phone:

1. Swipe down notification panel
2. Tap **"USB for file transfer"** or **"Charging this device via USB"**
3. Select **"File Transfer"** or **"MTP"** mode
   - **NOT** "Charging only"
   - **NOT** "USB tethering"

---

## Step 4: Authorize This Computer

**This is the most common issue!**

When you connect with USB Debugging enabled, you should see a popup on your phone:

```
Allow USB debugging?
The computer's RSA key fingerprint is:
XX:XX:XX:XX:XX:XX:XX:XX

[ ] Always allow from this computer

[Cancel] [OK]
```

**You MUST:**

1. Check the box "Always allow from this computer"
2. Tap **OK**

**If you don't see this popup:**

- Unplug USB cable
- On phone: Settings → Developer Options → Revoke USB debugging authorizations
- Plug cable back in
- Popup should appear now

---

## Step 5: Verify in PowerShell

Run this command after each change:

```powershell
adb devices
```

**Expected output when working:**

```
List of devices attached
ABC123456789    device
```

**If you see "unauthorized":**

```
List of devices attached
ABC123456789    unauthorized
```

→ Go back to Step 4 and authorize the computer

---

## Step 6: Windows-Specific Checks

### Check Device Manager

1. Press **Win + X** → Device Manager
2. Look under **"Portable Devices"** or **"Other Devices"**
3. Your phone should appear (e.g., "Galaxy S23" or "Pixel 7")
4. If you see a **yellow triangle** → driver issue

### Install Universal ADB Driver (if needed)

1. Download: <https://adb.clockworkmod.com/>
2. Run installer
3. Restart computer
4. Try `adb devices` again

### Alternative: Install via Manufacturer

- **Samsung:** Samsung USB Driver for Mobile Phones
- **Google Pixel:** Google USB Driver
- **OnePlus, Xiaomi, etc:** Usually included in Android Platform Tools

---

## Step 7: ADB Server Reset

If still not working, completely reset ADB:

```powershell
# Kill ADB server
adb kill-server

# Clear ADB keys (forces re-authorization)
Remove-Item -Force $env:USERPROFILE\.android\adbkey*

# Start fresh
adb start-server
adb devices
```

---

## Step 8: Test with Wireless ADB (Alternative)

If USB still not working, try wireless debugging (Android 11+):

1. **On phone:** Settings → Developer Options → Wireless debugging → ON
2. **Tap "Pair device with pairing code"**
3. You'll see:
   - IP address and port (e.g., 192.168.1.100:12345)
   - 6-digit pairing code

4. **On computer:**

```powershell
adb pair 192.168.1.100:12345
# Enter the 6-digit code when prompted

adb connect 192.168.1.100:5555
adb devices
```

---

## Common Issues & Solutions

### Issue: "adb: command not found"

**Solution:** Add Android Platform Tools to PATH:

```powershell
# Check if adb exists
where.exe adb

# If not found, download: https://developer.android.com/studio/releases/platform-tools
# Extract to C:\platform-tools
# Add C:\platform-tools to PATH environment variable
```

### Issue: "more than one device/emulator"

**Solution:** Specify device by ID:

```powershell
adb devices  # Copy device ID
adb -s ABC123456789 shell
```

### Issue: Phone charges but no debugging option

**Solution:**

- Cable is charge-only → use different cable
- Try another USB port
- Some cheap cables don't support data

### Issue: "unauthorized" won't go away

**Solution:**

```powershell
# On computer:
adb kill-server
Remove-Item -Force $env:USERPROFILE\.android\adbkey*

# On phone:
# Settings → Developer Options → Revoke USB debugging authorizations

# Reconnect and authorize again
adb start-server
```

---

## Verification Checklist

Before proceeding with app installation, verify:

- [ ] USB Debugging enabled on phone
- [ ] Developer Options enabled on phone
- [ ] USB cable supports data transfer (not charge-only)
- [ ] Phone shows "File Transfer" or "MTP" mode
- [ ] Authorization popup accepted on phone
- [ ] `adb devices` shows device (not "unauthorized")
- [ ] No yellow triangle in Windows Device Manager

---

## Ready to Install?

Once you see your device in `adb devices`, run:

```powershell
.\FRESH_INSTALL_PROCESS.ps1
```

This will automatically:

1. Uninstall old app
2. Increment versionCode to 29
3. Clean build artifacts
4. Build fresh web assets
5. Sync to Android
6. Build APK
7. Install on device

---

**Still stuck? Check:**

- Phone manufacturer's ADB driver website
- XDA Forums for your specific phone model
- Try a different computer to isolate the issue
