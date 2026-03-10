# Vibe-Tutor Android App Installation Guide

## 🎉 Your Native Android App is Ready

The `vibe-tutor.apk` file is your complete native Android application that can be installed directly on any Android device.

## Installation Steps

### Option 1: Direct Installation (Recommended)

1. **Transfer the APK** to your son's Android phone:
   - Email the `vibe-tutor.apk` file to yourself
   - Download it on the Android device
   - Or use USB transfer/cloud storage

2. **Enable Unknown Sources** (one-time setup):
   - Go to **Settings** → **Security** → **Unknown Sources**
   - Or **Settings** → **Apps & notifications** → **Special app access** → **Install unknown apps**
   - Allow installation from your file manager or browser

3. **Install the App**:
   - Open the downloaded `vibe-tutor.apk` file
   - Tap **Install**
   - Wait for installation to complete
   - Tap **Open** to launch the app

### Option 2: ADB Installation (For developers)

If you have Android Debug Bridge (ADB) installed:

```bash
adb install vibe-tutor.apk
```

## App Features

- **AI-Powered Tutoring** - Gemini AI (with OpenRouter fallback) for homework help
- **Achievement System** - Gamified learning with rewards
- **Homework Manager** - Voice input and task breakdown
- **Parent Dashboard** - PIN-protected progress tracking
- **Offline Support** - Works without internet connection

## App Details

- **Package Name**: com.vibetech.tutor
- **App Name**: Vibe Tutor
- **File Size**: ~4MB
- **Permissions**: Internet, microphone (voice input), audio/media access, wake lock, and media playback foreground service
- **Android Version**: Compatible with Android 7.0+ (API 24+)

## Environment Variables

The app backend requires AI provider keys (`GEMINI_API_KEY`, optional `OPENROUTER_API_KEY`). Keys are server-side and not exposed to the client.

## Troubleshooting

### "App not installed" Error

- Ensure you have enough storage space (at least 20MB free)
- Make sure "Unknown Sources" is enabled
- Try restarting the device and installing again

### App Won't Open

- Check that your Android version is 7.0 or higher
- Clear cache: Settings → Apps → Vibe Tutor → Storage → Clear Cache

### AI Features Not Working

- Ensure the device has internet connectivity
- The app will show fallback messages if the AI service is unavailable

## Future Updates

To update the app:

1. Download the new APK file
2. Install over the existing app (data will be preserved)
3. Or uninstall the old version first for a clean install

## Support

If you encounter any issues, the app includes comprehensive error handling and will provide helpful error messages.

Enjoy using Vibe-Tutor! 🚀📚
