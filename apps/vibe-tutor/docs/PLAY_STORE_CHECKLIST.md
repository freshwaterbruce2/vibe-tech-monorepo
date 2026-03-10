# Play Store Submission Checklist

**App**: Vibe-Tutor v1.4.0 "ASD Companion"
**Submission Date**: TBD
**Developer**: VibeTech

## Pre-Submission Checklist

### 1. Code Quality & Testing

- [x] AndroidManifest.xml cleaned (no debug flags)
- [x] Cleartext traffic disabled (`usesCleartextTraffic="false"`)
- [x] PostCSS warnings resolved (CSS @import order fixed)
- [x] All permissions necessary and documented
- [ ] QA testing completed on real device
- [ ] No crashes in production build
- [ ] Offline functionality verified
- [ ] All new features tested (schedules, tokens, buddy, first-then gate)

### 2. App Signing & Build

- [ ] Release keystore created and backed up securely
- [ ] `keystore.properties` created (never commit to git!)
- [ ] Gradle signing config added to `build.gradle`
- [ ] AAB bundle built successfully (`bundleRelease`)
- [ ] Bundle tested via internal testing track
- [ ] ProGuard/R8 rules verified (if minifyEnabled=true)

#### Keystore Creation Steps

```powershell
# Navigate to android/app
cd Vibe-Tutor/android/app

# Generate keystore (run once)
keytool -genkeypair -v -storetype PKCS12 `
  -keystore vibetutor-release.keystore `
  -alias vibetutor `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass "YOUR_STRONG_PASSWORD" `
  -keypass "YOUR_STRONG_PASSWORD" `
  -dname "CN=VibeTech, OU=Development, O=VibeTech, L=City, ST=State, C=US"

# CRITICAL: Backup keystore to secure location (not in git!)
# Store password in password manager
```

#### keystore.properties Template

Create `Vibe-Tutor/android/keystore.properties` (add to `.gitignore`):

```properties
storeFile=vibetutor-release.keystore
storePassword=YOUR_STRONG_PASSWORD
keyAlias=vibetutor
keyPassword=YOUR_STRONG_PASSWORD
```

#### build.gradle Signing Config

Add to `android/app/build.gradle` before `android {` block:

```gradle
// Load keystore properties
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Build AAB Command

```bash
cd Vibe-Tutor/android
./gradlew.bat bundleRelease

# AAB output:
# android/app/build/outputs/bundle/release/app-release.aab
```

### 3. Store Listing Assets

- [ ] App icon 1024x1024 PNG (no alpha channel) - REQUIRED
- [ ] Feature graphic 1024x500 PNG - REQUIRED
- [ ] 3+ phone screenshots (1080x1920 or 1440x2560) - REQUIRED
- [ ] 7-inch tablet screenshots (optional, recommended)
- [ ] 10-inch tablet screenshots (optional)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] App category: Education or Productivity
- [ ] Tags: homework, AI tutor, ADHD, autism, student planner

#### Short Description Template

```
AI-powered homework manager for students with ADHD/autism support. Track tasks, earn rewards, focus timer, and personalized tutoring.
```

#### Full Description Template

See `PLAY_STORE_DESCRIPTION.md` for complete store listing copy.

### 4. Privacy & Compliance

- [x] Privacy Policy written (`docs/PRIVACY_POLICY.md`)
- [ ] Privacy Policy published to GitHub Pages
- [ ] Privacy Policy URL added to Play Console
- [x] Data Safety answers prepared (`docs/DATA_SAFETY.md`)
- [ ] Data Safety form completed in Play Console
- [ ] Age rating questionnaire completed (target: 13-17)
- [ ] Content rating completed (ESRB/PEGI)

#### Privacy Policy URL

After GitHub Pages setup:

```
https://freshwaterbruce2.github.io/vibetech/privacy-policy/
```

### 5. Content Rating

**Target Audience**: 13-17 (teens)
**Content Rating Questionnaire Answers**:

- Violence: None
- Sexual content: None
- Profanity: None
- Controlled substances: None
- Discrimination: None
- User-generated content: No (AI chat is processed, not shared publicly)
- Location sharing: No
- Personal info sharing: No
- In-app purchases: No
- Ads: No
- Gambling: No

**Expected Ratings**:

- ESRB: Everyone 10+ or Teen
- PEGI: 7 or 12
- IARC: General

### 6. Play Console Configuration

