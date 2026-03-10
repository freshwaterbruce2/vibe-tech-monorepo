# DC8980 Shipping App - Deployment Guide

Complete guide for deploying the DC8980 Shipping application to Google Play Store and Apple App Store.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Android Deployment (Google Play Store)](#android-deployment-google-play-store)
4. [iOS Deployment (Apple App Store)](#ios-deployment-apple-app-store)
5. [Post-Deployment Tasks](#post-deployment-tasks)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance and Updates](#maintenance-and-updates)

## Prerequisites

### Development Environment

- **Node.js** 18+ with npm
- **Capacitor CLI** installed globally
- **Android Studio** with Android SDK
- **Xcode** (for iOS builds, macOS required)
- **Java JDK** 17+ for Android builds

### Accounts Required

- **Google Play Console** account ($25 one-time fee)
- **Apple Developer Program** account ($99/year)
- **VibeTech Developer Account** credentials

### Repository Access

- Clone the repository
- Install dependencies: `npm ci`
- Verify build: `npm run build`

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing: `npm run test`
- [ ] Linting clean: `npm run lint`
- [ ] TypeScript compilation: `npm run typecheck`
- [ ] Build successful: `npm run build`
- [ ] PWA audit passing: `npm run lighthouse`

### Configuration Verification

- [ ] App version updated in `package.json`
- [ ] Capacitor config updated: `capacitor.config.ts`
- [ ] Android version codes incremented
- [ ] iOS build numbers updated
- [ ] Privacy policy URL accessible
- [ ] Support URLs functional

### Assets Verification

- [ ] App icons generated for all sizes
- [ ] Splash screens created
- [ ] Screenshots captured and optimized
- [ ] Feature graphics designed
- [ ] Store descriptions written

### Security Review

- [ ] Network security config enabled
- [ ] Permissions minimized and justified
- [ ] ProGuard rules configured
- [ ] Debug code removed
- [ ] Sensitive data handling verified

## Android Deployment (Google Play Store)

### 1. Build Configuration

#### Generate Release Keystore

```powershell
# Run keystore generation script
.\android\generate-keystore.ps1

# Or manually with keytool
keytool -genkeypair -alias dc8980-shipping -keyalg RSA -keysize 2048 -validity 9125 -keystore release-key.keystore
```

#### Configure Signing

```powershell
# Copy example gradle properties
Copy-Item android\gradle.properties.example android\gradle.properties

# Edit gradle.properties with your keystore details:
# MYAPP_UPLOAD_STORE_FILE=release-key.keystore
# MYAPP_UPLOAD_KEY_ALIAS=dc8980-shipping
# MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
# MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

### 2. Build Android App Bundle

#### Using Build Script

```powershell
# Clean build with quality checks
.\scripts\build-android.ps1 -Clean -Bundle

# Quick release build
npm run deploy:android
```

#### Manual Build Process

```powershell
# Build web assets
npm run build

# Sync Capacitor
npx cap sync android

# Build AAB
cd android
.\gradlew bundleRelease
```

#### Verify Build Output

- **Location**: `android\app\build\outputs\bundle\release\app-release.aab`
- **Size**: Should be < 50MB
- **Testing**: Install on test devices via Android Studio

### 3. Google Play Console Setup

#### App Creation

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app: "DC8980 Shipping"
3. Select "App" type and "Business" category
4. Set default language to English (United States)

#### App Details

```json
{
  "appName": "DC8980 Shipping",
  "shortDescription": "Professional shipping management for Walmart DC8980 warehouse operations",
  "fullDescription": "See app-store-metadata/google-play-store.json",
  "category": "Business",
  "contentRating": "Everyone",
  "privacyPolicy": "https://vibetech.dev/privacy/dc8980-shipping"
}
```

#### Store Listing Assets

- **App Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG/JPG
- **Phone Screenshots**: 2-8 images, 16:9 or 9:16 aspect ratio
- **Tablet Screenshots**: 2-8 images (optional but recommended)

#### App Content

- **Privacy Policy**: Required, must be accessible
- **Content Rating**: Complete IARC questionnaire
- **Target Audience**: Adults (18+)
- **Data Safety**: Complete data collection form

### 4. Release Process

#### Internal Testing

1. Upload AAB to Internal Testing track
2. Add test users (email addresses)
3. Verify functionality on real devices
4. Test all core features thoroughly

#### Production Release

1. Upload AAB to Production track
2. Fill in release notes
3. Set rollout percentage (start with 20%)
4. Submit for review
5. Monitor for issues and gradually increase rollout

## iOS Deployment (Apple App Store)

### 1. Development Setup

#### Apple Developer Account

- Enroll in Apple Developer Program
- Create App ID: `com.vibetech.dc8980.shipping`
- Generate certificates and provisioning profiles
- Configure app capabilities

#### Xcode Configuration

```bash
# Add iOS platform
npx cap add ios

# Open in Xcode
npx cap open ios
```

### 2. App Store Connect Setup

#### App Creation

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app with bundle ID: `com.vibetech.dc8980.shipping`
3. Set app name: "DC8980 Shipping"
4. Select "Business" category

#### App Information

```json
{
  "name": "DC8980 Shipping",
  "subtitle": "Warehouse Management Tool",
  "description": "See app-store-metadata/app-store-config.json",
  "keywords": "shipping,warehouse,logistics,inventory,distribution,management",
  "supportURL": "https://vibetech.dev/support/dc8980-shipping",
  "privacyPolicy": "https://vibetech.dev/privacy/dc8980-shipping"
}
```

### 3. Build iOS App

#### Using Build Script

```powershell
# macOS required for iOS builds
.\scripts\build-ios.ps1 -Archive -Export

# Or prepare project for macOS build
.\scripts\build-ios.ps1
```

#### Manual Xcode Build

1. Open project: `npx cap open ios`
2. Select "Any iOS Device" target
3. Set scheme to "App"
4. Product → Archive
5. Distribute App → App Store Connect

### 4. App Store Submission

#### TestFlight Testing

1. Upload build via Xcode or Transporter
2. Add external testers
3. Verify all functionality
4. Test on multiple device types

#### App Store Review

1. Complete app metadata
2. Upload screenshots and assets
3. Set pricing (Free)
4. Submit for review
5. Respond to review feedback if needed

## Post-Deployment Tasks

### 1. Store Optimization

#### Monitor Performance

- Download and installation rates
- User ratings and reviews
- Crash reports and analytics
- Store search rankings

#### A/B Testing

- Test different screenshots
- Optimize app descriptions
- Experiment with keywords
- Analyze conversion rates

### 2. User Support

#### Support Channels

- **Email**: <support@vibetech.dev>
- **Website**: <https://vibetech.dev/support/dc8980-shipping>
- **App Store Reviews**: Respond professionally and promptly

#### Common Issues

- Permission denial problems
- Voice command not working
- Export functionality issues
- Offline sync problems

### 3. Monitoring and Analytics

#### Key Metrics

- Active users and retention
- Feature usage patterns
- Error rates and crashes
- Performance metrics

#### Tools Setup

- Google Play Console analytics
- App Store Connect analytics
- Crashlytics integration (if needed)
- User feedback collection

## Troubleshooting

### Build Issues

#### Android Build Failures

```bash
# Clean and rebuild
cd android
.\gradlew clean
.\gradlew bundleRelease

# Check Java version
java -version  # Should be 17+

# Verify Android SDK
echo $ANDROID_HOME
```

#### iOS Build Failures

```bash
# Clean Xcode build
rm -rf ios/App/build
xcodebuild clean -workspace ios/App/App.xcworkspace -scheme App

# Check certificates
security find-identity -p codesigning -v
```

### Signing Issues

#### Android Keystore Problems

- Verify keystore path in gradle.properties
- Check password accuracy
- Ensure keystore alias matches
- Validate keystore with: `keytool -list -keystore release-key.keystore`

#### iOS Certificate Issues

- Renew expired certificates
- Update provisioning profiles
- Check bundle ID matches
- Verify team membership

### Store Submission Issues

#### Google Play Rejections

- Policy violations: Review content guidelines
- Technical issues: Fix crashes and performance
- Metadata problems: Update descriptions and screenshots

#### App Store Rejections

- Guidelines violations: Review App Store guidelines
- Binary issues: Fix crashes and update build
- Metadata rejection: Update screenshots and descriptions

## Maintenance and Updates

### Version Management

#### Semantic Versioning

- **Major**: Breaking changes (2.0.0)
- **Minor**: New features (1.1.0)
- **Patch**: Bug fixes (1.0.1)

#### Release Planning

- Monthly minor updates
- Bi-weekly patches if needed
- Major updates quarterly
- Emergency fixes as required

### Update Process

#### Code Changes

1. Update version in `package.json`
2. Update `capacitor.config.ts`
3. Increment Android versionCode
4. Increment iOS build number
5. Update changelog

#### Build and Test

1. Run full test suite
2. Build and test on devices
3. Verify new features work
4. Check for regressions

#### Store Updates

1. Build new release bundles
2. Upload to store consoles
3. Update release notes
4. Submit for review
5. Monitor rollout

### Long-term Maintenance

#### Security Updates

- Regular dependency updates
- Security patch monitoring
- Vulnerability assessments
- Compliance reviews

#### Platform Updates

- Android SDK updates
- iOS version support
- Capacitor upgrades
- Framework updates

---

## Quick Reference Commands

### Development

```powershell
npm run dev                    # Start development server
npm run build                  # Build web assets
npm run quality                # Run all quality checks
```

### Mobile Development

```powershell
npm run cap:sync               # Sync web assets
npm run cap:open:android       # Open Android Studio
npm run cap:open:ios           # Open Xcode (macOS)
```

### Production Builds

```powershell
npm run deploy:android         # Build Android AAB
npm run deploy:ios             # Prepare iOS build
.\scripts\build-android.ps1    # Full Android build with checks
.\scripts\build-ios.ps1        # Full iOS build with checks
```

### Build Verification

```powershell
npm run lint                   # Check code quality
npm run typecheck              # Verify TypeScript
npm run test                   # Run test suite
npm run lighthouse             # PWA audit
```

---

**For Support**: Contact <support@vibetech.dev>
**Last Updated**: January 2025
**Version**: 1.0.0