- [ ] App created in Play Console
- [ ] Developer account verified
- [ ] Privacy Policy URL added
- [ ] Data Safety completed
- [ ] Content rating completed
- [ ] Target audience set (13-17)
- [ ] Store listing completed (title, description, graphics)
- [ ] Pricing set (Free)
- [ ] Countries selected (recommend: Worldwide)
- [ ] Internal testing track configured
- [ ] AAB uploaded to internal testing
- [ ] Internal testers invited and tested
- [ ] Production release created (draft)

### 7. Quality Assurance

**Test on Real Device** (Not Emulator):

- [ ] **Cold Start**: App launches without crashes
- [ ] **Homework Dashboard**: Add, complete, delete tasks
- [ ] **AI Tutor**: Send message, receive response
- [ ] **AI Buddy**: Chat functionality works
- [ ] **Subject Cards**: Launch worksheet, complete questions
- [ ] **Brain Games**: Word search, difficulty, hints
- [ ] **First-Then Gate**: Blocks games until steps completed
- [ ] **Schedules**: View morning/evening routines
- [ ] **Token Wallet**: View tokens and transactions
- [ ] **Music Library**: Stream radio, download tracks
- [ ] **Sensory Settings**: Change animation, font, color mode
- [ ] **Focus Timer**: 25-min Pomodoro session
- [ ] **Parent Dashboard**: PIN lock, view data, export
- [ ] **Parent Rules**: Configure First-Then, time limits
- [ ] **Offline Mode**: App works without internet (except AI/music)
- [ ] **Background/Foreground**: Resume properly after minimizing
- [ ] **Battery Usage**: No excessive drain
- [ ] **Storage**: Reasonable space usage, tracks listed correctly
- [ ] **Permissions**: Only requested when needed, explained clearly

**Performance Targets**:

- Launch time: <3 seconds
- Navigation: <200ms transition
- AI response: <5 seconds (network dependent)
- No memory leaks during 30-min session
- Smooth 60fps animations

### 8. Release Notes

**Version 1.4.0 "ASD Companion"**

```
NEW FEATURES:
• Visual Schedules - Structured morning/evening routines
• First-Then Gate - Unlock games after completing routine steps
• Token Economy - Earn Roblox-style tokens for tasks & routines
• Conversation Buddy - AI chat with Roblox-friendly tone
• Parent Controls - Manage rules, time limits, and calm mode
• Enhanced Word Hunt - Difficulty levels, hints, celebrations

IMPROVEMENTS:
• Full integration of ASD-friendly features
• Improved navigation with 12 accessible views
• Enhanced token rewards system
• Better parent dashboard controls

For students with ADHD and autism support!
```

### 9. Post-Launch

- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews within 48 hours
- [ ] Track metrics: installs, uninstalls, ratings
- [ ] Plan for v1.5 updates based on feedback
- [ ] Consider Families-compliant U13 edition (separate app)

## Important Files Checklist

### Must Be Excluded from Git

Add to `.gitignore`:

```
# Keystore (NEVER commit!)
*.keystore
*.jks
keystore.properties

# Release builds
*.aab
*-release.apk
```

### Must Be Backed Up Securely

- `vibetutor-release.keystore` - Store in secure cloud storage + offline backup
- Keystore passwords - Store in password manager (LastPass, 1Password, Bitwarden)
- Google Play Console recovery codes

### Must Be Published

- Privacy Policy (GitHub Pages)
- Store listing screenshots
- Feature graphic
- App icon

## Common Issues & Solutions

### Issue: "App not signed correctly"

**Solution**: Verify keystore.properties path is correct and passwords match

### Issue: "Unable to find valid certification path"

**Solution**: Ensure `usesCleartextTraffic="false"` and backend uses HTTPS

### Issue: "Data Safety form incomplete"

**Solution**: Review `docs/DATA_SAFETY.md` and ensure all sections answered

### Issue: "Privacy Policy URL unreachable"

**Solution**: Test URL in incognito browser; ensure GitHub Pages deployed

### Issue: "Content rating rejected"

**Solution**: Verify no AI-generated content is UGC (it's processed, not shared)

## Final Pre-Submission Checklist

Before clicking "Send for Review":

1. [ ] AAB uploaded and tested via internal testing
2. [ ] All store listing fields complete
3. [ ] Screenshots accurately represent app
4. [ ] Privacy Policy accessible and correct
5. [ ] Data Safety accurately reflects data practices
6. [ ] Content rating appropriate (13-17)
7. [ ] Release notes written
8. [ ] Keystore backed up securely
9. [ ] No placeholders or "TODO" in listing
10. [ ] Verified on real Android device (not emulator)

---

**Estimated Review Time**: 3-7 days
**Contact**: (Add support email before submission)
**Documentation**: This file, PRIVACY_POLICY.md, DATA_SAFETY.md
**Version**: 1.4.0 (versionCode 25)
